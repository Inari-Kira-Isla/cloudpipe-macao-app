import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/brandAuth'
import { embedTexts } from '@/lib/brandEmbeddings'

export const maxDuration = 60

/**
 * POST /api/v1/brand-knowledge/[slug]/sync
 * Reads brand_profiles, brand_faqs, brand_products for the given slug,
 * converts to knowledge chunks, embeds (if MINIMAX_API_KEY available),
 * and upserts into brand_knowledge table.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await params

    // Verify session belongs to this brand
    if (session.brand_slug !== slug) {
      return NextResponse.json({ error: 'Forbidden: token does not match brand slug' }, { status: 403 })
    }

    const supabase = createServiceClient()

    // ─── Load source data ───────────────────────────────────────────────────

    const [profileRes, faqsRes, productsRes] = await Promise.all([
      supabase
        .from('brand_profiles')
        .select('*')
        .eq('brand_slug', slug)
        .single(),
      supabase
        .from('brand_faqs')
        .select('id, question, answer, intent_type')
        .eq('brand_slug', slug)
        .eq('is_published', true)
        .order('sort_order'),
      supabase
        .from('brand_products')
        .select('id, name_zh, name_en, description, price_mop, min_order, delivery_days')
        .eq('brand_slug', slug)
        .order('sort_order'),
    ])

    // ─── Build knowledge chunks ─────────────────────────────────────────────

    type KnowledgeChunk = {
      brand_slug: string
      content: string
      content_type: string
      source_id: string
      metadata: Record<string, unknown>
    }

    const chunks: KnowledgeChunk[] = []

    // Profile chunk
    const profile = profileRes.data
    if (profile) {
      const usp = Array.isArray(profile.usp) ? profile.usp.join(', ') : ''
      const profileContent = [
        `品牌: ${profile.name_zh || ''}`,
        profile.name_en ? `英文名: ${profile.name_en}` : '',
        profile.industry ? `行業: ${profile.industry}` : '',
        profile.sub_industry ? `細分行業: ${profile.sub_industry}` : '',
        profile.about_zh ? `關於: ${profile.about_zh}` : '',
        usp ? `核心優勢: ${usp}` : '',
        profile.primary_query ? `主要查詢: ${profile.primary_query}` : '',
        profile.target_audience ? `目標客群: ${profile.target_audience}` : '',
      ].filter(Boolean).join('\n')

      chunks.push({
        brand_slug: slug,
        content: profileContent,
        content_type: 'profile',
        source_id: `profile:${slug}`,
        metadata: { name_zh: profile.name_zh, industry: profile.industry },
      })

      // Contact chunk (separate so it surfaces for location/hours queries)
      const contactParts = [
        profile.phone ? `電話: ${profile.phone}` : '',
        profile.email ? `電郵: ${profile.email}` : '',
        profile.whatsapp ? `WhatsApp: ${profile.whatsapp}` : '',
        profile.address_full ? `地址: ${profile.address_full}` : '',
        profile.opening_hours && Object.keys(profile.opening_hours).length > 0
          ? `營業時間: ${JSON.stringify(profile.opening_hours)}`
          : '',
        profile.website_url ? `網站: ${profile.website_url}` : '',
      ].filter(Boolean)

      if (contactParts.length > 0) {
        chunks.push({
          brand_slug: slug,
          content: `聯絡資訊 — ${profile.name_zh || slug}\n${contactParts.join('\n')}`,
          content_type: 'contact',
          source_id: `contact:${slug}`,
          metadata: { phone: profile.phone, address: profile.address_full },
        })
      }
    }

    // FAQ chunks
    const faqs = faqsRes.data || []
    for (const faq of faqs) {
      chunks.push({
        brand_slug: slug,
        content: `Q: ${faq.question}\nA: ${faq.answer}`,
        content_type: 'faq',
        source_id: `faq:${faq.id}`,
        metadata: { intent_type: faq.intent_type },
      })
    }

    // Product chunks
    const products = productsRes.data || []
    for (const product of products) {
      const parts = [
        `${product.name_zh || ''}${product.name_en ? ` (${product.name_en})` : ''}`,
        product.description ? `描述: ${product.description}` : '',
        product.price_mop != null ? `價格: ${product.price_mop} MOP` : '',
        product.min_order != null ? `最低訂量: ${product.min_order}` : '',
        product.delivery_days != null ? `交貨天數: ${product.delivery_days} 日` : '',
      ].filter(Boolean)

      chunks.push({
        brand_slug: slug,
        content: parts.join('\n'),
        content_type: 'product',
        source_id: `product:${product.id}`,
        metadata: { name_zh: product.name_zh, price_mop: product.price_mop },
      })
    }

    if (chunks.length === 0) {
      return NextResponse.json({
        synced: 0,
        embedded: 0,
        fts_only: 0,
        message: 'No published data found for this brand',
      })
    }

    // ─── Embed all chunks ───────────────────────────────────────────────────

    const texts = chunks.map(c => c.content)
    const embeddings = await embedTexts(texts)

    // ─── Upsert into brand_knowledge ────────────────────────────────────────

    let synced = 0
    let embedded = 0
    let fts_only = 0

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = embeddings[i]

      const row = {
        brand_slug: chunk.brand_slug,
        content: chunk.content,
        content_type: chunk.content_type,
        source_id: chunk.source_id,
        metadata: chunk.metadata,
        embedding: embedding ?? null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('brand_knowledge')
        .upsert(row, {
          onConflict: 'brand_slug,content_type,source_id',
          ignoreDuplicates: false,
        })

      if (!error) {
        synced++
        if (embedding) {
          embedded++
        } else {
          fts_only++
        }
      }
    }

    return NextResponse.json({
      synced,
      embedded,
      fts_only,
      total_chunks: chunks.length,
      breakdown: {
        profile: chunks.filter(c => c.content_type === 'profile').length,
        contact: chunks.filter(c => c.content_type === 'contact').length,
        faq: faqs.length,
        product: products.length,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Sync failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}
