import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const revalidate = 60 // 1 min cache for real-time feel

export async function GET() {
  try {
    const supabase = createServiceClient()

    // Fetch recent citations with all fields needed for dashboard
    const { data: citations, error } = await supabase
      .from('ai_citations')
      .select(`
        id,
        created_at,
        query_text,
        query_category,
        query_region,
        platform,
        platform_model,
        cloudpipe_count,
        cloudpipe_urls,
        mentioned_entities,
        brand_slug,
        snapshot_label,
        run_id
      `)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      console.error('Failed to fetch citations:', error)
      return NextResponse.json({ error: 'Failed to fetch citation data' }, { status: 500 })
    }

    const allCitations = citations || []

    // Platform breakdown
    const platformStats: Record<string, { total: number; cited: number; runs: Set<string> }> = {}
    for (const row of allCitations) {
      const platform = row.platform || 'unknown'
      if (!platformStats[platform]) {
        platformStats[platform] = { total: 0, cited: 0, runs: new Set() }
      }
      platformStats[platform].total += 1
      if (row.cloudpipe_count > 0) {
        platformStats[platform].cited += 1
      }
      if (row.run_id) {
        platformStats[platform].runs.add(row.run_id)
      }
    }

    // Convert Sets to counts for JSON
    const platformBreakdown: Record<string, { total: number; cited: number; citedRate: number; runs: number }> = {}
    for (const [platform, stats] of Object.entries(platformStats)) {
      platformBreakdown[platform] = {
        total: stats.total,
        cited: stats.cited,
        citedRate: stats.total > 0 ? Math.round((stats.cited / stats.total) * 100) : 0,
        runs: stats.runs.size,
      }
    }

    // Category breakdown
    const categoryStats: Record<string, { total: number; cited: number }> = {}
    for (const row of allCitations) {
      const cat = row.query_category || 'uncategorized'
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, cited: 0 }
      }
      categoryStats[cat].total += 1
      if (row.cloudpipe_count > 0) {
        categoryStats[cat].cited += 1
      }
    }

    // Recent runs with timestamps
    const runsMap: Record<string, { latest: string; platforms: string[]; total: number; cited: number }> = {}
    for (const row of allCitations) {
      if (!row.run_id) continue
      if (!runsMap[row.run_id]) {
        runsMap[row.run_id] = {
          latest: row.created_at,
          platforms: [],
          total: 0,
          cited: 0,
        }
      }
      if (!runsMap[row.run_id].platforms.includes(row.platform || '')) {
        runsMap[row.run_id].platforms.push(row.platform || '')
      }
      runsMap[row.run_id].total += 1
      if (row.cloudpipe_count > 0) {
        runsMap[row.run_id].cited += 1
      }
      if (row.created_at > runsMap[row.run_id].latest) {
        runsMap[row.run_id].latest = row.created_at
      }
    }

    // Convert runsMap to sorted array
    const recentRuns = Object.entries(runsMap)
      .map(([runId, data]) => ({
        runId,
        ...data,
        citedRate: data.total > 0 ? Math.round((data.cited / data.total) * 100) : 0,
      }))
      .sort((a, b) => new Date(b.latest).getTime() - new Date(a.latest).getTime())
      .slice(0, 10)

    // Weekly trend (last 7 days)
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000)

    const thisWeek = allCitations.filter(r => r.created_at && new Date(r.created_at) >= sevenDaysAgo)
    const lastWeek = allCitations.filter(r => 
      r.created_at && new Date(r.created_at) >= fourteenDaysAgo && new Date(r.created_at) < sevenDaysAgo
    )

    const thisWeekCited = thisWeek.filter(r => r.cloudpipe_count > 0).length
    const lastWeekCited = lastWeek.filter(r => r.cloudpipe_count > 0).length

    const trendChange = lastWeekCited > 0 
      ? Math.round(((thisWeekCited - lastWeekCited) / lastWeekCited) * 100)
      : (thisWeekCited > 0 ? 100 : 0)

    // Get unique queries
    const uniqueQueries = Array.from(
      new Set(allCitations.map(r => r.query_text).filter(Boolean) as string[])
    ).slice(0, 20)

    // Total stats
    const totalCitations = allCitations.length
    const totalCited = allCitations.filter(r => r.cloudpipe_count > 0).length
    const totalCloudpipeUrls = allCitations.reduce((sum, r) => sum + (r.cloudpipe_count || 0), 0)

    // Sample recent citations
    const recentSamples = allCitations.slice(0, 20).map(r => ({
      id: r.id,
      query: r.query_text,
      platform: r.platform,
      cloudpipeCount: r.cloudpipe_count,
      cited: r.cloudpipe_count > 0,
      createdAt: r.created_at,
    }))

    return NextResponse.json({
      summary: {
        totalCitations,
        totalCited,
        totalCloudpipeUrls,
        citedRate: totalCitations > 0 ? Math.round((totalCited / totalCitations) * 100) : 0,
      },
      platformBreakdown,
      categoryStats,
      recentRuns,
      trend: {
        thisWeek: thisWeekCited,
        lastWeek: lastWeekCited,
        change: trendChange,
      },
      uniqueQueries,
      recentSamples,
      lastUpdated: now.toISOString(),
    })
  } catch (err) {
    console.error('AI citations dashboard error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
