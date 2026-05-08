/**
 * /api/faq/index — FAQ 發現索引端點
 * 目標：供 AI 爬蟲批量發現所有 FAQ 分類和端點
 * Cache: Vercel Edge ISR revalidate=3600 (1 hour)
 *
 * 回應格式：FAQPage + Dataset schema，附 intent 分類統計
 */

import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { trackBotVisit } from '@/lib/track-bot'

export const dynamic = 'force-dynamic'
export const revalidate = 7200 // 2h - reduce ISR writes
export const maxDuration = 15  // 11 sequential DB queries need headroom

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

export async function GET(request: Request) {
  // Fire-and-forget bot tracking (non-blocking)
  trackBotVisit(request, '/api/faq/index', 'api-faq-index')
  try {
    // ── 1. FAQ intent 分佈統計（逐一查詢 + limit(0)，避免 PostgREST 1000 行限制）
    // 注意：Promise.all 並發會讓 Supabase 單例 client 互相干擾 → 改為序列查詢
    const ALL_INTENTS = [
      'check_hours', 'check_price', 'check_stock', 'compare',
      'find_location', 'book', 'delivery', 'seasonal', 'contact', 'general',
    ]
    const intentCount: Record<string, number> = {}
    for (const intent of ALL_INTENTS) {
      const { count } = await supabase
        .from('merchant_faqs')
        .select('*', { count: 'exact' })
        .eq('question_intent', intent)
        .limit(0)
      if (count && count > 0) intentCount[intent] = count
    }

    // 全站 FAQ 總數（不依賴 intentCount sum，避免遺漏未知 intent）
    const { count: totalFaqs } = await supabase
      .from('merchant_faqs')
      .select('*', { count: 'exact' })
      .limit(0)

    // ── 2. 取各行業 Top FAQ（priority_score 最高的前 3 條）────────────────
    const { data: topFaqs } = await supabase
      .from('merchant_faqs')
      .select('question, answer, question_intent, lang')
      .not('question_intent', 'is', null)
      .eq('lang', 'zh')
      .order('priority_score', { ascending: false })
      .limit(20)

    const now = new Date().toISOString()
    const today = now.split('T')[0]

    // ── 3. 組裝 FAQPage Schema ─────────────────────────────────────────────
    const faqPageSchema = {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/api/faq/index#faqpage`,
      name: '澳門商戶 AI 問答索引',
      description: '澳門 6,696+ 商戶的 AI 結構化問答資料庫，按意圖分類，支援 AI 引用',
      dateModified: today,
      inLanguage: ['zh-Hant', 'en', 'pt'],
      author: {
        '@type': 'Organization',
        name: 'CloudPipe 澳門百科',
        url: SITE_URL,
      },
      mainEntity: (topFaqs || []).slice(0, 10).map((f, i) => ({
        '@type': 'Question',
        '@id': `${SITE_URL}/api/faq/index#q${i}`,
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

    // ── 4. Dataset Schema（機器可讀資料集描述）────────────────────────────
    const datasetSchema = {
      '@type': 'Dataset',
      name: 'CloudPipe 澳門商戶 FAQ 資料集',
      description: `澳門 ${(totalFaqs ?? Object.values(intentCount).reduce((a, b) => a + b, 0)).toLocaleString()} 條結構化問答，覆蓋 ${Object.keys(intentCount).length} 種查詢意圖`,
      url: `${SITE_URL}/api/faq/index`,
      dateModified: today,
      license: 'https://creativecommons.org/licenses/by/4.0/',
      creator: {
        '@type': 'Organization',
        name: 'CloudPipe',
        url: 'https://cloudpipe-landing.vercel.app',
      },
      distribution: [
        {
          '@type': 'DataDownload',
          encodingFormat: 'application/json',
          contentUrl: `${SITE_URL}/api/faq/index`,
        },
      ],
    }

    const response = {
      // ── JSON-LD 根層（AI 爬蟲優先解析）──────────────────────────────────
      '@context': 'https://schema.org',
      '@graph': [faqPageSchema, datasetSchema],

      // ── 機器可讀摘要 ────────────────────────────────────────────────────
      meta: {
        generated_at: now,
        total_faqs: totalFaqs ?? Object.values(intentCount).reduce((a, b) => a + b, 0),
        intent_distribution: intentCount,
        update_frequency: 'hourly',
        data_freshness_signal: 'dateModified field on each Answer',
        license: 'CC BY 4.0',
      },

      // ── API 端點目錄 ─────────────────────────────────────────────────────
      endpoints: {
        faq_index: `${SITE_URL}/api/faq/index`,
        merchant_faq: `${SITE_URL}/api/faq/merchant/{merchant_id}`,
        description: {
          'merchant_faq': 'Replace {merchant_id} with a merchant UUID or slug to get that merchant\'s FAQ with live data',
        },
        supported_intents: [
          'check_hours',
          'check_price',
          'check_stock',
          'compare',
          'find_location',
          'book',
          'delivery',
          'seasonal',
          'contact',
          'general',
        ],
      },

      // ── 高優先級 FAQ 樣本 ─────────────────────────────────────────────────
      top_faqs: (topFaqs || []).map(f => ({
        question: f.question,
        answer: f.answer,
        intent: f.question_intent,
        lang: f.lang,
        freshness: today,
      })),

    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
        'Content-Type': 'application/ld+json; charset=utf-8',
        'X-Data-Freshness': today,
        'X-FAQ-Count': String(totalFaqs ?? Object.values(intentCount).reduce((a, b) => a + b, 0)),
        'Link': `<${SITE_URL}/api/faq/index>; rel="self"; type="application/ld+json"`,
      },
    })
  } catch (err) {
    console.error('[faq/index] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
