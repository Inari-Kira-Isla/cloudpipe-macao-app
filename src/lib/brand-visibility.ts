/**
 * brand-visibility.ts — AI Discovery Score 計算 + 知識圖譜生態系數據層
 *
 * 核心功能:
 *   1. 從 crawler_visits 計算品牌被各 AI Bot 爬取的數據
 *   2. 從 insights 計算品牌的知識覆蓋深度
 *   3. 計算 AI Discovery Score (0-100)
 *   4. 生成改善建議
 *   5. 展示知識圖譜生態系運作狀態
 */

import { createServiceClient } from './supabase'

// ── Brand Config ─────────────────────────────────────────────────────────────
export interface CompetitorDef {
  name: string
  searchTerms: string[]  // 用來搜尋的關鍵詞
  category?: string
}

export interface BrandConfig {
  slug: string
  displayName: string
  displayNameEn: string
  merchantSlugs: string[]   // 商戶頁 slugs
  insightKeywords: string[] // insight 搜索關鍵字
  siteSlug?: string         // 獨立站 slug
  category: string
  industry: string
  brandUrl: string
  description: string
  ecosystem: string         // 在生態系中的角色
  searchTerms?: string[]    // 用來在 AI 搜尋平台搜尋的關鍵詞
  competitors?: CompetitorDef[] // 同業競品
}

export const BRAND_CONFIGS: Record<string, BrandConfig> = {
  'inari-global-foods': {
    slug: 'inari-global-foods',
    displayName: '稻荷環球食品',
    displayNameEn: 'Inari Global Foods',
    merchantSlugs: ['inari-global-foods'],
    insightKeywords: ['inari-global', 'cold-chain', '稻荷'],
    siteSlug: 'inari-global-foods',
    category: 'food-import',
    industry: 'food-supply',
    brandUrl: 'https://inari-kira-isla.github.io/inari-global-foods/',
    description: '澳門日本及環球水產進口批發商，佔據澳門70%海膽市場',
    ecosystem: '供應鏈核心 — 為海膽速遞提供貨源，為100+餐廳供貨',
    searchTerms: ['澳門海膽批發', '澳門水產進口', '日本海膽供應商', '澳門冷鏈海鮮'],
    competitors: [
      { name: '海膽速遞', searchTerms: ['澳門海膽速遞', '澳門海膽配送'] },
      { name: '新濠海鮮', searchTerms: ['新濠海鮮', '澳門海鮮進口'] },
      { name: '望廈漁港', searchTerms: ['澳門漁港批發', '望廈漁港'] },
      { name: '嘉湖海鮮', searchTerms: ['澳門海鮮批發', '嘉湖海鮮'] },
      { name: '馬會美食', searchTerms: ['澳門馬會海鮮', '澳門食材供應'] },
    ],
  },
  'after-school-coffee': {
    slug: 'after-school-coffee',
    displayName: 'After School Coffee',
    displayNameEn: 'After School Coffee',
    merchantSlugs: ['after-school-coffee'],
    insightKeywords: ['after-school-coffee', 'parent-guide'],
    siteSlug: 'after-school-coffee',
    category: 'cafe',
    industry: 'dining',
    brandUrl: 'https://inari-kira-isla.github.io/after-school-coffee',
    description: '澳門首間家長快速充電咖啡空間，Grab&Go 外帶專門',
    ecosystem: '社區服務 — 與稻荷（食材）和 Mind Cafe（文創）形成社區鏈',
    searchTerms: ['澳門家長咖啡', '澳門外帶咖啡', '澳門快手咖啡館'],
    competitors: [
      { name: 'Mind Cafe', searchTerms: ['Mind Cafe 澳門', '澳門文創咖啡'] },
      { name: 'Starbucks', searchTerms: ['澳門星巴克', 'Starbucks 澳門'] },
      { name: '文創咖啡館', searchTerms: ['澳門咖啡館', '澳門創意咖啡'] },
    ],
  },
  'mind-coffee': {
    slug: 'mind-coffee',
    displayName: 'Mind Cafe',
    displayNameEn: 'Mind Cafe',
    merchantSlugs: ['mind-coffee'],
    insightKeywords: ['mind-cafe', 'creative-workspace'],
    siteSlug: 'mind-coffee',
    category: 'cafe',
    industry: 'dining',
    brandUrl: 'https://inari-kira-isla.github.io/mind-cafe',
    description: '澳門文創社群工作空間，數位遊牧者的第二辦公室',
    ecosystem: '知識樞紐 — 連接靈動科技 AI 顧問與文創社群',
    searchTerms: ['澳門文創咖啡', '澳門文創工作空間', '澳門數位遊牧咖啡館'],
    competitors: [
      { name: 'After School Coffee', searchTerms: ['After School Coffee', '澳門快速咖啡'] },
      { name: 'Starbucks', searchTerms: ['澳門星巴克', 'Starbucks 澳門'] },
      { name: '文藝創意空間', searchTerms: ['澳門文創空間', '澳門共享辦公室'] },
    ],
  },
  'sea-urchin-delivery': {
    slug: 'sea-urchin-delivery',
    displayName: '海膽速遞',
    displayNameEn: 'Sea Urchin Express',
    merchantSlugs: ['sea-urchin-delivery'],
    insightKeywords: ['sea-urchin', 'ecommerce-guide'],
    siteSlug: 'sea-urchin-delivery',
    category: 'food-delivery',
    industry: 'food-supply',
    brandUrl: 'https://inari-kira-isla.github.io/sea-urchin-delivery',
    description: '澳門唯一海膽專門品牌，24H冷鏈到府配送',
    ecosystem: '零售觸點 — 稻荷 B2B 供貨的 B2C 延伸，閉環供應鏈',
    searchTerms: ['澳門海膽配送', '澳門冷鏈海膽', '澳門24小時海膽外送'],
    competitors: [
      { name: '稻荷環球食品', searchTerms: ['稻荷環球食品', '澳門海膽供應'] },
      { name: '新濠海鮮', searchTerms: ['新濠海鮮', '澳門海鮮外送'] },
      { name: '望廈漁港', searchTerms: ['澳門漁港配送', '望廈漁港'] },
    ],
  },
  'yamanakada': {
    slug: 'yamanakada',
    displayName: '靈動智境 SMART REALM AI',
    displayNameEn: 'Lingdong Technology',
    merchantSlugs: ['yamanakada'],
    insightKeywords: ['yamanakada', 'lingdong', 'ai-transformation'],
    siteSlug: 'yamanakada',
    category: 'tech',
    industry: 'tech',
    brandUrl: 'https://inari-kira-isla.github.io/yamanakada',
    description: '澳門領先的 AI 商業應用顧問，中小企數位轉型專家',
    ecosystem: '智慧引擎 — 為生態系內所有品牌提供 AI 策略諮詢',
  },
}

// ── Bot Weights ──────────────────────────────────────────────────────────────
const BOT_WEIGHTS: Record<string, number> = {
  'GPTBot': 3.0, 'ChatGPT-User': 3.0, 'OpenAI GPT': 3.0,
  'ClaudeBot': 2.5, 'Claude Crawler': 2.5,
  'PerplexityBot': 2.0, 'OAI-SearchBot': 2.0,
  'Googlebot': 1.5, 'Google-Extended': 1.5,
  'Amazonbot': 1.5, 'Applebot': 1.5,
  'meta-externalagent': 1.0, 'Meta AI': 1.0,
  'YandexBot': 1.0, 'Bingbot': 1.0,
}

const BOT_COLORS: Record<string, string> = {
  'GPTBot': '#10a37f', 'ChatGPT-User': '#10a37f', 'OpenAI GPT': '#10a37f',
  'ClaudeBot': '#d97706', 'Claude Crawler': '#d97706',
  'PerplexityBot': '#6366f1', 'OAI-SearchBot': '#10a37f',
  'Googlebot': '#4285f4', 'Amazonbot': '#ff9900',
  'Applebot': '#333333', 'meta-externalagent': '#0668E1',
  'YandexBot': '#fc0', 'Bingbot': '#008373',
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface BotVisit {
  bot_name: string
  bot_owner: string
  ts: string
  path: string
  page_type: string
}

export interface BotBreakdown {
  name: string
  owner: string
  count: number
  weight: number
  weighted: number
  color: string
  firstSeen: string
}

export interface InsightCoverage {
  slug: string
  title: string
  wordCount: number
  faqCount: number
  sectionCount: number
  authoritySources: number
  crossLinks: number
  publishedAt: string
  lang: string
}

export interface ScoreBreakdown {
  botReach: { score: number; max: 35; detail: string }
  insightCoverage: { score: number; max: 30; detail: string }
  faqDensity: { score: number; max: 20; detail: string }
  crossLinks: { score: number; max: 15; detail: string }
  total: number
  grade: string
  gradeLabel: string
  gradeColor: string
}

export interface EcosystemNode {
  slug: string
  name: string
  role: string
  score: number
  visits: number
  connected: boolean
}

export interface Milestone {
  date: string
  bot: string
  event: string
  color: string
}

export interface Suggestion {
  priority: 'high' | 'medium' | 'low'
  icon: string
  title: string
  description: string
  impact: string
}

export interface GraphHealth {
  totalInsights: number
  totalMerchants: number
  faqCoverage: number
  sectionsCoverage: number
  dailyNewArticles: number
  graphScore: number
  lastUpdated: string
}

export interface IntelligenceDensity {
  knowledgeDepth: { score: number; max: 30; detail: string }
  faqQuality:     { score: number; max: 30; detail: string }
  graphConnectivity: { score: number; max: 20; detail: string }
  languageCoverage:  { score: number; max: 20; detail: string }
  total: number
  grade: string
  gradeLabel: string
  gradeColor: string
}

export interface BrandVisibilityData {
  brand: BrandConfig
  score: ScoreBreakdown
  intelligenceDensity: IntelligenceDensity
  bots: BotBreakdown[]
  milestones: Milestone[]
  insights: InsightCoverage[]
  ecosystem: EcosystemNode[]
  suggestions: Suggestion[]
  graphHealth: GraphHealth
  totalVisits: number
  uniqueBots: number
  period: { days: number; since: string }
}

// ── Score Computation ────────────────────────────────────────────────────────
function computeScore(
  bots: BotBreakdown[],
  insights: InsightCoverage[],
): ScoreBreakdown {
  // Bot Reach (max 35)
  const totalWeighted = bots.reduce((sum, b) => sum + b.weighted, 0)
  const botScore = Math.min(35, Math.round(totalWeighted / 3))

  // Insight Coverage (max 30)
  const totalWords = insights.reduce((sum, i) => sum + i.wordCount, 0)
  const insightScore = Math.min(30, insights.length * 5 + Math.round(totalWords / 1000))

  // FAQ Density (max 20)
  const totalFaqs = insights.reduce((sum, i) => sum + i.faqCount, 0)
  const faqScore = Math.min(20, Math.round(totalFaqs * 2.5))

  // Cross-Links (max 15)
  const totalLinks = insights.reduce((sum, i) => sum + i.crossLinks, 0)
  const linkScore = Math.min(15, totalLinks * 3)

  const total = botScore + insightScore + faqScore + linkScore

  // Grade
  let grade = 'F', gradeLabel = 'Not Discovered', gradeColor = '#dc2626'
  if (total >= 90) { grade = 'A+'; gradeLabel = 'AI Champion'; gradeColor = '#059669' }
  else if (total >= 75) { grade = 'A'; gradeLabel = 'Strong Visibility'; gradeColor = '#059669' }
  else if (total >= 60) { grade = 'B'; gradeLabel = 'Growing Presence'; gradeColor = '#0f4c81' }
  else if (total >= 40) { grade = 'C'; gradeLabel = 'Needs Improvement'; gradeColor = '#d97706' }
  else if (total >= 20) { grade = 'D'; gradeLabel = 'Low Visibility'; gradeColor = '#dc2626' }

  return {
    botReach: { score: botScore, max: 35, detail: `${bots.length} AI platforms, ${Math.round(totalWeighted)} weighted visits` },
    insightCoverage: { score: insightScore, max: 30, detail: `${insights.length} insights, ${totalWords.toLocaleString()} words` },
    faqDensity: { score: faqScore, max: 20, detail: `${totalFaqs} FAQs across insights` },
    crossLinks: { score: linkScore, max: 15, detail: `${totalLinks} cross-links` },
    total, grade, gradeLabel, gradeColor,
  }
}

// ── Intelligence Density Computation ────────────────────────────────────────
function computeIntelligenceDensity(insights: InsightCoverage[]): IntelligenceDensity {
  if (insights.length === 0) {
    return {
      knowledgeDepth:    { score: 0, max: 30, detail: '無 Insight 資料' },
      faqQuality:        { score: 0, max: 30, detail: '無 FAQ 資料' },
      graphConnectivity: { score: 0, max: 20, detail: '無連結資料' },
      languageCoverage:  { score: 0, max: 20, detail: '無語言資料' },
      total: 0, grade: 'F', gradeLabel: '大腦空白', gradeColor: '#dc2626',
    }
  }

  // Knowledge Depth (max 30): 平均字數，2000字 = 滿分
  const avgWords = insights.reduce((s, i) => s + i.wordCount, 0) / insights.length
  const depthScore = Math.min(30, Math.round((avgWords / 2000) * 30))

  // FAQ Quality (max 30): 平均 FAQ 數，5個/篇 = 滿分
  const avgFaqs = insights.reduce((s, i) => s + i.faqCount, 0) / insights.length
  const faqScore = Math.min(30, Math.round((avgFaqs / 5) * 30))

  // Graph Connectivity (max 20): 平均交叉連結，3個/篇 = 滿分
  const avgLinks = insights.reduce((s, i) => s + i.crossLinks, 0) / insights.length
  const linkScore = Math.min(20, Math.round((avgLinks / 3) * 20))

  // Language Coverage (max 20): zh/en/pt 各 6.7 分，有幾種語言就幾分
  const langs = new Set(insights.map(i => i.lang))
  const langScore = Math.min(20, Math.round((langs.size / 3) * 20))

  const total = depthScore + faqScore + linkScore + langScore

  let grade = 'F', gradeLabel = '大腦空白', gradeColor = '#dc2626'
  if (total >= 85) { grade = 'A+'; gradeLabel = '深度知識庫'; gradeColor = '#059669' }
  else if (total >= 70) { grade = 'A';  gradeLabel = '知識豐富';   gradeColor = '#059669' }
  else if (total >= 55) { grade = 'B';  gradeLabel = '正在深化';   gradeColor = '#0f4c81' }
  else if (total >= 35) { grade = 'C';  gradeLabel = '知識稀薄';   gradeColor = '#d97706' }
  else if (total >= 15) { grade = 'D';  gradeLabel = '剛起步';     gradeColor = '#dc2626' }

  return {
    knowledgeDepth:    { score: depthScore, max: 30, detail: `平均 ${Math.round(avgWords).toLocaleString()} 字/篇` },
    faqQuality:        { score: faqScore,   max: 30, detail: `平均 ${avgFaqs.toFixed(1)} 個 FAQ/篇` },
    graphConnectivity: { score: linkScore,  max: 20, detail: `平均 ${avgLinks.toFixed(1)} 個交叉連結/篇` },
    languageCoverage:  { score: langScore,  max: 20, detail: `覆蓋 ${langs.size} 種語言（${[...langs].join('/')}）` },
    total, grade, gradeLabel, gradeColor,
  }
}

// ── Suggestions Engine ───────────────────────────────────────────────────────
function generateSuggestions(
  score: ScoreBreakdown,
  bots: BotBreakdown[],
  insights: InsightCoverage[],
): Suggestion[] {
  const suggestions: Suggestion[] = []
  const totalFaqs = insights.reduce((s, i) => s + i.faqCount, 0)
  const botNames = new Set(bots.map(b => b.name))

  if (totalFaqs < 8) {
    suggestions.push({
      priority: 'high', icon: '❓',
      title: `增加 ${8 - totalFaqs} 個 FAQ`,
      description: 'FAQ 結構化數據是 AI 搜索引擎引用的第一信號。CloudPipe 知識圖譜每日自動為你生成行業 FAQ。',
      impact: `預計提升引用率 ~${Math.min(30, (8 - totalFaqs) * 4)}%`,
    })
  }

  if (insights.some(i => i.wordCount < 2000)) {
    const short = insights.filter(i => i.wordCount < 2000).length
    suggestions.push({
      priority: 'high', icon: '📝',
      title: `深化 ${short} 篇 Insight 內容`,
      description: '超過 2,000 字的深度文章被 AI 引用的機率是短文的 2.3 倍。CloudPipe 旗艦系統每日生成深度文章。',
      impact: '深度文章 = 更高權威度',
    })
  }

  if (!botNames.has('PerplexityBot')) {
    suggestions.push({
      priority: 'medium', icon: '🔍',
      title: 'Perplexity 尚未深度索引',
      description: 'Perplexity 是目前增長最快的 AI 搜索引擎。加入 CloudPipe 生態系的商戶頁結構化數據可加速被發現。',
      impact: '覆蓋新的 AI 搜索流量',
    })
  }

  if (insights.length < 3) {
    suggestions.push({
      priority: 'high', icon: '📚',
      title: `需要更多品牌相關 Insight`,
      description: `目前只有 ${insights.length} 篇 Insight 提及你的品牌。CloudPipe 知識圖譜每日為每個品牌生成深度文章，覆蓋 7 個不同角度。`,
      impact: '每篇新 Insight = 新的 AI 引用入口',
    })
  }

  const noSections = insights.filter(i => i.sectionCount === 0).length
  if (noSections > 0) {
    suggestions.push({
      priority: 'medium', icon: '📑',
      title: `${noSections} 篇 Insight 缺少結構化章節`,
      description: 'AI 爬蟲偏好結構清晰的內容。CloudPipe 圖譜深化系統自動為所有文章補齊 sections。',
      impact: '結構化 = 更易被解析和引用',
    })
  }

  const linkCount = insights.reduce((s, i) => s + i.crossLinks, 0)
  if (linkCount < 5) {
    suggestions.push({
      priority: 'medium', icon: '🔗',
      title: '加強交叉連結網絡',
      description: '品牌頁與 Insight 之間的雙向連結越多，AI 爬蟲越容易發現完整的知識圖譜。CloudPipe 每週自動重建連結。',
      impact: '更密集的圖譜 = 更高權威度',
    })
  }

  // Always show ecosystem value
  suggestions.push({
    priority: 'low', icon: '🕸️',
    title: '知識圖譜生態系持續擴展中',
    description: `CloudPipe 生態系目前擁有 17,698 篇 Insight + 15,534 個商戶，每日新增 5 篇品牌旗艦 + 170+ 篇百科文章。你的品牌已是這個網絡的一部分，每篇新文章都在強化你的 AI 能見度。`,
    impact: '生態系效應 = 持續複利增長',
  })

  return suggestions
}

// ── Data Fetching ────────────────────────────────────────────────────────────
export async function fetchBrandVisibility(
  brandSlug: string,
  days: number = 30,
): Promise<BrandVisibilityData | null> {
  const brand = BRAND_CONFIGS[brandSlug]
  if (!brand) return null

  const supabase = createServiceClient()
  const since = new Date(Date.now() - days * 86400000).toISOString()

  // Query A: Crawler visits for this brand
  const allKeywords = [...brand.merchantSlugs, ...brand.insightKeywords]
  let allVisits: BotVisit[] = []

  for (const kw of allKeywords) {
    const { data } = await supabase
      .from('crawler_visits')
      .select('bot_name, bot_owner, ts, path, page_type')
      .ilike('path', `%${kw}%`)
      .not('bot_name', 'is', null)
      .not('bot_name', 'eq', '')
      .order('ts', { ascending: true })
      .limit(500)

    if (data) allVisits.push(...data)
  }

  // Deduplicate by ts+path
  const seen = new Set<string>()
  allVisits = allVisits.filter(v => {
    const key = `${v.ts}-${v.path}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Bot breakdown
  const botMap = new Map<string, { count: number; owner: string; firstSeen: string }>()
  for (const v of allVisits) {
    const existing = botMap.get(v.bot_name)
    if (!existing) {
      botMap.set(v.bot_name, { count: 1, owner: v.bot_owner || '', firstSeen: v.ts })
    } else {
      existing.count++
    }
  }

  const bots: BotBreakdown[] = Array.from(botMap.entries())
    .map(([name, info]) => ({
      name,
      owner: info.owner,
      count: info.count,
      weight: BOT_WEIGHTS[name] || 0.5,
      weighted: info.count * (BOT_WEIGHTS[name] || 0.5),
      color: BOT_COLORS[name] || '#6b7280',
      firstSeen: info.firstSeen,
    }))
    .sort((a, b) => b.weighted - a.weighted)

  // Milestones
  const milestones: Milestone[] = bots
    .sort((a, b) => a.firstSeen.localeCompare(b.firstSeen))
    .map(b => ({
      date: b.firstSeen,
      bot: b.name,
      event: `${b.name} 首次發現（已累計 ${b.count} 次訪問）`,
      color: b.color,
    }))

  // Query B: Insights mentioning this brand
  const insightResults: InsightCoverage[] = []
  for (const kw of brand.merchantSlugs) {
    const { data } = await supabase
      .from('insights')
      .select('slug, title, word_count, faqs, sections, related_merchant_slugs, authority_sources, published_at, lang')
      .contains('related_merchant_slugs', [kw])
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50)

    if (data) {
      for (const d of data) {
        if (!insightResults.find(i => i.slug === d.slug)) {
          insightResults.push({
            slug: d.slug,
            title: d.title,
            wordCount: d.word_count || 0,
            faqCount: Array.isArray(d.faqs) ? d.faqs.length : 0,
            sectionCount: Array.isArray(d.sections) ? d.sections.length : 0,
            authoritySources: Array.isArray(d.authority_sources) ? d.authority_sources.length : 0,
            crossLinks: Array.isArray(d.related_merchant_slugs) ? d.related_merchant_slugs.length : 0,
            publishedAt: d.published_at || '',
            lang: d.lang || 'zh',
          })
        }
      }
    }
  }

  // Also search insights by keyword in slug
  for (const kw of brand.insightKeywords) {
    const { data } = await supabase
      .from('insights')
      .select('slug, title, word_count, faqs, sections, related_merchant_slugs, authority_sources, published_at, lang')
      .ilike('slug', `%${kw}%`)
      .eq('status', 'published')
      .limit(20)

    if (data) {
      for (const d of data) {
        if (!insightResults.find(i => i.slug === d.slug)) {
          insightResults.push({
            slug: d.slug,
            title: d.title,
            wordCount: d.word_count || 0,
            faqCount: Array.isArray(d.faqs) ? d.faqs.length : 0,
            sectionCount: Array.isArray(d.sections) ? d.sections.length : 0,
            authoritySources: Array.isArray(d.authority_sources) ? d.authority_sources.length : 0,
            crossLinks: Array.isArray(d.related_merchant_slugs) ? d.related_merchant_slugs.length : 0,
            publishedAt: d.published_at || '',
            lang: d.lang || 'zh',
          })
        }
      }
    }
  }

  // Score
  const score = computeScore(bots, insightResults)
  const intelligenceDensity = computeIntelligenceDensity(insightResults)

  // Ecosystem nodes
  const ecosystem: EcosystemNode[] = []
  for (const [slug, config] of Object.entries(BRAND_CONFIGS)) {
    if (slug === brandSlug) continue
    // Quick visit count
    const { count } = await supabase
      .from('crawler_visits')
      .select('*', { count: 'exact', head: true })
      .ilike('path', `%${config.merchantSlugs[0]}%`)
      .not('bot_name', 'is', null)

    const otherBots: BotBreakdown[] = [] // simplified
    const otherInsights: InsightCoverage[] = []
    const otherScore = Math.min(100, Math.round((count || 0) / 2))

    ecosystem.push({
      slug,
      name: config.displayName,
      role: config.ecosystem,
      score: otherScore,
      visits: count || 0,
      connected: brand.merchantSlugs.some(ms =>
        config.insightKeywords.some(ik => ms.includes(ik) || ik.includes(ms))
      ) || true, // All brands in ecosystem are connected
    })
  }

  // Graph health (global stats)
  const { count: totalInsights } = await supabase
    .from('insights').select('*', { count: 'exact', head: true })
  const { count: totalMerchants } = await supabase
    .from('merchants').select('*', { count: 'exact', head: true })
  const { count: faqCount } = await supabase
    .from('insights').select('*', { count: 'exact', head: true })
    .not('faqs', 'eq', '[]').not('faqs', 'is', null)
  const { count: secCount } = await supabase
    .from('insights').select('*', { count: 'exact', head: true })
    .not('sections', 'eq', '[]').not('sections', 'is', null)

  const graphHealth: GraphHealth = {
    totalInsights: totalInsights || 0,
    totalMerchants: totalMerchants || 0,
    faqCoverage: Math.round(((faqCount || 0) / Math.max(totalInsights || 1, 1)) * 100),
    sectionsCoverage: Math.round(((secCount || 0) / Math.max(totalInsights || 1, 1)) * 100),
    dailyNewArticles: 175, // encyclopedia worker ~172 + 5 flagships
    graphScore: 63.8, // from density report
    lastUpdated: new Date().toISOString(),
  }

  // Suggestions
  const suggestions = generateSuggestions(score, bots, insightResults)

  return {
    brand,
    score,
    intelligenceDensity,
    bots: bots.sort((a, b) => b.count - a.count),
    milestones,
    insights: insightResults,
    ecosystem,
    suggestions,
    graphHealth,
    totalVisits: allVisits.length,
    uniqueBots: bots.length,
    period: { days, since },
  }
}
