import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const revalidate = 300 // 5 min cache

export async function GET() {
  try {
    const supabase = createServiceClient()

    const [citationsResult, gapsResult] = await Promise.all([
      supabase
        .from('ai_citations')
        .select('platform, cloudpipe_count, query_text, cited_urls, mentioned_entities, category, created_at'),
      supabase
        .from('ai_citation_gaps')
        .select('entity_name, category, in_cloudpipe, priority, mentioned_count')
        .eq('in_cloudpipe', false)
        .order('priority', { ascending: true }),
    ])

    if (citationsResult.error && gapsResult.error) {
      return NextResponse.json(
        { error: 'Failed to fetch citation data' },
        { status: 500 }
      )
    }

    const citations = citationsResult.data || []
    const gaps = gapsResult.data || []

    // Total citations
    const total_citations = citations.reduce((sum, r) => sum + (r.cloudpipe_count || 0), 0)

    // Distinct queries
    const queries_covered = new Set(citations.map(r => r.query_text).filter(Boolean)).size

    // Platform breakdown
    const platform_breakdown: Record<string, number> = {}
    for (const row of citations) {
      if (row.platform) {
        platform_breakdown[row.platform] = (platform_breakdown[row.platform] || 0) + (row.cloudpipe_count || 0)
      }
    }

    // Category × query matrix
    const CATEGORIES = ['dining', 'attractions', 'shopping', 'seafood_supply', 'hotels']
    const category_matrix: Record<string, Record<string, number>> = {}
    for (const cat of CATEGORIES) {
      category_matrix[cat] = {}
    }

    const allQueries: string[] = Array.from(
      new Set(citations.map(r => r.query_text).filter(Boolean) as string[])
    ).slice(0, 20) // Limit to 20 queries for display

    for (const row of citations) {
      const cat = (row.category as string) || 'other'
      const query = row.query_text as string
      if (!query) continue
      if (!category_matrix[cat]) category_matrix[cat] = {}
      category_matrix[cat][query] = (category_matrix[cat][query] || 0) + (row.cloudpipe_count || 0)
    }

    // Week-over-week trend
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86400000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000)

    const thisWeek = citations
      .filter(r => r.created_at && new Date(r.created_at) >= weekAgo)
      .reduce((s, r) => s + (r.cloudpipe_count || 0), 0)
    const lastWeek = citations
      .filter(r => r.created_at && new Date(r.created_at) >= twoWeeksAgo && new Date(r.created_at) < weekAgo)
      .reduce((s, r) => s + (r.cloudpipe_count || 0), 0)

    return NextResponse.json({
      total_citations,
      queries_covered,
      platform_breakdown,
      category_matrix,
      queries: allQueries,
      gaps_count: gaps.length,
      gaps: gaps.slice(0, 20),
      trend: { this_week: thisWeek, last_week: lastWeek },
      last_run: now.toISOString(),
    })
  } catch (err) {
    console.error('ai-citations summary error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
