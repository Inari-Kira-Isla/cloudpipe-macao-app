import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getBrandConfig } from '@/lib/brandPortalConfig'

export const dynamic = 'force-dynamic'

interface TrendPoint {
  date: string
  day: number
  mentionCount: number
  totalChecks: number
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const config = getBrandConfig(slug)
  if (!config) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const supabase = createServiceClient()
  const joinDate = new Date(config.joinDate)
  const today = new Date()
  const msPerDay = 86_400_000
  const dayNumber = Math.max(1, Math.floor((today.getTime() - joinDate.getTime()) / msPerDay) + 1)

  // Fetch all ai_search_results for this brand
  const { data: searchRows } = await supabase
    .from('ai_search_results')
    .select('timestamp, mentioned, query, platform, competitor_name')
    .eq('brand_slug', slug)
    .order('timestamp', { ascending: true })

  // Fetch AEO actions
  const { data: actionRows } = await supabase
    .from('brand_aeo_actions')
    .select('title, status, priority, completed_at, direction')
    .eq('brand_slug', slug)
    .order('completed_at', { ascending: false })

  // Fetch brand portal images
  const { data: imageRows } = await supabase
    .from('brand_portal_images')
    .select('id, category, image_url, caption, platform, sort_order, created_at')
    .eq('brand_slug', slug)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  // Fetch crawler visits (last 24h)
  const since24h = new Date(Date.now() - 86_400_000).toISOString()
  const { data: crawlerRows } = await supabase
    .from('crawler_visits')
    .select('bot_name')
    .eq('site', slug)
    .gte('ts', since24h)

  // Build daily trend from ai_search_results
  const byDate = new Map<string, { mentioned: number; total: number }>()
  for (const row of searchRows || []) {
    const date = (row.timestamp as string).slice(0, 10)
    const cur = byDate.get(date) ?? { mentioned: 0, total: 0 }
    cur.total++
    if (row.mentioned) cur.mentioned++
    byDate.set(date, cur)
  }

  const trend: TrendPoint[] = Array.from(byDate.entries())
    .map(([date, { mentioned, total }]) => ({
      date,
      day: Math.max(1, Math.floor((new Date(date).getTime() - joinDate.getTime()) / msPerDay) + 1),
      mentionCount: mentioned,
      totalChecks: total,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // AEO actions summary
  const done = (actionRows || []).filter(r => r.status === 'done').length
  const total = (actionRows || []).length
  const recentActions = (actionRows || []).slice(0, 6).map(r => ({
    title: r.title,
    status: r.status as 'done' | 'pending' | 'in_progress',
    priority: r.priority,
    completedAt: r.completed_at ? (r.completed_at as string).slice(0, 10) : null,
  }))

  // Crawler breakdown
  const crawlerBreakdown: Record<string, number> = {}
  for (const r of crawlerRows || []) {
    const bot = (r.bot_name as string) || 'Unknown'
    crawlerBreakdown[bot] = (crawlerBreakdown[bot] ?? 0) + 1
  }

  // Get competitor mentions from recent records
  const competitorCounts: Record<string, number> = {}
  for (const row of searchRows || []) {
    const c = row.competitor_name as string | null
    if (c && c !== slug) {
      competitorCounts[c] = (competitorCounts[c] ?? 0) + 1
    }
  }
  const topCompetitors = Object.entries(competitorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name)

  // Group images by category
  const images = {
    ai_citation: (imageRows || []).filter(r => r.category === 'ai_citation'),
    aeo_action:  (imageRows || []).filter(r => r.category === 'aeo_action'),
    performance: (imageRows || []).filter(r => r.category === 'performance'),
  }

  return NextResponse.json({
    slug,
    name: config.name,
    nameEn: config.nameEn,
    industry: config.industry,
    joinDate: config.joinDate,
    dayNumber,
    engines: config.engines,
    gaps: config.gaps,
    trend,
    aeo: { done, total, recentActions },
    crawlerBreakdown,
    crawlerTotal: (crawlerRows || []).length,
    topCompetitors,
    images,
  })
}
