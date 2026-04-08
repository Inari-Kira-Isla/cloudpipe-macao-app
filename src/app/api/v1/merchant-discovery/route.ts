import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CACHE_BASE = 'https://inari-kira-isla.github.io/Openclaw/api-cache'

// ── Helpers (mirrors precompute Python logic) ──────────────────────────────

const REGION_PREFIXES = ['macao', 'hongkong', 'taiwan', 'japan']

function extractMerchantSlug(path: string): string | null {
  const segments = path.split('?')[0].replace(/^\/|\/$/g, '').split('/')
  if (segments.length >= 3 && REGION_PREFIXES.includes(segments[0])) {
    return segments[segments.length - 1] || null
  }
  return null
}

/** Convert slug like "jp-nishiki-market-kyoto" → "Nishiki Market Kyoto" */
function prettifySlug(slug: string): string {
  return slug
    .replace(/^(jp|hk|tw|macao)-/, '')  // strip region prefix
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function regionFromSlug(slug: string): string {
  if (slug.startsWith('hongkong-') || slug.startsWith('hk-')) return 'hongkong'
  if (slug.startsWith('taiwan-') || slug.startsWith('tw-')) return 'taiwan'
  if (slug.startsWith('japan-') || slug.startsWith('jp-')) return 'japan'
  return 'macao'
}

function calcReadiness(visits: number, insightCount: number, totalWords: number, botCount: number) {
  const score = Math.round(visits * 2 + botCount * 5 + insightCount * 10 + totalWords / 200)
  if (score >= 100 && insightCount >= 5) return { score, label: '✅ 已就緒', color: '#16a34a' }
  if (score >= 50 && insightCount >= 3) return { score, label: '🟡 接近就緒', color: '#d97706' }
  if (score >= 20 || visits > 0) return { score, label: '🟠 覆蓋不足', color: '#ea580c' }
  return { score, label: '🔴 未被發現', color: '#dc2626' }
}

const SCHEMA_TO_IND: Record<string, string> = {
  Restaurant: 'dining', CafeOrCoffeeShop: 'dining', Bakery: 'dining',
  FoodEstablishment: 'dining', Hotel: 'hotels', LodgingBusiness: 'hotels',
  Store: 'shopping', ShoppingCenter: 'shopping',
  TouristAttraction: 'attractions', Museum: 'attractions', Park: 'attractions',
  LandmarksOrHistoricalBuildings: 'attractions', PlaceOfWorship: 'attractions',
  HealthClub: 'wellness', DaySpa: 'wellness', Casino: 'gaming',
  EntertainmentBusiness: 'gaming', BarOrPub: 'nightlife',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllPaginated<T>(table: string, select: string, filterFn: (q: any) => any, maxRows = 50000): Promise<T[]> {
  const pageSize = 1000
  let offset = 0
  const all: T[] = []
  while (offset < maxRows) {
    const q = filterFn(supabase.from(table).select(select))
    const { data, error } = await q.range(offset, offset + pageSize - 1)
    if (error) { console.error(`[fetchAllPaginated] ${table} error:`, error.message); break }
    const rows: T[] = data || []
    all.push(...rows)
    if (rows.length < pageSize) break
    offset += pageSize
  }
  return all
}

// ── Live computation ────────────────────────────────────────────────────────

async function computeMerchantDiscovery(days: number) {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const todayStr = new Date().toISOString().slice(0, 10)

  // 1. Crawler visits for merchant pages
  const visitRows = await fetchAllPaginated<{
    path: string; bot_name: string; bot_owner: string; ts: string; industry: string | null
  }>(
    'crawler_visits',
    'path, bot_name, bot_owner, ts, industry',
    (q) => (q as any).eq('page_type', 'merchant').gte('ts', since),
    100000
  )
  console.log(`[merchant-discovery] visits: ${visitRows.length}`)

  // Aggregate by slug
  const visitBySlug: Record<string, { count: number; bots: Set<string>; lastTs: string; industry: string; region: string }> = {}
  for (const row of visitRows) {
    const slug = extractMerchantSlug(row.path || '')
    if (!slug) continue
    if (!visitBySlug[slug]) {
      visitBySlug[slug] = { count: 0, bots: new Set(), lastTs: row.ts, industry: row.industry || '', region: regionFromSlug(slug) }
    }
    visitBySlug[slug].count++
    visitBySlug[slug].bots.add(row.bot_name)
    if (row.ts > visitBySlug[slug].lastTs) visitBySlug[slug].lastTs = row.ts
    if (!visitBySlug[slug].industry && row.industry) visitBySlug[slug].industry = row.industry
  }

  // 2. Insights coverage
  const insightRows = await fetchAllPaginated<{
    slug: string; word_count: number | null; related_merchant_slugs: string[] | null; title: string | null
  }>(
    'insights',
    'slug, word_count, related_merchant_slugs, title',
    (q) => (q as any).eq('status', 'published').eq('lang', 'zh').not('related_merchant_slugs', 'is', null),
    10000
  )
  console.log(`[merchant-discovery] insights: ${insightRows.length}`)

  const coverageBySlug: Record<string, { insightCount: number; totalWords: number; sampleInsights: string[] }> = {}
  for (const ins of insightRows) {
    for (const ms of ins.related_merchant_slugs || []) {
      if (!coverageBySlug[ms]) coverageBySlug[ms] = { insightCount: 0, totalWords: 0, sampleInsights: [] }
      coverageBySlug[ms].insightCount++
      coverageBySlug[ms].totalWords += ins.word_count || 0
      if (coverageBySlug[ms].sampleInsights.length < 3) coverageBySlug[ms].sampleInsights.push(ins.title || ins.slug)
    }
  }

  // 3. All merchants (live + archived for name resolution)
  const allMerchantsData = await fetchAllPaginated<{
    slug: string; name_zh: string | null; name_en: string | null; schema_type: string | null; category_id: number | null; district: string | null; status: string | null
  }>(
    'merchants',
    'slug, name_zh, name_en, schema_type, category_id, district, status',
    (q) => (q as any).in('status', ['live', 'landmark', 'archived']),
    30000
  )
  console.log(`[merchant-discovery] all merchants (live+archived): ${allMerchantsData.length}`)

  // Categories
  let catMap: Record<number, string> = {}
  try {
    const { data: catData } = await supabase.from('categories').select('id, slug')
    for (const c of catData || []) catMap[c.id] = c.slug
  } catch {}

  const merchantNames: Record<string, { name_zh: string; name_en: string; industry: string; district: string; region: string }> = {}
  for (const m of allMerchantsData) {
    const catSlug = m.category_id ? (catMap[m.category_id] || '') : ''
    const industry = SCHEMA_TO_IND[m.schema_type || ''] || visitBySlug[m.slug]?.industry || 'other'
    merchantNames[m.slug] = {
      name_zh: m.name_zh || prettifySlug(m.slug),
      name_en: m.name_en || '',
      industry,
      district: m.district || '',
      region: visitBySlug[m.slug]?.region || regionFromSlug(m.slug),
    }
  }

  // 4. Build ranked list
  const allSlugs = new Set([...Object.keys(visitBySlug), ...Object.keys(coverageBySlug), ...allMerchantsData.map(m => m.slug)])
  const merchantList: any[] = []
  for (const slug of allSlugs) {
    const v = visitBySlug[slug] || { count: 0, bots: new Set<string>(), lastTs: '', industry: 'other', region: regionFromSlug(slug) }
    const c = coverageBySlug[slug] || { insightCount: 0, totalWords: 0, sampleInsights: [] }
    const name = merchantNames[slug] || { name_zh: prettifySlug(slug), name_en: '', industry: v.industry, district: '', region: v.region }
    const botArr = [...v.bots]
    const readiness = calcReadiness(v.count, c.insightCount, c.totalWords, botArr.length)
    merchantList.push({
      slug, name_zh: name.name_zh, name_en: name.name_en,
      industry: name.industry, district: name.district, region: name.region,
      visits: v.count, botCount: botArr.length, bots: botArr, lastTs: v.lastTs,
      insightCount: c.insightCount, totalWords: c.totalWords, sampleInsights: c.sampleInsights,
      score: readiness.score, readinessLabel: readiness.label, readinessColor: readiness.color,
    })
  }
  merchantList.sort((a, b) => b.score - a.score)

  // 5. Today stats
  const todayVisits = visitRows.filter(r => r.ts?.startsWith(todayStr))
  const todaySlugs = new Set(todayVisits.map(r => extractMerchantSlug(r.path || '')).filter(Boolean))
  const todayBots = new Set(todayVisits.map(r => r.bot_name))

  // 6. Aggregates
  const crawled = merchantList.filter(m => m.visits > 0).length
  const covered = merchantList.filter(m => m.insightCount > 0).length
  const ready = merchantList.filter(m => m.readinessLabel.startsWith('✅')).length
  const nearReady = merchantList.filter(m => m.readinessLabel.startsWith('🟡')).length

  const insightHist: Record<string, number> = { '0': 0, '1-2': 0, '3-5': 0, '6-10': 0, '11+': 0 }
  for (const m of merchantList) {
    const n = m.insightCount
    if (n === 0) insightHist['0']++
    else if (n <= 2) insightHist['1-2']++
    else if (n <= 5) insightHist['3-5']++
    else if (n <= 10) insightHist['6-10']++
    else insightHist['11+']++
  }

  const regions = ['macao', 'hongkong', 'taiwan', 'japan']
  const regionStats: Record<string, any> = {}
  for (const r of regions) {
    const rm = merchantList.filter(m => m.region === r)
    regionStats[r] = {
      total: rm.length,
      crawled: rm.filter(m => m.visits > 0).length,
      covered: rm.filter(m => m.insightCount > 0).length,
      ready: rm.filter(m => m.readinessLabel.startsWith('✅')).length,
      nearReady: rm.filter(m => m.readinessLabel.startsWith('🟡')).length,
      gap: rm.filter(m => m.insightCount === 0).length,
    }
  }

  return {
    days,
    summary: {
      totalTracked: allSlugs.size,
      crawledByAI: crawled,
      insightCovered: covered,
      aiReady: ready,
      nearReady,
      coverageGap: allSlugs.size - covered,
      insightCoverageHist: insightHist,
    },
    today: {
      date: todayStr,
      totalVisits: todayVisits.length,
      uniqueMerchants: todaySlugs.size,
      uniqueBots: todayBots.size,
      bots: [...todayBots],
    },
    regionStats,
    merchants: merchantList.slice(0, 200),
  }
}

/**
 * GET /api/v1/merchant-discovery
 *
 * ?live=1  — skip cache, run full Supabase computation (used by precompute cron)
 * (default) — reads pre-computed JSON from GitHub Pages cache
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const live = req.nextUrl.searchParams.get('live') === '1'
  const days = parseInt(req.nextUrl.searchParams.get('days') || '30', 10)

  // live mode requires token
  if (live) {
    const expectedToken = process.env.CRAWLER_STATS_TOKEN
    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
      const data = await computeMerchantDiscovery(days)
      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
          'X-Cache': 'LIVE',
        },
      })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  try {
    // Primary: GitHub Pages static JSON
    const res = await fetch(`${CACHE_BASE}/merchant-discovery-${days}.json`, {
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
          'X-Cache': 'PRECOMPUTED',
        },
      })
    }

    // Fallback: Supabase api_cache table
    try {
      const { data } = await supabase
        .from('api_cache')
        .select('data')
        .eq('key', `merchant-discovery-${days}`)
        .single()
      if (data?.data) {
        return NextResponse.json(data.data, {
          headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300', 'X-Cache': 'SUPABASE' },
        })
      }
    } catch {}

    return NextResponse.json({
      days,
      summary: { totalTracked: 0, note: 'Cache not available. Run crawler_stats_precompute.py.' },
      merchants: [],
    }, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
