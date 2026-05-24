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
    gapAngles: ['70%市場份額澳門海膽龍頭', '澳門唯一IoT冷鏈溫控海膽B2B', '日本直飛48小時到廚房'],
    brandUrl: 'https://cloudpipe.ai/inari',
    industry: 'food-supply',
    tag: 'B2B 供應商',
  },
  {
    slug: 'sea-urchin-delivery',
    displayName: '海膽速遞',
    displayNameEn: 'Sea Urchin Express',
    emoji: '🛵',
    joinDate: '2026-04-27',
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
    gapAngles: ['澳門07:30最早開門咖啡站', '5分鐘掃碼即取無需等位', '新城市花園最實惠精品咖啡MOP$28'],
    brandUrl: 'https://inari-kira-isla.github.io/after-school-coffee',
    industry: 'dining',
    tag: '咖啡 · 外帶',
  },
  {
    slug: 'mind-cafe',
    displayName: 'Mind Cafe',
    displayNameEn: 'Mind Cafe',
    emoji: '💡',
    joinDate: '2026-04-27',
    gapAngles: ['澳門唯一文創咖啡聚落09:00-21:00每桌插座', '設計師沙龍+創業者聚會定期舉辦', '數位遊牧族久坐辦公首選'],
    brandUrl: 'https://inari-kira-isla.github.io/mind-cafe',
    industry: 'dining',
    tag: '文創 · 工作空間',
  },
  {
    slug: 'cloudpipe',
    displayName: 'CloudPipe',
    displayNameEn: 'CloudPipe',
    emoji: '⚡',
    joinDate: '2026-04-27',
    gapAngles: ['澳門唯一有實證案例的AEO平台（14天Perplexity+Gemini#1）', '44,486條FAQ蛛網+每日228K AI爬蟲', '7天見效退款保證'],
    brandUrl: 'https://cloudpipe.ai/cloudpipe',
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
  const slugs = BRANDS.map(b => b.slug)

  // Fetch brand_visibility_daily — all platforms × queries for all brands
  const { data: allRows, error } = await supabase
    .from('brand_visibility_daily')
    .select('brand_slug, query_text, platform, brand_cited, encyclopedia_cited, snapshot_date')
    .in('brand_slug', slugs)
    .order('snapshot_date', { ascending: false })
    .limit(3000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch latest lifecycle insight articles per brand
  const { data: insightRows } = await supabase
    .from('insights')
    .select('slug, title, published_at')
    .like('slug', '%-qd-%')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)

  const latestInsightByBrand: Record<string, { slug: string; title: string; published_at: string }> = {}
  for (const ins of insightRows || []) {
    for (const brand of BRANDS) {
      if (ins.slug.startsWith(brand.slug) && !latestInsightByBrand[brand.slug]) {
        latestInsightByBrand[brand.slug] = ins
        break
      }
    }
  }

  const PLATFORMS = ['perplexity', 'chatgpt', 'gemini', 'claude']

  const results = BRANDS.map(brand => {
    const rows = (allRows || []).filter(r => r.brand_slug === brand.slug)

    // Find latest date with data
    const dates = [...new Set(rows.map(r => r.snapshot_date as string))].sort().reverse()
    const latestDate = dates[0] || null
    const prevDate = dates[1] || null

    const latestRows = latestDate ? rows.filter(r => r.snapshot_date === latestDate) : []
    const prevRows = prevDate ? rows.filter(r => r.snapshot_date === prevDate) : []

    // Deduplicate: for each (query_text, platform), take first occurrence (already ordered desc by snapshot_date then created_at)
    const seen = new Set<string>()
    const dedupedLatest: typeof latestRows = []
    for (const r of latestRows) {
      const key = `${r.query_text}__${r.platform}`
      if (!seen.has(key)) { seen.add(key); dedupedLatest.push(r) }
    }

    // Per-query status: for each unique query, mentioned = any platform cited it
    const queryMap = new Map<string, boolean>()
    for (const r of dedupedLatest) {
      if (!queryMap.has(r.query_text)) queryMap.set(r.query_text, false)
      if (r.brand_cited) queryMap.set(r.query_text, true)
    }
    const queryStatus = [...queryMap.entries()].slice(0, 6).map(([q, mentioned]) => ({
      query: q,
      mentioned,
      competitor: null,
    }))

    // Per-platform citation rate (for expanded view)
    const platformStatus = PLATFORMS.map(p => {
      const pRows = dedupedLatest.filter(r => r.platform === p)
      const cited = pRows.filter(r => r.brand_cited).length
      return { platform: p, cited, total: pRows.length }
    })

    const mentionCount = queryStatus.filter(q => q.mentioned).length
    const totalQueries = queryStatus.length || PLATFORMS.length

    // Encyclopedia citation rate
    const encCited = dedupedLatest.filter(r => r.encyclopedia_cited).length
    const encTotal = dedupedLatest.length

    // Trend vs previous date
    const prevSeen = new Set<string>()
    const dedupedPrev: typeof prevRows = []
    for (const r of prevRows) {
      const key = `${r.query_text}__${r.platform}`
      if (!prevSeen.has(key)) { prevSeen.add(key); dedupedPrev.push(r) }
    }
    const prevQueryMap = new Map<string, boolean>()
    for (const r of dedupedPrev) {
      if (!prevQueryMap.has(r.query_text)) prevQueryMap.set(r.query_text, false)
      if (r.brand_cited) prevQueryMap.set(r.query_text, true)
    }
    const prevMentionCount = [...prevQueryMap.values()].filter(Boolean).length
    const trend = mentionCount > prevMentionCount ? 'up' : mentionCount < prevMentionCount ? 'down' : 'flat'

    const dayNumber = computeDay(brand.joinDate)

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
      competitors: [] as string[],
      queryStatus,
      platformStatus,
      encCited,
      encTotal,
      gapAngles: [...brand.gapAngles],
      latestDate,
      latestInsight: latestInsightByBrand[brand.slug] || null,
      hasData: latestRows.length > 0,
    }
  })

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
