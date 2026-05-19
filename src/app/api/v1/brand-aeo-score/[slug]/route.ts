import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/brandAuth'

export const dynamic = 'force-dynamic'

type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

interface ScoreCheck {
  id: string
  name: string
  engine?: string
  score: number
  max: number
  detail: string
  fix?: string
}

interface Dimension {
  score: number
  max: number
  checks: ScoreCheck[]
}

interface SimpleDimension {
  score: number
  max: number
}

interface PriorityFix {
  id: string
  name: string
  potential_gain: number
  action: string
  difficulty: 'easy' | 'medium' | 'hard'
}

interface AeoScoreResult {
  total_score: number
  grade: Grade
  dimensions: {
    ai_engine_coverage: Dimension
    technical_aeo: Dimension
    content_quality: Dimension
    seo: SimpleDimension
    geo: SimpleDimension
    brand_signals: Dimension
  }
  priority_fixes: PriorityFix[]
  last_calculated: string
}

function toGrade(score: number): Grade {
  if (score >= 180) return 'A+'
  if (score >= 160) return 'A'
  if (score >= 130) return 'B'
  if (score >= 100) return 'C'
  if (score >= 70) return 'D'
  return 'F'
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function jsonbArrayLength(val: unknown): number {
  if (!val) return 0
  if (Array.isArray(val)) return val.length
  return 0
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { slug } = await params

  if (session.brand_slug !== slug) {
    return NextResponse.json({ error: 'Forbidden: token does not match slug' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  // Parallel fetches
  const [profileResult, citationsResult, faqsResult, productsResult] = await Promise.all([
    supabase
      .from('brand_profiles')
      .select('*')
      .eq('brand_slug', slug)
      .single(),
    supabase
      .from('ai_search_results')
      .select('platform, mentioned')
      .eq('brand_slug', slug)
      .eq('mentioned', true)
      .gte('timestamp', ninetyDaysAgo),
    supabase
      .from('brand_faqs')
      .select('id')
      .eq('brand_slug', slug)
      .eq('is_published', true),
    supabase
      .from('brand_products')
      .select('id')
      .eq('brand_slug', slug),
  ])

  const profile = profileResult.data as Record<string, unknown> | null
  const citations: Array<{ platform: string }> = citationsResult.data ?? []
  const faqCount = faqsResult.data?.length ?? 0
  const productCount = productsResult.data?.length ?? 0

  // ── AI Engine Coverage (50 pts) ──────────────────────────────────────────
  const mentionedPlatforms = new Set(citations.map((c) => c.platform.toLowerCase()))

  const aeChecks: ScoreCheck[] = [
    {
      id: 'AE1', name: 'ChatGPT 引用', engine: 'chatgpt',
      score: mentionedPlatforms.has('chatgpt') ? 10 : 0, max: 10,
      detail: mentionedPlatforms.has('chatgpt') ? '過去 90 天有被引用' : '過去 90 天未被引用',
      fix: mentionedPlatforms.has('chatgpt') ? undefined : '發布更多含品牌名稱的 FAQ 和 insight，強化 Bing index',
    },
    {
      id: 'AE2', name: 'Perplexity 引用', engine: 'perplexity',
      score: mentionedPlatforms.has('perplexity') ? 10 : 0, max: 10,
      detail: mentionedPlatforms.has('perplexity') ? '過去 90 天有被引用' : '過去 90 天未被引用',
      fix: mentionedPlatforms.has('perplexity') ? undefined : '強化 FAQPage Schema + 商戶頁 LocalBusiness，Perplexity 優先讀商戶頁',
    },
    {
      id: 'AE3', name: 'Gemini 引用', engine: 'gemini',
      score: mentionedPlatforms.has('gemini') ? 10 : 0, max: 10,
      detail: mentionedPlatforms.has('gemini') ? '過去 90 天有被引用' : '過去 90 天未被引用',
      fix: mentionedPlatforms.has('gemini') ? undefined : '強化 Google Search 排名，確保 Knowledge Panel 存在',
    },
    {
      id: 'AE4', name: 'Grok 引用', engine: 'grok',
      score: mentionedPlatforms.has('grok') ? 8 : 0, max: 8,
      detail: mentionedPlatforms.has('grok') ? '過去 90 天有被引用' : '過去 90 天未被引用',
      fix: mentionedPlatforms.has('grok') ? undefined : '增加 X (Twitter) 品牌提及，Grok 強依賴 X 數據',
    },
    {
      id: 'AE5', name: 'Copilot 引用', engine: 'copilot',
      score: mentionedPlatforms.has('copilot') ? 8 : 0, max: 8,
      detail: mentionedPlatforms.has('copilot') ? '過去 90 天有被引用' : '過去 90 天未被引用',
      fix: mentionedPlatforms.has('copilot') ? undefined : '強化 Bing Webmaster 驗證 + IndexNow ping',
    },
  ]
  const aiCoverageScore = aeChecks.reduce((s, c) => s + c.score, 0)

  // ── Technical AEO (40 pts) — static logic based on profile ───────────────
  const hasLlmsTxt = !!(profile?.llms_txt_url)
  const hasIndexNow = !!(profile?.indexnow_key)
  const hasPrimaryQuery = !!(profile?.primary_query)
  const hasWebsite = !!(profile?.website_url)

  const techChecks: ScoreCheck[] = [
    {
      id: 'T1', name: 'llms.txt 已設定',
      score: hasLlmsTxt ? 10 : 0, max: 10,
      detail: hasLlmsTxt ? `llms.txt: ${String(profile?.llms_txt_url)}` : '未設定 llms.txt URL',
      fix: hasLlmsTxt ? undefined : '在品牌主檔填入 llms_txt_url（格式：https://yourdomain.com/llms.txt）',
    },
    {
      id: 'T2', name: 'IndexNow Key 已設定',
      score: hasIndexNow ? 10 : 0, max: 10,
      detail: hasIndexNow ? 'IndexNow 金鑰已配置' : '未設定 IndexNow Key',
      fix: hasIndexNow ? undefined : '申請 IndexNow key 並填入 indexnow_key 欄位',
    },
    {
      id: 'T3', name: '主要搜尋查詢已定義',
      score: hasPrimaryQuery ? 10 : 0, max: 10,
      detail: hasPrimaryQuery ? `主查詢：${String(profile?.primary_query)}` : '未定義 primary_query',
      fix: hasPrimaryQuery ? undefined : '在品牌主檔填入 primary_query（AI 引擎最常搜尋你品牌的關鍵詞）',
    },
    {
      id: 'T4', name: '品牌官網已設定',
      score: hasWebsite ? 10 : 0, max: 10,
      detail: hasWebsite ? `官網：${String(profile?.website_url)}` : '未設定網站 URL',
      fix: hasWebsite ? undefined : '填入 website_url',
    },
  ]
  const techScore = techChecks.reduce((s, c) => s + c.score, 0)

  // ── Content Quality (40 pts) ─────────────────────────────────────────────
  const authoritySourcesLen = jsonbArrayLength(profile?.authority_sources)
  const keyStatsLen = jsonbArrayLength(profile?.key_stats)
  const aboutZhLen = typeof profile?.about_zh === 'string' ? profile.about_zh.length : 0
  const updatedDays = profile?.updated_at ? daysSince(String(profile.updated_at)) : 9999

  const c1Score = faqCount >= 8 ? 8 : faqCount >= 5 ? 5 : faqCount >= 3 ? 3 : 0
  const c2Score = authoritySourcesLen >= 3 ? 8 : authoritySourcesLen >= 2 ? 5 : authoritySourcesLen >= 1 ? 2 : 0
  const c3Score = keyStatsLen >= 5 ? 8 : keyStatsLen >= 3 ? 5 : keyStatsLen >= 1 ? 2 : 0
  const c4Score = updatedDays <= 7 ? 8 : updatedDays <= 14 ? 6 : updatedDays <= 30 ? 4 : 0
  const c5Score = aboutZhLen >= 300 ? 8 : aboutZhLen >= 150 ? 5 : aboutZhLen >= 50 ? 2 : 0

  const contentChecks: ScoreCheck[] = [
    {
      id: 'C1', name: '已發布 FAQ 數量',
      score: c1Score, max: 8,
      detail: `${faqCount} 條已發布 FAQ`,
      fix: faqCount < 8 ? `新增 FAQ 至 ${8 - faqCount} 條以達滿分（現有 ${faqCount} 條）` : undefined,
    },
    {
      id: 'C2', name: '權威來源數量',
      score: c2Score, max: 8,
      detail: `${authoritySourcesLen} 個 authority_sources`,
      fix: authoritySourcesLen < 3 ? '新增至少 3 個官方/媒體來源連結到 authority_sources' : undefined,
    },
    {
      id: 'C3', name: '關鍵數據統計',
      score: c3Score, max: 8,
      detail: `${keyStatsLen} 條 key_stats`,
      fix: keyStatsLen < 5 ? '在 key_stats 加入品牌數字（成立年、客戶數、覆蓋地區等）' : undefined,
    },
    {
      id: 'C4', name: '資料新鮮度',
      score: c4Score, max: 8,
      detail: profile?.updated_at ? `上次更新：${updatedDays} 天前` : '從未更新',
      fix: updatedDays > 7 ? '每週更新一次品牌主檔，保持資料新鮮度' : undefined,
    },
    {
      id: 'C5', name: '品牌簡介長度',
      score: c5Score, max: 8,
      detail: `about_zh 長度：${aboutZhLen} 字`,
      fix: aboutZhLen < 300 ? `擴充品牌簡介至 300 字以上（現有 ${aboutZhLen} 字）` : undefined,
    },
  ]
  const contentScore = contentChecks.reduce((s, c) => s + c.score, 0)

  // ── Brand Signals (10 pts) ────────────────────────────────────────────────
  const hasMapsUrl = !!(profile?.maps_url)
  const hasSocial = !!(profile?.social_facebook || profile?.social_instagram)
  const hasMediaMentions = jsonbArrayLength(profile?.media_mentions) >= 1

  const bs1Score = hasMapsUrl ? 4 : 0
  const bs2Score = hasSocial ? 3 : 0
  const bs3Score = hasMediaMentions ? 3 : 0

  const brandChecks: ScoreCheck[] = [
    {
      id: 'BS1', name: 'Google Maps 連結',
      score: bs1Score, max: 4,
      detail: hasMapsUrl ? `Maps: ${String(profile?.maps_url)}` : '未設定 Google Maps URL',
      fix: hasMapsUrl ? undefined : '填入 maps_url（Google Maps 商家連結），提升 Local SEO 和 AI 本地引用',
    },
    {
      id: 'BS2', name: '社群媒體存在',
      score: bs2Score, max: 3,
      detail: hasSocial
        ? `已設定：${[profile?.social_facebook && 'Facebook', profile?.social_instagram && 'Instagram'].filter(Boolean).join(', ')}`
        : '未設定 Facebook/Instagram',
      fix: hasSocial ? undefined : '填入至少一個社群媒體帳號（social_facebook 或 social_instagram）',
    },
    {
      id: 'BS3', name: '媒體報道記錄',
      score: bs3Score, max: 3,
      detail: `${jsonbArrayLength(profile?.media_mentions)} 條媒體報道`,
      fix: !hasMediaMentions ? '在 media_mentions 新增至少一條媒體報道（含標題、URL、媒體名稱）' : undefined,
    },
  ]
  const brandSignalsScore = brandChecks.reduce((s, c) => s + c.score, 0)

  // ── SEO / GEO placeholders ────────────────────────────────────────────────
  // These dimensions require data from visibility-scan API; placeholder values here
  const seoScore = 0
  const geoScore = 0

  // ── Total ────────────────────────────────────────────────────────────────
  const totalScore = aiCoverageScore + techScore + contentScore + seoScore + geoScore + brandSignalsScore

  // ── Priority Fixes (top 5 by potential_gain) ──────────────────────────────
  const allFixes: PriorityFix[] = []

  for (const check of [...aeChecks, ...techChecks, ...contentChecks, ...brandChecks]) {
    if (check.fix && check.score < check.max) {
      allFixes.push({
        id: check.id,
        name: check.name,
        potential_gain: check.max - check.score,
        action: check.fix,
        difficulty: check.max >= 10 ? 'hard' : check.max >= 8 ? 'medium' : 'easy',
      })
    }
  }

  allFixes.sort((a, b) => b.potential_gain - a.potential_gain)
  const priorityFixes = allFixes.slice(0, 5)

  const result: AeoScoreResult = {
    total_score: totalScore,
    grade: toGrade(totalScore),
    dimensions: {
      ai_engine_coverage: { score: aiCoverageScore, max: 50, checks: aeChecks },
      technical_aeo: { score: techScore, max: 40, checks: techChecks },
      content_quality: { score: contentScore, max: 40, checks: contentChecks },
      seo: { score: seoScore, max: 35 },
      geo: { score: geoScore, max: 25 },
      brand_signals: { score: brandSignalsScore, max: 10, checks: brandChecks },
    },
    priority_fixes: priorityFixes,
    last_calculated: new Date().toISOString(),
  }

  // Attach product count for context
  return NextResponse.json({
    slug,
    product_count: productCount,
    faq_published_count: faqCount,
    ...result,
  })
}
