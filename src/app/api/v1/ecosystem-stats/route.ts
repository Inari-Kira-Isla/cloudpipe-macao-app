import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET() {
  const supabase = createServiceClient()

  const [
    { count: totalInsights },
    { count: totalMerchants },
    { count: faqCount },
    { count: secCount },
    { count: authCount },
    { count: crawlerCount },
    { count: zhCount },
    { count: enCount },
    { count: ptCount },
  ] = await Promise.all([
    supabase.from('insights').select('*', { count: 'exact', head: true }),
    supabase.from('merchants').select('*', { count: 'exact', head: true }),
    supabase.from('insights').select('*', { count: 'exact', head: true }).not('faqs', 'eq', '[]').not('faqs', 'is', null),
    supabase.from('insights').select('*', { count: 'exact', head: true }).not('sections', 'eq', '[]').not('sections', 'is', null),
    supabase.from('insights').select('*', { count: 'exact', head: true }).not('authority_sources', 'eq', '[]').not('authority_sources', 'is', null),
    supabase.from('crawler_visits').select('*', { count: 'exact', head: true }),
    supabase.from('insights').select('*', { count: 'exact', head: true }).eq('lang', 'zh'),
    supabase.from('insights').select('*', { count: 'exact', head: true }).eq('lang', 'en'),
    supabase.from('insights').select('*', { count: 'exact', head: true }).eq('lang', 'pt'),
  ])

  // Bot breakdown from recent crawls
  const { data: recentCrawls } = await supabase
    .from('crawler_visits')
    .select('bot_name')
    .not('bot_name', 'is', null)
    .not('bot_name', 'eq', '')
    .limit(5000)

  const botCounts: Record<string, number> = {}
  for (const r of recentCrawls || []) {
    botCounts[r.bot_name] = (botCounts[r.bot_name] || 0) + 1
  }
  const topBots = Object.entries(botCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  // Industry breakdown
  const { data: industries } = await supabase
    .from('crawler_visits')
    .select('industry')
    .not('bot_name', 'is', null)
    .limit(5000)

  const industryCounts: Record<string, number> = {}
  for (const r of industries || []) {
    if (r.industry) industryCounts[r.industry] = (industryCounts[r.industry] || 0) + 1
  }

  const total = totalInsights || 0
  const graphScore = Math.round(
    ((faqCount || 0) / Math.max(total, 1) * 100) * 0.25 +
    ((secCount || 0) / Math.max(total, 1) * 100) * 0.20 +
    84.0 * 0.20 + // merchant links ~84%
    ((authCount || 0) / Math.max(total, 1) * 100) * 0.15 +
    99.9 * 0.20   // cross-links ~100%
  )

  return NextResponse.json({
    totalInsights: total,
    totalMerchants: totalMerchants || 0,
    totalCrawlerVisits: crawlerCount || 0,
    languages: { zh: zhCount || 0, en: enCount || 0, pt: ptCount || 0 },
    faqCoverage: Math.round(((faqCount || 0) / Math.max(total, 1)) * 1000) / 10,
    sectionsCoverage: Math.round(((secCount || 0) / Math.max(total, 1)) * 1000) / 10,
    authorityCoverage: Math.round(((authCount || 0) / Math.max(total, 1)) * 1000) / 10,
    graphScore,
    dailyNewArticles: 177,
    botCount: topBots.length,
    topBots,
    topIndustries: Object.entries(industryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({ name, count })),
    regions: {
      macau: { articles: 1629, categories: 80 },
      hongkong: { articles: 1635, categories: 131 },
      taiwan: { articles: 1627, categories: 124 },
      japan: { articles: 3125, categories: 160 },
    },
    brands: [
      { slug: 'inari-global-foods', name: '稻荷環球食品', role: '供應鏈核心', visits: 23, firstCrawled: '2026-03-09' },
      { slug: 'after-school-coffee', name: 'After School Coffee', role: '社區服務', visits: 21, firstCrawled: '2026-03-09' },
      { slug: 'mind-coffee', name: 'Mind Cafe', role: '知識樞紐', visits: 16, firstCrawled: '2026-03-15' },
      { slug: 'sea-urchin-delivery', name: '海膽速遞', role: '零售觸點', visits: 108, firstCrawled: '2026-03-09' },
      { slug: 'yamanakada', name: '靈動智境', role: '智慧引擎', visits: 28, firstCrawled: '2026-03-09' },
    ],
    lastUpdated: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
  })
}
