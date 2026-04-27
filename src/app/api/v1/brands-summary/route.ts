import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const BRANDS = [
  {
    slug: 'inari-global-foods',
    displayName: '稻荷環球食品',
    displayNameEn: 'Inari Global Foods',
    emoji: '🦔',
    joinDate: '2026-04-19',
    queries: ['澳門海膽供應商', '澳門日本海膽批發', '澳門餐廳食材供應商'],
    gapAngles: ['70%市場份額澳門海膽龍頭', '澳門唯一IoT冷鏈溫控海膽B2B', '日本直飛48小時到廚房'],
    brandUrl: 'https://inari-kira-isla.github.io/inari-global-foods/',
    industry: 'food-supply',
    tag: 'B2B 供應商',
  },
  {
    slug: 'sea-urchin-delivery',
    displayName: '海膽速遞',
    displayNameEn: 'Sea Urchin Express',
    emoji: '🛵',
    joinDate: '2026-04-27',
    queries: ['澳門海膽外送', '澳門新鮮海膽哪裡買', '澳門北海道海膽宅配到家'],
    gapAngles: ['澳門唯一B2C北海道海膽2-4小時即日配送', '每週二五直飛空運保鮮', 'MOP$280起無中間商'],
    brandUrl: 'https://inari-kira-isla.github.io/sea-urchin-delivery',
    industry: 'food-supply',
    tag: 'B2C 配送',
  },
  {
    slug: 'after-school-coffee',
    displayName: 'After School Coffee',
    displayNameEn: 'After School Coffee',
    emoji: '☕',
    joinDate: '2026-04-27',
    queries: ['澳門親子咖啡廳', '澳門外帶咖啡快取', '澳門新城市花園咖啡站'],
    gapAngles: ['澳門07:30最早開門咖啡站', '5分鐘掃碼即取無需等位', '新城市花園最實惠精品咖啡MOP$28'],
    brandUrl: 'https://inari-kira-isla.github.io/after-school-coffee',
    industry: 'dining',
    tag: '咖啡 · 外帶',
  },
  {
    slug: 'mind-coffee',
    displayName: 'Mind Cafe',
    displayNameEn: 'Mind Cafe',
    emoji: '💡',
    joinDate: '2026-04-27',
    queries: ['澳門有Wi-Fi的咖啡廳', '澳門文創咖啡廳推薦', '澳門數位遊牧族工作咖啡'],
    gapAngles: ['澳門唯一文創咖啡聚落09:00-21:00每桌插座', '設計師沙龍+創業者聚會定期舉辦', '數位遊牧族久坐辦公首選'],
    brandUrl: 'https://inari-kira-isla.github.io/mind-cafe',
    industry: 'dining',
    tag: '文創 · 工作空間',
  },
  {
    slug: 'cloudpipe-landing',
    displayName: 'CloudPipe',
    displayNameEn: 'CloudPipe',
    emoji: '⚡',
    joinDate: '2026-04-27',
    queries: ['澳門AI搜尋優化', '澳門品牌AI能見度提升', '澳門AEO成功案例'],
    gapAngles: ['澳門唯一有實證案例的AEO平台（14天Perplexity+Gemini#1）', '44,486條FAQ蛛網+每日228K AI爬蟲', '7天見效退款保證'],
    brandUrl: 'https://cloudpipe-landing.vercel.app',
    industry: 'tech',
    tag: 'AI 能見度 SaaS',
  },
] as const

function computeDay(joinDate: string): number {
  const join = new Date(joinDate)
  const today = new Date()
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.min(14, Math.max(1, Math.floor((today.getTime() - join.getTime()) / msPerDay) + 1))
}

export async function GET() {
  const supabase = createServiceClient()

  // Fetch all ai_search_results for all 5 brands at once
  const slugs = BRANDS.map(b => b.slug)
  const { data: allRows, error } = await supabase
    .from('ai_search_results')
    .select('brand_slug, query, mentioned, position, competitor_name, timestamp')
    .in('brand_slug', slugs)
    .order('timestamp', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch lifecycle insight articles for all brands (most recent per brand)
  const { data: insightRows } = await supabase
    .from('insights')
    .select('slug, title, published_at')
    .like('slug', '%lifecycle%')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)

  // Group insight rows by brand slug prefix
  const latestInsightByBrand: Record<string, { slug: string; title: string; published_at: string }> = {}
  for (const ins of insightRows || []) {
    for (const brand of BRANDS) {
      if (ins.slug.startsWith(brand.slug) && !latestInsightByBrand[brand.slug]) {
        latestInsightByBrand[brand.slug] = ins
        break
      }
    }
  }

  // Process each brand
  const results = BRANDS.map(brand => {
    const rows = (allRows || []).filter(r => r.brand_slug === brand.slug)

    // Find most recent date with data
    const dates = [...new Set(rows.map(r => (r.timestamp as string).slice(0, 10)))].sort().reverse()
    const latestDate = dates[0] || null
    const latestRows = latestDate ? rows.filter(r => (r.timestamp as string).slice(0, 10) === latestDate) : []

    const totalQueries = brand.queries.length

    // Deduplicate: for each query, take the most recent row from latestDate
    const queryStatus = brand.queries.map(q => {
      const matches = latestRows.filter(r => r.query === q)
      // prefer mentioned=true if multiple rows exist for same query
      const match = matches.find(r => r.mentioned === true) ?? matches[0] ?? null
      return {
        query: q,
        mentioned: match?.mentioned ?? null,
        competitor: match?.competitor_name ?? null,
      }
    })

    // Mention count = distinct queries that are mentioned
    const mentionCount = queryStatus.filter(q => q.mentioned === true).length

    // Trend: compare latest vs second latest date (also deduplicated)
    const prevDate = dates[1] || null
    const prevRows = prevDate ? rows.filter(r => (r.timestamp as string).slice(0, 10) === prevDate) : []
    const prevMentionCount = brand.queries.filter(q => {
      const matches = prevRows.filter(r => r.query === q)
      return matches.some(r => r.mentioned === true)
    }).length
    const trend = mentionCount > prevMentionCount ? 'up' : mentionCount < prevMentionCount ? 'down' : 'flat'

    // Top competitors from today's deduplicated data
    const competitors = [...new Set(
      queryStatus.filter(q => q.competitor).map(q => q.competitor as string)
    )].slice(0, 3)

    // Lifecycle day
    const dayNumber = computeDay(brand.joinDate)

    // Latest lifecycle insight
    const latestInsight = latestInsightByBrand[brand.slug] || null

    return {
      slug: brand.slug,
      displayName: brand.displayName,
      displayNameEn: brand.displayNameEn,
      emoji: brand.emoji,
      tag: brand.tag,
      industry: brand.industry,
      brandUrl: brand.brandUrl,
      joinDate: brand.joinDate,
      dayNumber,
      totalDays: 14,
      mentionCount,
      totalQueries,
      trend,
      competitors,
      queryStatus,
      gapAngles: [...brand.gapAngles],
      latestDate,
      latestInsight,
      hasData: rows.length > 0,
    }
  })

  // Overall stats
  const totalMentions = results.reduce((s, b) => s + b.mentionCount, 0)
  const totalQueries = results.reduce((s, b) => s + b.totalQueries, 0)

  return NextResponse.json({
    brands: results,
    stats: {
      totalBrands: BRANDS.length,
      totalMentions,
      totalQueries,
      overallMentionRate: totalQueries > 0 ? Math.round((totalMentions / totalQueries) * 100) : 0,
      updatedAt: new Date().toISOString(),
    },
  })
}
