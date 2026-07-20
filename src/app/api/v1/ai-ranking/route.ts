import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET /api/v1/ai-ranking?days=30&brand=all
// Aggregates ai_citations table for the crawler dashboard AI Ranking panel.
// Returns: platform breakdown, brand citation rates, top queries, recent runs.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const days = parseInt(searchParams.get('days') || '30', 10)
  const brandSlug = searchParams.get('brand') || 'all'

  const since = new Date(Date.now() - days * 86400 * 1000).toISOString()

  try {
    const supabase = createServiceClient()

    let query = supabase
      .from('ai_citations')
      .select('platform, cloudpipe_count, query_text, brand_slug, query_category, query_region, created_at, cited_urls, cloudpipe_urls, mentioned_entities')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (brandSlug !== 'all') {
      query = query.eq('brand_slug', brandSlug)
    }

    const { data: rows, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const citations = rows || []

    // ── Platform breakdown ────────────────────────────────────────────────────
    const platformMap: Record<string, { queries: number; cited: number; total_cloudpipe: number }> = {}
    for (const row of citations) {
      const p = row.platform || 'unknown'
      if (!platformMap[p]) platformMap[p] = { queries: 0, cited: 0, total_cloudpipe: 0 }
      platformMap[p].queries++
      if ((row.cloudpipe_count || 0) > 0) platformMap[p].cited++
      platformMap[p].total_cloudpipe += row.cloudpipe_count || 0
    }

    const platforms = Object.entries(platformMap)
      .map(([name, d]) => ({
        name,
        queries: d.queries,
        cited: d.cited,
        citation_rate: d.queries > 0 ? Math.round((d.cited / d.queries) * 100) : 0,
        total_cloudpipe: d.total_cloudpipe,
      }))
      .sort((a, b) => b.citation_rate - a.citation_rate)

    // ── Brand breakdown ───────────────────────────────────────────────────────
    const brandMap: Record<string, { queries: number; cited: number }> = {}
    for (const row of citations) {
      const b = row.brand_slug || 'unknown'
      if (!brandMap[b]) brandMap[b] = { queries: 0, cited: 0 }
      brandMap[b].queries++
      if ((row.cloudpipe_count || 0) > 0) brandMap[b].cited++
    }

    const brands = Object.entries(brandMap)
      .map(([slug, d]) => ({
        slug,
        queries: d.queries,
        cited: d.cited,
        citation_rate: d.queries > 0 ? Math.round((d.cited / d.queries) * 100) : 0,
      }))
      .sort((a, b) => b.cited - a.cited)

    // ── Top performing queries ─────────────────────────────────────────────────
    const queryMap: Record<string, { platforms: Set<string>; cited: number; total: number }> = {}
    for (const row of citations) {
      const q = row.query_text || ''
      if (!q) continue
      if (!queryMap[q]) queryMap[q] = { platforms: new Set(), cited: 0, total: 0 }
      if (row.platform) queryMap[q].platforms.add(row.platform)
      queryMap[q].total++
      if ((row.cloudpipe_count || 0) > 0) queryMap[q].cited++
    }

    const top_queries = Object.entries(queryMap)
      .map(([text, d]) => ({
        text,
        platforms: Array.from(d.platforms),
        cited: d.cited,
        total: d.total,
        citation_rate: d.total > 0 ? Math.round((d.cited / d.total) * 100) : 0,
      }))
      .sort((a, b) => b.cited - a.cited)
      .slice(0, 15)

    // ── Summary ────────────────────────────────────────────────────────────────
    const totalQueries = citations.length
    const citedQueries = citations.filter(r => (r.cloudpipe_count || 0) > 0).length
    const uniqueQueries = new Set(citations.map(r => r.query_text).filter(Boolean)).size

    // ── Recent runs (last 10 distinct run results) ─────────────────────────────
    const recent = citations.slice(0, 10).map(r => ({
      platform: r.platform,
      brand_slug: r.brand_slug,
      query_text: r.query_text,
      cloudpipe_count: r.cloudpipe_count,
      cited: (r.cloudpipe_count || 0) > 0,
      created_at: r.created_at,
    }))

    return NextResponse.json({
      days,
      brand: brandSlug,
      summary: {
        total_queries: totalQueries,
        cited_queries: citedQueries,
        unique_queries: uniqueQueries,
        overall_citation_rate: totalQueries > 0 ? Math.round((citedQueries / totalQueries) * 100) : 0,
        platform_count: platforms.length,
      },
      platforms,
      brands,
      top_queries,
      recent,
      generated_at: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
