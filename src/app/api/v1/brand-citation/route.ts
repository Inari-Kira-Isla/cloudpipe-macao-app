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

  // FAQ occupation analysis
  let faqOccupation: any = null
  if (brand.merchantSlugs?.[0]) {
    const { data: merchantRow } = await supabase
      .from('merchants')
      .select('id')
      .eq('slug', brand.merchantSlugs[0])
      .single()

    if (merchantRow?.id) {
      const { data: faqs } = await supabase
        .from('merchant_faqs')
        .select('faq_type, lang, priority_score, citation_count, question_intent')
        .eq('merchant_id', merchantRow.id)

      if (faqs && faqs.length > 0) {
        const byType: Record<string, number> = {}
        const byLang: Record<string, number> = {}
        let totalCitations = 0
        let highPriority = 0

        for (const faq of faqs) {
          byType[faq.faq_type || 'unknown'] = (byType[faq.faq_type || 'unknown'] || 0) + 1
          byLang[faq.lang || 'zh'] = (byLang[faq.lang || 'zh'] || 0) + 1
          totalCitations += faq.citation_count || 0
          if ((faq.priority_score || 0) >= 9) highPriority++
        }

        faqOccupation = {
          total: faqs.length,
          byType,
          byLang,
          totalCitations,
          highPriorityCount: highPriority,
        }
      }
    }
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
    allCompetitorPlatformRanks: aiSearchData?.allCompetitorPlatformRanks || null,
    competitorW0Ranks: aiSearchData?.competitorW0Ranks || null,
    faqOccupation,
    searchTerms: brand.searchTerms || [],
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
 * W0 baseline: ai_search_results (W0-labelled rows, historical)
 * current:     brand_visibility_daily (live daily data, latest snapshot_date)
 */
async function fetchAISearchData(
  supabase: ReturnType<typeof createServiceClient>,
  slug: string,
  brand: any,
  competitors: any[]
): Promise<any> {
  // Fetch historical baseline from ai_search_results (W0 rows)
  const { data: allResults } = await supabase
    .from('ai_search_results')
    .select('*')
    .eq('brand_slug', slug)
    .order('timestamp', { ascending: false })
    .limit(500)

  // Fetch live current data from brand_visibility_daily
  const { data: liveRows } = await supabase
    .from('brand_visibility_daily')
    .select('snapshot_date, platform, query_text, brand_cited, rank_position')
    .eq('brand_slug', slug)
    .order('snapshot_date', { ascending: false })
    .limit(200)

  // If neither source has data, return null
  if ((!allResults || allResults.length === 0) && (!liveRows || liveRows.length === 0)) {
    return null
  }

  // Determine latest snapshot_date from live data
  const latestLiveDate = liveRows && liveRows.length > 0 ? liveRows[0].snapshot_date as string : null

  // Split into current vs baseline snapshots
  // T+7, T+14, D0 etc. are treated as "current" (more recent than W0 baseline)
  const safeAll = allResults || []
  const results = safeAll.filter(r =>
    !r.snapshot_label ||
    r.snapshot_label === 'current' ||
    /^T\+/.test(r.snapshot_label || '') ||
    /^D\d/.test(r.snapshot_label || '')
  )
  const baselineResults = safeAll.filter(r => r.snapshot_label && r.snapshot_label.startsWith('W'))

  // Find all baseline snapshots (W0, W1, W4, etc.)
  const baselineLabels = [...new Set(baselineResults.map(r => r.snapshot_label))].sort()
  const latestBaseline = baselineLabels[0] || null  // earliest = W0

  // Latest T+ snapshot label for display
  const tPlusLabels = [...new Set(results
    .filter(r => r.snapshot_label && /^T\+/.test(r.snapshot_label))
    .map(r => r.snapshot_label)
  )].sort().reverse()
  const latestTPlus = tPlusLabels[0] || null

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
      const latestTimestamp = results[0]?.timestamp

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

  // Brand name variants for matching (slug, displayName, displayNameEn)
  const brandNameVariants = new Set([
    brand.displayName,
    brand.displayNameEn,
    slug,
    brand.merchantSlugs?.[0],
  ].filter(Boolean))

  // Build brand's own platform ranking from W0 baseline
  const brandW0: Record<string, { position: number; mentioned: boolean; keywords: string[] }> = {}
  if (latestBaseline) {
    const brandBaseline = baselineResults.filter(
      r => r.snapshot_label === latestBaseline &&
        (brandNameVariants.has(r.competitor_name) || !r.competitor_name)
    )
    for (const r of brandBaseline) {
      if (!brandW0[r.platform]) {
        brandW0[r.platform] = {
          position: r.position,
          mentioned: r.mentioned,
          keywords: r.keywords_extracted || [],
        }
      }
    }
  }

  // Current brand platform rankings — prefer brand_visibility_daily (live), fall back to ai_search_results T+ rows
  const brandCurrent: Record<string, { position: number; mentioned: boolean; snapshotLabel?: string }> = {}

  if (latestLiveDate && liveRows) {
    // Use live data: group by platform, best (lowest) rank_position where brand_cited=true
    const latestLive = liveRows.filter(r => r.snapshot_date === latestLiveDate)
    const platformGroups: Record<string, typeof latestLive> = {}
    for (const r of latestLive) {
      const p = r.platform as string
      if (!platformGroups[p]) platformGroups[p] = []
      platformGroups[p].push(r)
    }
    for (const [platform, rows] of Object.entries(platformGroups)) {
      const citedRows = rows.filter(r => r.brand_cited)
      if (citedRows.length > 0) {
        const best = citedRows.reduce((a, b) =>
          (a.rank_position || 99) < (b.rank_position || 99) ? a : b
        )
        brandCurrent[platform] = {
          position: best.rank_position || 1,
          mentioned: true,
          snapshotLabel: latestLiveDate,
        }
      } else {
        brandCurrent[platform] = { position: 0, mentioned: false, snapshotLabel: latestLiveDate }
      }
    }
  } else {
    // Fall back to ai_search_results T+/current rows
    const brandCurrentRows = results.filter(r => brandNameVariants.has(r.competitor_name))
    for (const r of brandCurrentRows) {
      const existing = brandCurrent[r.platform]
      if (!existing || new Date(r.timestamp) > new Date((existing as any).timestamp || 0)) {
        brandCurrent[r.platform] = { position: r.position, mentioned: r.mentioned, snapshotLabel: r.snapshot_label }
      }
    }
  }

  // All-competitor AI platform rankings from current data (for competitor table)
  const allCompetitorPlatformRanks: Record<string, Record<string, { position: number; mentioned: boolean }>> = {}
  for (const r of results) {
    if (!r.competitor_name || brandNameVariants.has(r.competitor_name)) continue
    if (!allCompetitorPlatformRanks[r.competitor_name]) allCompetitorPlatformRanks[r.competitor_name] = {}
    const existing = allCompetitorPlatformRanks[r.competitor_name][r.platform]
    if (!existing || new Date(r.timestamp) > new Date((existing as any).timestamp || 0)) {
      allCompetitorPlatformRanks[r.competitor_name][r.platform] = { position: r.position, mentioned: r.mentioned }
    }
  }

  // Also build from W0 baseline for competitors
  const competitorW0Ranks: Record<string, Record<string, { position: number; mentioned: boolean }>> = {}
  for (const r of baselineResults) {
    if (!r.competitor_name || brandNameVariants.has(r.competitor_name)) continue
    if (!competitorW0Ranks[r.competitor_name]) competitorW0Ranks[r.competitor_name] = {}
    if (!competitorW0Ranks[r.competitor_name][r.platform]) {
      competitorW0Ranks[r.competitor_name][r.platform] = { position: r.position, mentioned: r.mentioned }
    }
  }

  return {
    lastUpdated: latestLiveDate || results[0]?.timestamp || allResults?.[0]?.timestamp,
    platforms,
    queries,
    competitorRanks,
    keywordAnalysis: keywordMatrix,
    brandPlatformRanking: {
      W0: brandW0,
      W0Label: latestBaseline,
      current: brandCurrent,
      currentLabel: latestLiveDate || latestTPlus || 'current',
    },
    allCompetitorPlatformRanks,
    competitorW0Ranks,
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
