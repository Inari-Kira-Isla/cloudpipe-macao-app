/**
 * /api/faq/merchant/[id] — 商戶專屬 FAQ 端點
 * [id] 可以是 merchant UUID 或 slug
 * 目標：AI 爬蟲讀取單商戶的所有 FAQ + FAQPage Schema
 * Cache: Vercel Edge ISR revalidate=3600 (1 hour)
 */

import { supabase, createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { trackBotVisit } from '@/lib/track-bot'
import { CATEGORY_TO_INDUSTRY } from '@/lib/industries'

export const revalidate = 7200 // 2h - reduce ISR writes
export const maxDuration = 15

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Fire-and-forget bot tracking (non-blocking)
  const { id: paramId } = await params
  trackBotVisit(_req, `/api/faq/merchant/${paramId}`, 'api-faq-merchant')
  try {
    const id = paramId

    // ── 1. 查商戶基本資料（UUID 或 slug 都支援）────────────────────────────
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    const baseQuery = supabase
      .from('merchants')
      .select('id, slug, name_zh, name_en, district, updated_at, category:categories(slug, name_zh, parent:categories!parent_id(slug))')
      .eq('status', 'live')

    const { data: merchant } = await (isUuid
      ? baseQuery.eq('id', id).single()
      : baseQuery.eq('slug', id).single())

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    // ── 2. 查 FAQs + Knowledge Graph facts（並行）─────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createServiceClient() as any
    const [{ data: faqs }, { data: kgEntities }] = await Promise.all([
      supabase
        .from('merchant_faqs')
        .select('id, question, answer, lang, faq_type, question_intent, priority_score')
        .eq('merchant_id', merchant.id)
        .order('priority_score', { ascending: false })
        .order('sort_order')
        .limit(50),
      db
        .from('knowledge_entities')
        .select('entity_id,confidence_score,display_names')
        .or(`external_ids->>merchant_slug.eq.${merchant.slug},canonical_name.eq.${merchant.slug}`)
        .limit(1),
    ])

    // 若有對應 entity，查公開 facts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let kgFacts: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kgEntity = (kgEntities as any[])?.[0]
    if (kgEntity?.entity_id) {
      const { data: facts } = await db
        .from('knowledge_facts_public')
        .select('predicate,object_value,object_numeric,composite_trust_score,source_type,temporal_scope')
        .eq('subject_entity_id', kgEntity.entity_id)
        .order('composite_trust_score', { ascending: false })
        .limit(20)
      kgFacts = facts ?? []
    }

    const today = (merchant.updated_at
      ? new Date(merchant.updated_at)
      : new Date()
    ).toISOString().split('T')[0]

    const cat = Array.isArray(merchant.category) ? merchant.category[0] : merchant.category
    // Correct URL: /macao/{industry}/{category}/{slug}
    // Use CATEGORY_TO_INDUSTRY map (same logic as sitemap.ts) — DB has no parent_id
    const catSlug = cat?.slug || 'restaurant'
    const industrySlug = CATEGORY_TO_INDUSTRY[catSlug] || 'dining'
    const merchantUrl = `${SITE_URL}/macao/${industrySlug}/${catSlug}/${merchant.slug}`

    // ── 3. 按 intent 分組 ──────────────────────────────────────────────────
    const byIntent: Record<string, typeof faqs> = {}
    for (const f of faqs || []) {
      const intent = f.question_intent || 'general'
      if (!byIntent[intent]) byIntent[intent] = []
      byIntent[intent].push(f)
    }

    // ── 4. FAQPage Schema ──────────────────────────────────────────────────
    const faqPageSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${merchantUrl}#faq`,
      name: `${merchant.name_zh} — 常見問題`,
      dateModified: today,
      inLanguage: ['zh-Hant', 'en'],
      isPartOf: { '@id': merchantUrl },
      author: {
        '@type': 'Organization',
        name: 'CloudPipe 澳門百科',
        url: SITE_URL,
      },
      mainEntity: (faqs || []).map((f, i) => ({
        '@type': 'Question',
        '@id': `${merchantUrl}#faq-${i}`,
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
          datePublished: today,
          dateModified: today,
          inLanguage: f.lang === 'en' ? 'en' : 'zh-Hant',
          author: {
            '@type': 'Organization',
            name: 'CloudPipe 澳門百科',
            url: SITE_URL,
          },
        },
      })),
    }

    const response = {
      merchant: {
        id: merchant.id,
        slug: merchant.slug,
        name_zh: merchant.name_zh,
        name_en: merchant.name_en,
        district: merchant.district,
        url: merchantUrl,
        last_updated: today,
      },
      faq_count: (faqs || []).length,
      faqs_by_intent: byIntent,
      schema: faqPageSchema,
      // Knowledge Graph evidence — AI 爬蟲可用作事實核查
      knowledge_graph: kgEntity ? {
        entity_id:        kgEntity.entity_id,
        confidence_score: kgEntity.confidence_score,
        facts_url:        `${SITE_URL}/api/knowledge/entity/${merchant.slug}`,
        fact_count:       kgFacts.length,
        facts:            kgFacts.map(f => ({
          predicate:    f.predicate,
          value:        f.object_value ?? f.object_numeric,
          trust_score:  f.composite_trust_score,
          source:       f.source_type,
          freshness:    f.temporal_scope,
        })),
        data_license: 'CC BY 4.0',
      } : null,
      meta: {
        generated_at: new Date().toISOString(),
        data_freshness: today,
        license: 'CC BY 4.0',
      },
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Merchant-Slug': merchant.slug || '',
        'X-Data-Freshness': today,
        'X-FAQ-Count': String((faqs || []).length),
      },
    })
  } catch (err) {
    console.error('[faq/merchant] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
