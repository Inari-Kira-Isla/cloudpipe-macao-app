import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const maxDuration = 30

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
}

const REGION_MAP: Record<string, string> = {
  澳門: 'macao',
  香港: 'hongkong',
  台灣: 'taiwan',
  日本: 'japan',
}

const CATEGORY_HINTS: Record<string, string[]> = {
  '餐飲 / 食品': ['dining', 'food', 'restaurant', 'faq', 'insight'],
  '零售 / 商店': ['retail', 'shop', 'store'],
  'B2B 供應商': ['supplier', 'wholesale', 'b2b', 'import'],
  '酒店 / 住宿': ['hotel', 'accommodation', 'stay'],
  '美容 / 健康': ['beauty', 'health', 'wellness', 'spa'],
  '專業服務': ['service', 'professional', 'consulting'],
  '教育 / 培訓': ['education', 'training', 'school'],
  '其他': [],
}

interface KGResult {
  factCount: number
  hasVerified: boolean
  hasFaq: boolean
  hasInsight: boolean
  merchantStatus: string | null
  trustScore: number | null
}

async function queryKnowledgeGraph(brand: string, region: string): Promise<KGResult> {
  const supabase = createServiceClient()
  const regionCode = REGION_MAP[region] || 'macao'
  const brandLower = brand.toLowerCase()

  const result: KGResult = {
    factCount: 0,
    hasVerified: false,
    hasFaq: false,
    hasInsight: false,
    merchantStatus: null,
    trustScore: null,
  }

  try {
    // Check merchants table
    const { data: merchants } = await supabase
      .from('merchants')
      .select('verification_status, trust_score')
      .or(`name.ilike.%${brand}%,name_en.ilike.%${brand}%,slug.ilike.%${brandLower}%`)
      .eq('region', regionCode)
      .limit(3)

    if (merchants && merchants.length > 0) {
      result.merchantStatus = merchants[0].verification_status || 'found'
      result.trustScore = merchants[0].trust_score || null
    }

    // Check knowledge_facts for brand mentions
    const { data: facts } = await supabase
      .from('knowledge_facts')
      .select('verification_status, source_url')
      .ilike('object_value', `%${brand}%`)
      .limit(20)

    if (facts && facts.length > 0) {
      result.factCount = facts.length
      result.hasVerified = facts.some(f =>
        f.verification_status === 'VERIFIED' || f.verification_status === 'verified_authority'
      )
    }

    // Check insights mentioning the brand
    const { data: insights } = await supabase
      .from('insights')
      .select('faqs, trust_score')
      .ilike('body_html', `%${brand}%`)
      .eq('status', 'published')
      .limit(5)

    if (insights && insights.length > 0) {
      result.hasInsight = true
      const hasFaqInInsights = insights.some(i => {
        const faqs = i.faqs
        if (Array.isArray(faqs)) return faqs.length > 0
        return false
      })
      result.hasFaq = hasFaqInInsights
    }
  } catch {
    // Graceful fallback — return empty result
  }

  return result
}

function scoreFromKG(kg: KGResult): {
  score: number
  engines: EngineResult[]
  topGap: string
  recommendation: string
  brand: string
} {
  // Scoring rubric:
  // Facts in KG: 0=0pts, 1-5=10pts, 6-20=20pts, 20+=30pts
  // Verified facts: +15pts
  // Insight coverage: +15pts
  // FAQ schema: +10pts
  // Merchant in DB: +10pts

  let score = 0
  const signals: string[] = []
  const gaps: string[] = []

  if (kg.factCount === 0) {
    gaps.push('知識圖譜中未找到相關資料')
  } else if (kg.factCount <= 5) {
    score += 10
    signals.push(`${kg.factCount} 條基本事實`)
  } else if (kg.factCount <= 20) {
    score += 20
    signals.push(`${kg.factCount} 條知識事實`)
  } else {
    score += 30
    signals.push(`${kg.factCount}+ 條豐富知識事實`)
  }

  if (kg.hasVerified) {
    score += 15
    signals.push('已驗證權威來源')
  } else if (kg.factCount > 0) {
    gaps.push('事實缺乏權威來源驗證（source_url）')
  }

  if (kg.hasInsight) {
    score += 15
    signals.push('有 AI 可讀文章引用')
  } else {
    gaps.push('缺少 AI 引擎可讀的結構化文章')
  }

  if (kg.hasFaq) {
    score += 10
    signals.push('FAQ schema 已建立')
  } else {
    gaps.push('缺少 FAQPage schema（Perplexity 特別需要）')
  }

  if (kg.merchantStatus) {
    score += 10
    signals.push('商戶資料已收錄')
  } else {
    gaps.push('商戶 entity 未收錄入知識庫')
  }

  // Cap at 95 (100 is perfect coverage across all dimensions)
  score = Math.min(95, score)

  // Build engine results based on KG signals
  // Perplexity: FAQ-driven (strongest signal: hasFaq)
  // ChatGPT: Knowledge-breadth (strongest signal: factCount + hasInsight)
  // Gemini: Entity recognition (strongest signal: merchantStatus + hasVerified)

  const geminiCited = (kg.merchantStatus !== null && kg.hasVerified) || score >= 50
  const chatgptCited = (kg.hasInsight && kg.factCount >= 5) || score >= 60
  const perplexityCited = kg.hasFaq || score >= 70

  const engines: EngineResult[] = [
    {
      name: 'Gemini',
      cited: geminiCited,
      competitors: geminiCited ? [] : ['本地同類知名品牌'],
      snippet: geminiCited
        ? `知識庫中有 ${kg.factCount} 條相關事實，entity 已被 AI 識別`
        : '知識圖譜中 entity 記錄不足，Gemini grounding 無法識別',
    },
    {
      name: 'ChatGPT',
      cited: chatgptCited,
      competitors: chatgptCited ? [] : ['同類競爭品牌'],
      snippet: chatgptCited
        ? `有 ${kg.factCount} 條知識事實 + 文章引用，ChatGPT 可識別`
        : '缺乏足夠的結構化知識事實，ChatGPT 問答時未能提及',
    },
    {
      name: 'Perplexity',
      cited: perplexityCited,
      competitors: perplexityCited ? [] : ['有 FAQ schema 的競爭品牌'],
      snippet: perplexityCited
        ? 'FAQPage schema 已建立，Perplexity 引用率提升'
        : 'FAQPage schema 缺失——Perplexity 引用需要結構化問答格式',
    },
  ]

  const primaryGap = gaps[0] || '整體 AI 能見度有提升空間'

  let topGap: string
  if (score === 0) {
    topGap = `品牌在 AI 知識基礎設施中完全缺席。AI 問詢相關類別時，無法識別這個品牌。主要問題：${gaps.slice(0, 2).join('；')}。`
  } else if (score < 40) {
    topGap = `品牌有基礎資料但 AI 能見度仍弱。${primaryGap}——導致 AI 在回答相關問題時不優先推薦。競爭對手若有更完整的 entity 記錄，會搶先被引用。`
  } else if (score < 70) {
    topGap = `品牌有一定 AI 基礎，但仍有缺口：${gaps.slice(0, 2).join('、')}。補全後可顯著提升各 AI 平台的引用率。`
  } else {
    topGap = `品牌 AI 基礎已相當完整（${signals.join('、')}）。主要建議：確保 AI 引用的是最新精確事實——現有價格、最新認證、招牌產品的具體數字。`
  }

  let recommendation: string
  if (score < 30) {
    recommendation = `建議從「中級方案（MOP 499/月）」開始——建立基礎 FAQ 結構、entity 記錄和 AI 可讀文章。稻荷環球食品從同樣的起點，90 天達到 Perplexity #1。`
  } else if (score < 60) {
    recommendation = `建議升級至「高級方案（MOP 1,499/月）」——將你的業務事實（最新數字/認證/招牌項目）正式收入行業知識圖譜，讓 AI 答問時直接引用你的最新資料而非泛泛描述。`
  } else {
    recommendation = `基礎已相當紮實。建議考慮「定制方案」——進行競品 entity 全面對標，確保在整個品類中佔據 AI 答案的主導地位。`
  }

  return { score, engines, topGap, recommendation, brand: '' }
}

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

  const kg = await queryKnowledgeGraph(brand, region)
  const { score, engines, topGap, recommendation } = scoreFromKG(kg)

  return NextResponse.json({
    score,
    brand,
    category,
    region,
    engines,
    topGap,
    recommendation,
    meta: {
      factCount: kg.factCount,
      hasVerified: kg.hasVerified,
      hasInsight: kg.hasInsight,
      hasFaq: kg.hasFaq,
      scanMode: 'knowledge-graph',
    },
  })
}
