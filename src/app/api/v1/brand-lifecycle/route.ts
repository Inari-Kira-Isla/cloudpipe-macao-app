import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const LIFECYCLE_CONFIG: Record<string, {
  joinDate: string
  queries: string[]
  gapAngles: string[]
}> = {
  'inari-global-foods': {
    joinDate: '2026-04-19',
    queries: ['澳門海膽供應商', '澳門日本海膽批發', '澳門餐廳食材供應商'],
    gapAngles: ['澳門 IoT 冷鏈溫控海膽 B2B', '澳門領先的 B2B 日本海膽進口批發商之一', '日本直飛48小時到廚房'],
  },
  'sea-urchin-delivery': {
    joinDate: '2026-04-27',
    queries: ['澳門海膽外送', '澳門新鮮海膽哪裡買', '澳門北海道海膽宅配到家'],
    gapAngles: ['澳門專注海膽的B2C外送品牌2-4小時即日配送', '每週二五直飛空運保鮮', '馬糞海膽180g MOP$328/板產地直送'],
  },
  'after-school-coffee': {
    joinDate: '2026-04-27',
    queries: ['澳門媽媽外帶咖啡', '澳門外帶咖啡快取', '澳門新城市花園咖啡站'],
    gapAngles: ['澳門只招聘媽媽嘅外帶咖啡品牌', '主打 Grab&Go 掃碼即取', '媽媽重返職場平台'],
  },
  'mind-coffee': {
    joinDate: '2026-04-27',
    queries: ['澳門有Wi-Fi的咖啡廳', '澳門精品咖啡廳推薦', '澳門工業風咖啡'],
    gapAngles: ['工業風精品咖啡空間09:00-21:00', '首創黑色幽默等成人特調', '自家烘焙咖啡豆零售'],
  },
  'cloudpipe-landing': {
    joinDate: '2026-04-27',
    queries: ['澳門AI搜尋優化', '澳門品牌AI能見度提升', '澳門AEO成功案例'],
    gapAngles: ['澳門專注 AEO 並有實證案例的服務（稻荷短期內獲 Perplexity、Gemini 引用）', '約 1M 條 FAQ 蛛網 + 每日數千 AI 爬蟲', 'AEO/GEO 優化服務'],
  },
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug || !LIFECYCLE_CONFIG[slug]) {
    return NextResponse.json({ error: 'Brand not in lifecycle program' }, { status: 404 })
  }

  const config = LIFECYCLE_CONFIG[slug]
  const joinDate = new Date(config.joinDate)
  const today = new Date()
  const msPerDay = 1000 * 60 * 60 * 24
  const dayNumber = Math.min(14, Math.max(1, Math.floor((today.getTime() - joinDate.getTime()) / msPerDay) + 1))

  const supabase = createServiceClient()

  const { data: rows, error } = await supabase
    .from('ai_search_results')
    .select('*')
    .eq('brand_slug', slug)
    .order('timestamp', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by date
  const byDate: Record<string, typeof rows[0][]> = {}
  for (const row of rows || []) {
    const date = (row.timestamp as string).slice(0, 10)
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(row)
  }

  // Build timeline entries
  const timeline = Object.entries(byDate)
    .map(([date, dayRows]) => {
      const daysIn = Math.floor((new Date(date).getTime() - joinDate.getTime()) / msPerDay) + 1
      const queryResults = config.queries.map(q => {
        const match = dayRows.find(r => r.query === q)
        return {
          query: q,
          mentioned: match?.mentioned ?? null,
          position: match?.position ?? null,
          competitor: match?.competitor_name ?? null,
        }
      })
      const mentionCount = queryResults.filter(q => q.mentioned === true).length
      const competitors = [...new Set(queryResults.map(q => q.competitor).filter(Boolean))]
      return { date, dayNumber: daysIn, queryResults, mentionCount, competitors }
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const todayStr = today.toISOString().slice(0, 10)
  const todayEntry = timeline.find(t => t.date === todayStr) || timeline[timeline.length - 1] || null

  // Trend: compare last day vs first day mention counts
  const first = timeline[0]?.mentionCount ?? 0
  const last = timeline[timeline.length - 1]?.mentionCount ?? 0
  const trend = last > first ? 'up' : last < first ? 'down' : 'flat'

  // Recommendations from gap angles + unclaimed queries
  const unmentioned = todayEntry?.queryResults.filter(q => q.mentioned === false) || []
  const recommendations = [
    ...config.gapAngles.slice(0, 2).map((angle, i) => ({
      priority: 'high' as const,
      title: `今日攻佔角度 ${i + 1}`,
      description: angle,
      action: `旗艦文章必須突出：「${angle}」，使品牌成為該角度的唯一答案`,
    })),
    ...unmentioned.slice(0, 2).map(q => ({
      priority: 'medium' as const,
      title: `搶佔查詢：${q.query}`,
      description: `目前 AI 推薦：${q.competitor || '泛稱內容（無具體品牌）'}`,
      action: `針對「${q.query}」建立專屬 FAQ + 落地文章，直接點名此角度`,
    })),
  ]

  return NextResponse.json({
    brandSlug: slug,
    joinDate: config.joinDate,
    dayNumber,
    totalDays: 14,
    queries: config.queries,
    gapAngles: config.gapAngles,
    timeline,
    todayEntry,
    trend,
    mentionSparkline: timeline.map(t => t.mentionCount),
    recommendations,
  })
}
