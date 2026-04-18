import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { BRAND_CONFIGS } from '@/lib/brand-visibility'

export const dynamic = 'force-dynamic'

// Citation test results are stored in local SQLite
// This API reads from Supabase crawler_visits for competitor comparison
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  const days = parseInt(request.nextUrl.searchParams.get('days') || '30')
  const includeAISearch = request.nextUrl.searchParams.get('includeAISearch') === 'true'

  if (!slug || !BRAND_CONFIGS[slug]) {
    return NextResponse.json({ error: 'Invalid brand slug' }, { status: 400 })
  }

  const brand = BRAND_CONFIGS[slug]
  const supabase = createServiceClient()

  // Get crawler visit counts for brand and defined competitors
  const brandVisits = await getCrawlCount(supabase, brand.merchantSlugs[0])

  let competitorData: any[] = []

  // 優先使用配置裡定義的競品
  if (brand.competitors && brand.competitors.length > 0) {
    for (const comp of brand.competitors) {
      // 嘗試從 merchants 表查詢，如果沒有就用 mock 數據
      const visits = await getCrawlCount(supabase, comp.name.toLowerCase())
      const mockVisits = generateMockVisits(comp.name)
      competitorData.push({
        slug: comp.name.toLowerCase(),
        name: comp.name,
        visits: visits || mockVisits,
        isMock: visits === 0,
      })
    }
  } else {
    // 回退：從 merchants 表查同行業競品
    const { data: competitors } = await supabase
      .from('merchants')
      .select('slug, name_zh, name_en, google_rating, google_reviews')
      .or(`category_slug.eq.${brand.category},industry_slug.eq.${brand.industry}`)
      .neq('slug', brand.merchantSlugs[0])
      .order('google_reviews', { ascending: false, nullsFirst: false })
      .limit(10)

    for (const comp of (competitors || []).slice(0, 6)) {
      const visits = await getCrawlCount(supabase, comp.slug)
      competitorData.push({
        slug: comp.slug,
        name: comp.name_zh || comp.name_en || comp.slug,
        visits,
        rating: comp.google_rating,
        reviews: comp.google_reviews,
      })
    }
  }

  // 如果啟用 AI 搜尋數據，加載排名信息
  let aiSearchData: any = null
  if (includeAISearch) {
    aiSearchData = await fetchAISearchData(supabase, slug, brand, competitorData)
  }

  // Sort by visits descending, insert brand
  const allEntries = [
    { slug: brand.merchantSlugs[0], name: brand.displayName, visits: brandVisits, isBrand: true },
    ...competitorData.map(c => ({ ...c, isBrand: false })),
  ].sort((a, b) => b.visits - a.visits)

  // Calculate percentages
  const totalVisits = allEntries.reduce((s, e) => s + e.visits, 0) || 1
  const ranked = allEntries.map((entry, i) => {
    const aiRanking = aiSearchData?.competitorRanks[entry.name]
    return {
      ...entry,
      rank: i + 1,
      percentage: Math.round((entry.visits / totalVisits) * 100),
      label: entry.isBrand ? '你的品牌' :
             i < 3 ? '主要競爭者' : '潛在競爭者',
      aiSearchRanking: aiRanking ? {
        avgRank: aiRanking.avgRank,
        mentioned: aiRanking.mentioned,
        totalCitations: aiRanking.totalCitations,
        platforms: aiRanking.platforms,
      } : null,
    }
  })

  return NextResponse.json({
    brand: brand.displayName,
    brandSlug: slug,
    brandRank: ranked.findIndex(r => r.isBrand) + 1,
    totalCompetitors: ranked.length,
    competitors: ranked,
    aiSearchData,
    brandPlatformRanking: aiSearchData?.brandPlatformRanking || null,
    period: { days },
  })
}

async function getCrawlCount(supabase: ReturnType<typeof createServiceClient>, merchantSlug: string): Promise<number> {
  const { count } = await supabase
    .from('crawler_visits')
    .select('*', { count: 'exact', head: true })
    .ilike('path', `%${merchantSlug}%`)
    .not('bot_name', 'is', null)

  return count || 0
}

/**
 * 從 AI 搜尋基線表獲取排名數據並進行關鍵詞分析
 */
async function fetchAISearchData(
  supabase: ReturnType<typeof createServiceClient>,
  slug: string,
  brand: any,
  competitors: any[]
): Promise<any> {
  const { data: allResults } = await supabase
    .from('ai_search_results')
    .select('*')
    .eq('brand_slug', slug)
    .order('timestamp', { ascending: false })
    .limit(500)

  if (!allResults || allResults.length === 0) {
    return null
  }

  // Split into current vs baseline snapshots
  const results = allResults.filter(r => !r.snapshot_label || r.snapshot_label === 'current')
  const baselineResults = allResults.filter(r => r.snapshot_label && r.snapshot_label.startsWith('W'))

  // Find all baseline snapshots (W0, W1, W4, etc.)
  const baselineLabels = [...new Set(baselineResults.map(r => r.snapshot_label))].sort()
  const latestBaseline = baselineLabels[0] || null  // earliest = W0

  // 聚合各競品在各平台的排名及關鍵詞
  const competitorRanks: Record<string, any> = {}
  const platforms = [...new Set(allResults.map(r => r.platform))] as string[]
  const queries = [...new Set(allResults.map(r => r.query))] as string[]

  // 構建平台-查詢-關鍵詞映射表（用於分析）
  const keywordMatrix: Record<string, Record<string, string[]>> = {}
  queries.forEach(q => {
    keywordMatrix[q] = {}
    platforms.forEach(p => {
      const queryResults = results.filter(r => r.query === q && r.platform === p)
      const allKeywords = queryResults
        .flatMap(r => r.keywords_extracted || [])
        .filter((k, i, arr) => arr.indexOf(k) === i) // 去重
      keywordMatrix[q][p] = allKeywords
    })
  })

  // 針對每個名字，計算最近的排名 (使用最新時間戳)
  for (const competitor of competitors) {
    const competitorResults = results.filter(r => r.competitor_name === competitor.name)
    if (competitorResults.length > 0) {
      // 按平台分組，取每個平台最新的排名
      const byPlatform: Record<string, any> = {}
      const latestTimestamp = results[0].timestamp

      for (const platform of platforms) {
        const platformResults = competitorResults
          .filter(r => r.platform === platform)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        if (platformResults.length > 0) {
          const latest = platformResults[0]
          byPlatform[platform] = {
            position: latest.position,
            mentioned: latest.mentioned,
            citationCount: latest.citation_count,
            query: latest.query,
            timestamp: latest.timestamp,
            keywords: latest.keywords_extracted || [],
          }
        }
      }

      // 計算加權平均排名（出現的平台排名越高，影響越大）
      const positions = Object.values(byPlatform)
        .filter((p: any) => p.position > 0)
        .map((p: any) => p.position)

      const avgPosition = positions.length > 0
        ? Math.round(positions.reduce((a: number, b: number) => a + b, 0) / positions.length)
        : 999

      // 匯總此競品在所有平台出現的關鍵詞
      const allCompetitorKeywords = new Set<string>()
      Object.values(byPlatform).forEach((p: any) => {
        (p.keywords || []).forEach((k: string) => allCompetitorKeywords.add(k))
      })

      competitorRanks[competitor.name] = {
        avgRank: avgPosition,
        platforms: byPlatform,
        mentioned: Object.values(byPlatform).some((p: any) => p.mentioned),
        totalCitations: Object.values(byPlatform).reduce((sum: number, p: any) => sum + (p.citationCount || 0), 0),
        keywords: Array.from(allCompetitorKeywords).slice(0, 10), // 前 10 個關鍵詞
      }
    }
  }

  // Build brand's own platform ranking from W0 baseline
  const brandW0: Record<string, { position: number; mentioned: boolean; keywords: string[] }> = {}
  if (latestBaseline) {
    const brandBaseline = baselineResults.filter(
      r => r.snapshot_label === latestBaseline && r.competitor_name === brand.displayName
    )
    for (const r of brandBaseline) {
      brandW0[r.platform] = {
        position: r.position,
        mentioned: r.mentioned,
        keywords: r.keywords_extracted || [],
      }
    }
  }

  // Current brand platform rankings (from 'current' snapshot)
  const brandCurrent: Record<string, { position: number; mentioned: boolean }> = {}
  const brandCurrentRows = results.filter(r => r.competitor_name === brand.displayName)
  for (const r of brandCurrentRows) {
    if (!brandCurrent[r.platform] || new Date(r.timestamp) > new Date(brandCurrent[r.platform] as any)) {
      brandCurrent[r.platform] = { position: r.position, mentioned: r.mentioned }
    }
  }

  return {
    lastUpdated: results[0]?.timestamp || allResults[0]?.timestamp,
    platforms,
    queries,
    competitorRanks,
    keywordAnalysis: keywordMatrix,
    brandPlatformRanking: {
      W0: brandW0,
      W0Label: latestBaseline,
      current: brandCurrent,
    },
  }
}

/**
 * 為沒有真實爬蟲數據的競品生成 mock 訪問數
 */
function generateMockVisits(competitorName: string): number {
  // 基於品牌名稱的偽隨機數，但保持一致性
  const hash = competitorName.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  return 5 + (hash % 30) // 5-35 之間
}
