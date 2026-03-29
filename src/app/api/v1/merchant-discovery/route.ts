import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let _cache: { data: unknown; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

/** Extract merchant slug from paths like /macao/dining/japanese/slug or /macao/merchants/slug */
function extractMerchantSlug(path: string): string | null {
  const segments = path.replace(/\?.*$/, '').split('/').filter(Boolean)
  // /macao/[industry]/[category]/[merchant-slug]  → 4 segments
  // /macao/merchants/[merchant-slug]              → 3 segments
  if (segments.length >= 3 && segments[0] === 'macao') {
    return segments[segments.length - 1] || null
  }
  return null
}

/** AI citation readiness based on insight coverage + content density */
function calcReadiness(visits: number, insightCount: number, totalWords: number, botCount: number): {
  score: number
  label: string
  color: string
} {
  // Weighted score:
  // - AI visits: 2 pts each (proves it's already being found)
  // - Distinct bots: 5 pts each (diversity of AI discovering it)
  // - Insights linking: 10 pts each (content network depth)
  // - Total words / 200: word density bonus
  const score = Math.round(visits * 2 + botCount * 5 + insightCount * 10 + totalWords / 200)

  if (score >= 100 && insightCount >= 5) return { score, label: '✅ 已就緒', color: '#16a34a' }
  if (score >= 50 && insightCount >= 3)  return { score, label: '🟡 接近就緒', color: '#d97706' }
  if (score >= 20 || visits > 0)         return { score, label: '🟠 覆蓋不足', color: '#ea580c' }
  return { score, label: '🔴 未被發現', color: '#dc2626' }
}

export async function GET(req: NextRequest) {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json(_cache.data, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' },
    })
  }

  try {
    const days = parseInt(req.nextUrl.searchParams.get('days') || '30')
    const since = new Date(Date.now() - days * 86400_000).toISOString()

    // ── 1. Merchant page AI crawler visits ────────────────────────────────────
    const visitRows: any[] = []
    let offset = 0
    while (true) {
      const { data } = await supabase
        .from('crawler_visits')
        .select('path,bot_name,bot_owner,ts')
        .eq('page_type', 'merchant')
        .gte('ts', since)
        .range(offset, offset + 999)
      if (!data?.length) break
      visitRows.push(...data)
      if (data.length < 1000) break
      offset += 1000
    }

    // Aggregate by merchant slug
    const visitBySlug: Record<string, { count: number; bots: Set<string>; lastTs: string }> = {}
    for (const row of visitRows) {
      const slug = extractMerchantSlug(row.path)
      if (!slug) continue
      if (!visitBySlug[slug]) visitBySlug[slug] = { count: 0, bots: new Set(), lastTs: row.ts }
      visitBySlug[slug].count++
      visitBySlug[slug].bots.add(row.bot_name)
      if (row.ts > visitBySlug[slug].lastTs) visitBySlug[slug].lastTs = row.ts
    }

    // ── 2. Insights coverage per merchant ─────────────────────────────────────
    const insightRows: any[] = []
    offset = 0
    while (true) {
      const { data } = await supabase
        .from('insights')
        .select('slug,word_count,related_merchant_slugs,title')
        .eq('status', 'published')
        .eq('lang', 'zh')
        .not('related_merchant_slugs', 'is', null)
        .range(offset, offset + 999)
      if (!data?.length) break
      insightRows.push(...data)
      if (data.length < 1000) break
      offset += 1000
    }

    // Map merchant → linking insights
    const coverageBySlug: Record<string, {
      insightCount: number
      totalWords: number
      sampleInsights: string[]  // up to 3 insight titles
    }> = {}
    for (const ins of insightRows) {
      const slugs: string[] = ins.related_merchant_slugs || []
      for (const mSlug of slugs) {
        if (!coverageBySlug[mSlug]) coverageBySlug[mSlug] = { insightCount: 0, totalWords: 0, sampleInsights: [] }
        coverageBySlug[mSlug].insightCount++
        coverageBySlug[mSlug].totalWords += ins.word_count || 0
        if (coverageBySlug[mSlug].sampleInsights.length < 3) {
          coverageBySlug[mSlug].sampleInsights.push(ins.title || ins.slug)
        }
      }
    }

    // ── 3. Fetch merchant names for known slugs ────────────────────────────────
    const allSlugs = new Set([
      ...Object.keys(visitBySlug),
      ...Object.keys(coverageBySlug),
    ])

    const merchantNames: Record<string, { name_zh: string; name_en: string; industry: string }> = {}
    const slugArr = [...allSlugs].slice(0, 500)  // limit query size
    if (slugArr.length > 0) {
      const { data: mData } = await supabase
        .from('merchants')
        .select('slug,name_zh,name_en,schema_type')
        .in('slug', slugArr)
      for (const m of mData || []) {
        const SCHEMA_TO_IND: Record<string, string> = {
          Restaurant: 'dining', CafeOrCoffeeShop: 'dining', Bakery: 'dining',
          FoodEstablishment: 'dining', Hotel: 'hotels', LodgingBusiness: 'hotels',
          Store: 'shopping', ShoppingCenter: 'shopping',
          TouristAttraction: 'attractions', Museum: 'attractions', Park: 'attractions',
          LandmarksOrHistoricalBuildings: 'attractions', PlaceOfWorship: 'attractions',
          HealthClub: 'wellness', DaySpa: 'wellness', Casino: 'gaming',
          EntertainmentBusiness: 'gaming', BarOrPub: 'nightlife',
        }
        merchantNames[m.slug] = {
          name_zh: m.name_zh || m.slug,
          name_en: m.name_en || '',
          industry: SCHEMA_TO_IND[m.schema_type] || 'other',
        }
      }
    }

    // ── 4. Build ranked merchant list ─────────────────────────────────────────
    const merchantList = [...allSlugs].map(slug => {
      const v = visitBySlug[slug] || { count: 0, bots: new Set<string>(), lastTs: '' }
      const c = coverageBySlug[slug] || { insightCount: 0, totalWords: 0, sampleInsights: [] }
      const name = merchantNames[slug] || { name_zh: slug, name_en: '', industry: 'unknown' }
      const botArr = [...v.bots]
      const readiness = calcReadiness(v.count, c.insightCount, c.totalWords, botArr.length)

      return {
        slug,
        name_zh: name.name_zh,
        name_en: name.name_en,
        industry: name.industry,
        visits: v.count,
        botCount: botArr.length,
        bots: botArr,
        lastTs: v.lastTs,
        insightCount: c.insightCount,
        totalWords: c.totalWords,
        sampleInsights: c.sampleInsights,
        score: readiness.score,
        readinessLabel: readiness.label,
        readinessColor: readiness.color,
      }
    })

    merchantList.sort((a, b) => b.score - a.score)

    // ── 5. Summary stats ──────────────────────────────────────────────────────
    const crawled = merchantList.filter(m => m.visits > 0).length
    const covered = merchantList.filter(m => m.insightCount > 0).length
    const ready = merchantList.filter(m => m.readinessLabel.startsWith('✅')).length
    const nearReady = merchantList.filter(m => m.readinessLabel.startsWith('🟡')).length

    // Insight coverage distribution (how many insights link to how many merchants)
    const insightCoverageHist: Record<string, number> = { '0': 0, '1-2': 0, '3-5': 0, '6-10': 0, '11+': 0 }
    for (const m of merchantList) {
      const n = m.insightCount
      if (n === 0) insightCoverageHist['0']++
      else if (n <= 2) insightCoverageHist['1-2']++
      else if (n <= 5) insightCoverageHist['3-5']++
      else if (n <= 10) insightCoverageHist['6-10']++
      else insightCoverageHist['11+']++
    }

    const result = {
      days,
      summary: {
        totalTracked: allSlugs.size,
        crawledByAI: crawled,
        insightCovered: covered,
        aiReady: ready,
        nearReady,
        coverageGap: allSlugs.size - covered,
        insightCoverageHist,
      },
      merchants: merchantList.slice(0, 100),  // top 100
    }

    _cache = { data: result, ts: Date.now() }
    return NextResponse.json(result, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
