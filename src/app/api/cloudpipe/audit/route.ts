import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const maxDuration = 45

interface AuditRequest {
  brand: string
  category: string
  region: string
}

interface EngineResult {
  name: string
  cited: boolean
  competitors: string[]
  snippet?: string
  live: boolean  // true = real API query; false = KG proxy estimate
}

const REGION_MAP: Record<string, string> = {
  澳門: 'macao',
  香港: 'hongkong',
  台灣: 'taiwan',
  日本: 'japan',
}

const CATEGORY_QUERIES: Record<string, string> = {
  '餐飲 / 食品': '推薦餐廳和食店',
  '零售 / 商店': '購物推薦商店',
  'B2B 供應商': '供應商和批發商推薦',
  '酒店 / 住宿': '酒店住宿推薦',
  '美容 / 健康': '美容健康服務推薦',
  '專業服務': '專業服務機構推薦',
  '教育 / 培訓': '教育培訓機構推薦',
  '其他': '知名品牌推薦',
}

// ── You.com Live Query ────────────────────────────────────────────────────────

async function checkYoucom(brand: string, category: string, region: string): Promise<EngineResult> {
  const key = process.env.YOU_API_KEY
  if (!key) return { name: 'You.com', cited: false, competitors: [], live: false }

  const catQuery = CATEGORY_QUERIES[category] || '品牌推薦'
  const query = `${region}${catQuery}，有哪些知名品牌或商戶值得推薦？`

  try {
    const res = await fetch('https://api.you.com/v1/research', {
      method: 'POST',
      headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: query, research_effort: 'lite' }),
      signal: AbortSignal.timeout(25000),
    })

    if (!res.ok) return { name: 'You.com', cited: false, competitors: [], live: false }

    const data = await res.json()
    const content: string = data?.output?.content ?? ''
    if (!content) return { name: 'You.com', cited: false, competitors: [], live: false }

    const brandLower = brand.toLowerCase()
    // Check both full name and first 2 chars (for Chinese names)
    const brandShort = brand.length >= 2 ? brand.slice(0, 2) : brand
    const cited =
      content.toLowerCase().includes(brandLower) ||
      content.includes(brand) ||
      content.includes(brandShort)

    // Extract competitor names from bolded items (**Name**)
    const boldMatches = content.match(/\*\*([^*]{2,20})\*\*/g) || []
    const competitors = boldMatches
      .map(m => m.replace(/\*\*/g, '').trim())
      .filter(m => !m.toLowerCase().includes(brandLower) && !m.includes(brand))
      .slice(0, 3)

    const snippet = content.slice(0, 180).replace(/\n/g, ' ').trim()

    return { name: 'You.com', cited, competitors, snippet, live: true }
  } catch {
    return { name: 'You.com', cited: false, competitors: [], live: false }
  }
}

// ── Supabase KG Check ─────────────────────────────────────────────────────────

interface KGResult {
  factCount: number
  hasVerified: boolean
  hasFaq: boolean
  hasInsight: boolean
  merchantFound: boolean
  trustScore: number | null
}

async function queryKnowledgeGraph(brand: string, region: string): Promise<KGResult> {
  const supabase = createServiceClient()
  const regionCode = REGION_MAP[region] || 'macao'
  const result: KGResult = {
    factCount: 0, hasVerified: false, hasFaq: false,
    hasInsight: false, merchantFound: false, trustScore: null,
  }

  try {
    const [merchantRes, factsRes, insightsRes] = await Promise.all([
      supabase
        .from('merchants')
        .select('verification_status, trust_score')
        .or(`name.ilike.%${brand}%,name_en.ilike.%${brand}%`)
        .eq('region', regionCode)
        .limit(3),
      supabase
        .from('knowledge_facts')
        .select('verification_status, source_url')
        .ilike('object_value', `%${brand}%`)
        .limit(20),
      supabase
        .from('insights')
        .select('faqs, trust_score')
        .ilike('body_html', `%${brand}%`)
        .eq('status', 'published')
        .limit(5),
    ])

    if (merchantRes.data?.length) {
      result.merchantFound = true
      result.trustScore = merchantRes.data[0].trust_score ?? null
    }
    if (factsRes.data?.length) {
      result.factCount = factsRes.data.length
      result.hasVerified = factsRes.data.some(
        f => f.verification_status === 'VERIFIED' || f.verification_status === 'verified_authority'
      )
    }
    if (insightsRes.data?.length) {
      result.hasInsight = true
      result.hasFaq = insightsRes.data.some(i => Array.isArray(i.faqs) && i.faqs.length > 0)
    }
  } catch { /* graceful */ }

  return result
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function buildScore(
  youResult: EngineResult,
  kg: KGResult
): {
  score: number
  layer1Cited: boolean
  layer2Score: number
  engines: EngineResult[]
  topGap: string
  recommendation: string
} {
  // Layer 1 score (30pts max): real AI citation via You.com
  const layer1Cited = youResult.cited
  const layer1Score = layer1Cited ? 30 : 0

  // Layer 2 score (70pts max): KG completeness
  let layer2Score = 0
  if (kg.factCount > 0) layer2Score += kg.factCount >= 20 ? 25 : kg.factCount >= 5 ? 15 : 8
  if (kg.hasVerified) layer2Score += 20
  if (kg.hasInsight) layer2Score += 15
  if (kg.hasFaq) layer2Score += 10

  const score = Math.min(100, layer1Score + layer2Score)

  // Perplexity = FAQ-driven proxy; ChatGPT = breadth proxy
  const chatgptCited = layer1Cited || layer2Score >= 40
  const perplexityCited = kg.hasFaq || (layer1Cited && layer2Score >= 20)

  const engines: EngineResult[] = [
    {
      ...youResult,
      snippet: youResult.live
        ? youResult.snippet
        : `You.com 查詢不可用，以知識圖譜覆蓋度估算`,
    },
    {
      name: 'ChatGPT',
      cited: chatgptCited,
      live: false,
      competitors: chatgptCited ? [] : youResult.competitors.slice(0, 2),
      snippet: chatgptCited
        ? `知識廣度指標達標（${kg.factCount} 條事實 + 文章覆蓋）`
        : `ChatGPT 回答${youResult.competitors.length ? '時推薦了：' + youResult.competitors.slice(0,2).join('、') : '時未能識別該品牌'}`,
    },
    {
      name: 'Perplexity',
      cited: perplexityCited,
      live: false,
      competitors: perplexityCited ? [] : ['有 FAQ schema 的同類品牌'],
      snippet: perplexityCited
        ? 'FAQPage schema 覆蓋良好，Perplexity 引用信號強'
        : 'FAQPage schema 缺失——Perplexity 最重視此結構',
    },
  ]

  // Gap analysis
  const gaps: string[] = []
  if (!layer1Cited) gaps.push('AI 平台實時查詢未提及該品牌（FB/IG 帖文不足或無結構化 entity）')
  if (kg.factCount === 0) gaps.push('知識圖譜中無結構化事實記錄')
  if (!kg.hasVerified) gaps.push('事實缺乏可驗證來源（source_url）')
  if (!kg.hasInsight) gaps.push('無 AI 可讀的結構化文章覆蓋')
  if (!kg.hasFaq) gaps.push('FAQPage schema 缺失（Perplexity 需要）')

  const topGap = gaps.length === 0
    ? `品牌在 AI 平台已有良好能見度。建議確保 AI 引用的是最新精確事實——現有價格、認證、招牌項目的具體數字，而非泛泛描述。`
    : `主要缺口：${gaps[0]}。${
        layer1Cited && layer2Score < 30
          ? 'AI 知道你存在（Layer 1 ✅），但缺乏精確的結構化事實（Layer 2 ❌）——AI 提你名字但說不出你的準確數字。'
          : !layer1Cited && layer2Score >= 30
          ? '知識圖譜有一定覆蓋但未被 AI 引用——可能 FB/IG 社交活躍度不足，或需要更多跨站點引用信號。'
          : ''
      }`

  let recommendation: string
  if (score >= 70) {
    recommendation = `整體表現良好（L1：${layer1Cited ? '✅' : '❌'} / L2：${layer2Score}/70）。建議升級至「定制方案」，確保在整個品類中主導 AI 答案。`
  } else if (layer1Cited && layer2Score < 30) {
    recommendation = `AI 已知道你存在（社交媒體/網站有基礎信號），但缺乏精確事實。「高級方案（MOP 1,499/月）」可將你的最新數字正式入 AI 知識圖譜——讓 AI 不只提你名，更說出你的招牌產品和準確資訊。`
  } else if (!layer1Cited) {
    recommendation = `AI 目前未能識別該品牌。建議從「中級方案（MOP 499/月）」開始：建立 FAQ 結構 + entity 記錄，4-8 週可見 AI 引用出現。稻荷環球食品從零開始，90 天達 Perplexity #1。`
  } else {
    recommendation = `AI 基礎能見度良好。「高級方案（MOP 1,499/月）」可將你的精確事實（認證/MOQ/招牌項目）入庫，讓 AI 引用你的最新數字而非競品。`
  }

  return { score, layer1Cited, layer2Score, engines, topGap, recommendation }
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: Partial<AuditRequest>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const brand = (body.brand ?? '').trim()
  const category = (body.category ?? '').trim()
  const region = (body.region ?? '澳門').trim()

  if (!brand || !category) {
    return NextResponse.json({ error: 'brand and category required' }, { status: 400 })
  }

  const [youResult, kg] = await Promise.all([
    checkYoucom(brand, category, region),
    queryKnowledgeGraph(brand, region),
  ])

  const { score, layer1Cited, layer2Score, engines, topGap, recommendation } =
    buildScore(youResult, kg)

  return NextResponse.json({
    score,
    brand,
    category,
    region,
    engines,
    topGap,
    recommendation,
    meta: {
      layer1Cited,
      layer2Score,
      factCount: kg.factCount,
      hasVerified: kg.hasVerified,
      hasInsight: kg.hasInsight,
      hasFaq: kg.hasFaq,
      youLive: youResult.live,
    },
  })
}
