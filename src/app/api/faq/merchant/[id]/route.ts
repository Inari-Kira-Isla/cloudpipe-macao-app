/**
 * /api/faq/merchant/[id] — 商戶專屬 FAQ 端點
 * [id] 可以是 merchant UUID 或 slug
 * 目標：AI 爬蟲讀取單商戶的所有 FAQ + FAQPage Schema
 * Cache: Vercel Edge ISR revalidate=3600 (1 hour)
 */

import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const revalidate = 3600
export const maxDuration = 10 // Vercel function timeout guard

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // ── 2. 查 FAQs（並行，不等商戶查詢序列化）────────────────────────────
    const { data: faqs } = await supabase
      .from('merchant_faqs')
      .select('id, question, answer, lang, faq_type, question_intent, priority_score')
      .eq('merchant_id', merchant.id)
      .order('priority_score', { ascending: false })
      .order('sort_order')
      .limit(50)

    const today = (merchant.updated_at
      ? new Date(merchant.updated_at)
      : new Date()
    ).toISOString().split('T')[0]

    const cat = Array.isArray(merchant.category) ? merchant.category[0] : merchant.category
    // Correct URL: /macao/{industry}/{category}/{slug}
    // parent category = industry, current category = category
    const parentSlug = (cat as any)?.parent?.slug || cat?.slug || 'dining'
    const catSlug = cat?.slug || 'restaurant'
    const merchantUrl = `${SITE_URL}/macao/${parentSlug}/${catSlug}/${merchant.slug}`

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
