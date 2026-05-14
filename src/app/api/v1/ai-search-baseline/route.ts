import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { BRAND_CONFIGS } from '@/lib/brand-visibility'
import { calculateRankScore, calculateMarketShare } from '@/lib/ai-search-baseline'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  const action = request.nextUrl.searchParams.get('action') || 'get'

  if (!slug || !BRAND_CONFIGS[slug]) {
    return NextResponse.json({ error: 'Invalid brand slug' }, { status: 400 })
  }

  const brand = BRAND_CONFIGS[slug]
  const supabase = createServiceClient()

  if (action === 'trigger') {
    return NextResponse.json({
      status: 'queued',
      message: `Search baseline for ${brand.displayName} queued for collection`,
      info: 'Run manual search collection job to populate data',
    })
  }

  const { data: results } = await supabase
    .from('ai_search_results')
    .select('*')
    .eq('brand_slug', slug)
    .order('timestamp', { ascending: false })
    .limit(100)

  if (!results || results.length === 0) {
    return NextResponse.json({
      brand: brand.displayName,
      slug,
      status: 'no_data',
      message: 'No search baseline data collected yet',
      mockData: generateMockSearchData(brand),
    })
  }

  const aggregated = aggregateSearchResults(results, brand)
  return NextResponse.json(aggregated)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { slug, platform, query, results } = body

  if (!slug || !BRAND_CONFIGS[slug]) {
    return NextResponse.json({ error: 'Invalid brand slug' }, { status: 400 })
  }

  const brand = BRAND_CONFIGS[slug]
  const supabase = createServiceClient()

  const saveData = results.map((result: any) => ({
    brand_slug: slug,
    brand_name: brand.displayName,
    platform,
    query,
    competitor_name: result.name,
    position: result.position,
    mentioned: result.mentioned,
    citation_count: result.citationCount || 0,
    timestamp: new Date().toISOString(),
  }))

  const { error } = await supabase.from('ai_search_results').insert(saveData)

  if (error) {
    console.error('Error saving search results:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    status: 'saved',
    count: saveData.length,
    message: `Saved ${saveData.length} search results for ${brand.displayName}`,
  })
}

function aggregateSearchResults(results: any[], brand: any) {
  const competitorMap = new Map<string, any>()

  for (const result of results) {
    const name = result.competitor_name
    if (!competitorMap.has(name)) {
      competitorMap.set(name, { name, platforms: {} })
    }
    const competitor = competitorMap.get(name)
    if (!competitor.platforms[result.platform]) {
      competitor.platforms[result.platform] = {
        position: result.position,
        mentioned: result.mentioned,
        citationCount: result.citation_count,
      }
    }
  }

  const competitorStats = Array.from(competitorMap.values()).map((comp: any) => {
    const platformScores = Object.values(comp.platforms).map((p: any) =>
      calculateRankScore(p.position)
    )
    const avgScore = Math.round(
      platformScores.reduce((a: number, b: number) => a + b, 0) / platformScores.length
    )
    return {
      name: comp.name,
      platforms: comp.platforms,
      averageScore: avgScore,
      visibility: ('high' as 'high' | 'medium' | 'low'),
    }
  })

  const allScores = competitorStats.map(c => c.averageScore)
  const brandScore = 100
  allScores.unshift(brandScore)

  return {
    brand: brand.displayName,
    slug: brand.slug,
    lastUpdated: results[0]?.timestamp,
    brandBaselineScore: 100,
    competitors: competitorStats.map((comp: any) => ({
      ...comp,
      marketShare: calculateMarketShare(comp.averageScore, allScores),
    })),
    platformCoverage: [...new Set(results.map(r => r.platform))],
  }
}

function generateMockSearchData(brand: any) {
  const mockCompetitors = brand.competitors || []
  return {
    brand: brand.displayName,
    mockData: {
      gemini: mockCompetitors.map((comp: any, idx: number) => ({ name: comp.name, position: idx + 1, score: 100 - idx * 15 })),
      gpt: mockCompetitors.map((comp: any, idx: number) => ({ name: comp.name, position: idx + 2, score: 90 - idx * 15 })),
      perplexity: mockCompetitors.map((comp: any, idx: number) => ({ name: comp.name, position: idx + 1, score: 95 - idx * 15 })),
      claude: mockCompetitors.map((comp: any, idx: number) => ({ name: comp.name, position: idx + 3, score: 85 - idx * 15 })),
    },
  }
}
