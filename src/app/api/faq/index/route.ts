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

// force-dynamic: API routes must never be SSG pre-rendered at build time.
// Cache-Control header in response handles CDN caching.
export const dynamic = 'force-dynamic'
export const maxDuration = 15  // headroom for the fallback path (see loadIntentCounts)

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipemo.com').trim()

const ALL_INTENTS = [
  'check_hours', 'check_price', 'check_stock', 'compare',
  'find_location', 'book', 'delivery', 'seasonal', 'contact', 'general',
] as const

type IntentCountRow = { intent: string | null; faq_count: number | string | null }

/**
 * FAQ intent 分佈 + 全站總數。
 *
 * 2026-08-09: 原本係 10 條 `.eq('question_intent', …).limit(0)` exact count
 * 加 1 條全站 count，全部**序列**打喺 252 萬行 merchant_faqs（Promise.all 並發
 * 會令 Supabase 單例 client 互相干擾，所以當初改咗做序列）。而家改用一條
 * `GROUP BY question_intent` RPC 一次過攞晒。
 *
 * 語義完全保持：
 *   - 過濾條件仍然係 faq_type <> 'insight_derived'（96.7% 廣播式污染）
 *   - intent_distribution 只保留 ALL_INTENTS 白名單且 count > 0 的項
 *   - total_faqs 係「所有非 insight_derived 行」，包括 intent 為 NULL / 白名單外
 *
 * Fallback：RPC 未 apply（migration 20260809001000 未跑）時，自動退回舊嘅序列
 * 查詢，令呢個 deploy 唔會依賴 migration 先能上線。
 */
async function loadIntentCounts(): Promise<{
  intentCount: Record<string, number>
  totalFaqs: number
  source: 'rpc' | 'fallback'
}> {
  const { data, error } = await supabase.rpc('faq_index_intent_counts')

  if (!error && Array.isArray(data)) {
    const intentCount: Record<string, number> = {}
    let totalFaqs = 0
    for (const row of data as IntentCountRow[]) {
      const n = Number(row.faq_count) || 0
      totalFaqs += n
      if (row.intent && n > 0 && (ALL_INTENTS as readonly string[]).includes(row.intent)) {
        intentCount[row.intent] = n
      }
    }
    return { intentCount, totalFaqs, source: 'rpc' }
  }

  console.warn(
    '[faq/index] faq_index_intent_counts RPC unavailable, falling back to sequential counts:',
    error?.message
  )

  // ── Fallback：舊有序列查詢（慢，只喺 RPC 未 apply 時行）────────────────
  const intentCount: Record<string, number> = {}
  for (const intent of ALL_INTENTS) {
    const { count } = await supabase
      .from('merchant_faqs')
      .select('*', { count: 'exact' })
      .eq('question_intent', intent)
      .neq('faq_type', 'insight_derived')
      .limit(0)
    if (count && count > 0) intentCount[intent] = count
  }

  // 全站 FAQ 總數（不依賴 intentCount sum，避免遺漏未知 intent）
  const { count: totalFaqs } = await supabase
    .from('merchant_faqs')
    .select('*', { count: 'exact' })
    .neq('faq_type', 'insight_derived')
    .limit(0)

  return {
    intentCount,
    totalFaqs: totalFaqs ?? Object.values(intentCount).reduce((a, b) => a + b, 0),
    source: 'fallback',
  }
}

export async function GET(request: Request) {
  // Fire-and-forget bot tracking (non-blocking)
  trackBotVisit(request, '/api/faq/index', 'api-faq-index')
  try {
    // ── 1. FAQ intent 分佈統計 + 全站總數（單條 GROUP BY RPC）─────────────
    // 2026-07-27: 全部排除 faq_type='insight_derived'（96.7% 為廣播式污染，
    // 同一答案平均掛 96.6 間商戶，自我提及率淨 0.29%）。呢個 endpoint 係
    // AI 爬蟲發現索引，total_faqs / intent_distribution 呢啲數字之前包含
    // 污染會嚴重灌水。
    const { intentCount, totalFaqs, source: countSource } = await loadIntentCounts()

    // ── 2. 取各行業 Top FAQ（priority_score 最高的前 3 條）────────────────
    const { data: topFaqs } = await supabase
      .from('merchant_faqs')
      .select('question, answer, question_intent, lang')
      .not('question_intent', 'is', null)
      .eq('lang', 'zh')
      .neq('faq_type', 'insight_derived')
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
      description: `澳門 ${totalFaqs.toLocaleString()} 條結構化問答，覆蓋 ${Object.keys(intentCount).length} 種查詢意圖`,
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
        total_faqs: totalFaqs,
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
        'X-FAQ-Count': String(totalFaqs),
        // 健康信號：'rpc' = migration 20260809001000 已 apply（1 條 query）；
        // 'fallback' = RPC 唔存在，仲行緊舊嘅 11 條序列 query。
        // 驗證：curl -sI https://cloudpipemo.com/api/faq/index | grep -i x-intent-count-source
        'X-Intent-Count-Source': countSource,
        'Link': `<${SITE_URL}/api/faq/index>; rel="self"; type="application/ld+json"`,
      },
    })
  } catch (err) {
    console.error('[faq/index] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
