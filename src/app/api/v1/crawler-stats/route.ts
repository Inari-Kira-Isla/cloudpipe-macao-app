import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

const CORS = { 'Access-Control-Allow-Origin': '*' }
const CACHE_BASE = 'https://inari-kira-isla.github.io/Openclaw/api-cache'

type DailyCache = {
  daily?: Array<{
    date: string
    total: number
    by_owner?: Record<string, number>
    by_site?: Record<string, number>
  }>
}

async function readCache<T = unknown>(key: string): Promise<T | null> {
  try {
    const res = await fetch(`${CACHE_BASE}/${key}.json`, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

function json(data: unknown, cache = 'CACHE_ONLY') {
  return NextResponse.json(data, {
    headers: { ...CORS, 'Cache-Control': 'public, max-age=300', 'X-Cache': cache },
  })
}

function emptySummary(days: number) {
  return {
    period: { since: new Date(Date.now() - days * 86400000).toISOString(), days },
    total_visits: 0,
    today_visits: 0,
    unique_bots: 0,
    unique_sessions: 0,
    bots: {},
    top_pages: {},
    industries: {},
    page_types: {},
    sites: {},
    daily: [],
    note: 'Cache-only mode: precomputed cache unavailable. No live crawler_visits scan was attempted.',
  }
}

function summarizeDaily(cached: DailyCache, days: number) {
  const slicedDaily = (cached.daily || []).slice(-days)
  const bots: Record<string, { count: number; owner: string }> = {}
  const sites: Record<string, number> = {}
  let totalVisits = 0

  for (const day of slicedDaily) {
    totalVisits += Number(day.total) || 0
    for (const [owner, count] of Object.entries(day.by_owner || {})) {
      const n = Number(count) || 0
      if (!bots[owner]) bots[owner] = { count: 0, owner }
      bots[owner].count += n
    }
    for (const [site, count] of Object.entries(day.by_site || {})) {
      sites[site] = (sites[site] || 0) + (Number(count) || 0)
    }
  }

  return {
    period: { since: slicedDaily[0]?.date ? `${slicedDaily[0].date}T00:00:00Z` : '', days },
    total_visits: totalVisits,
    today_visits: slicedDaily.at(-1)?.total || totalVisits,
    unique_bots: Object.keys(bots).length,
    unique_sessions: 0,
    bots,
    top_pages: {},
    industries: {},
    page_types: {},
    sites,
    daily: slicedDaily,
  }
}

export async function GET(request: NextRequest) {
  const referer = request.headers.get('referer') || ''
  const token = request.nextUrl.searchParams.get('token')
  const expectedToken = process.env.CRAWLER_STATS_TOKEN
  const dashboardToken = 'cloudpipe2026'
  const isInternal = referer.includes('cloudpipe-macao-app') || referer.includes('localhost')
  const isAuthorized = isInternal || token === dashboardToken || (expectedToken && token === expectedToken)

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  const { searchParams } = request.nextUrl
  const view = searchParams.get('view') || 'summary'
  const days = Math.max(1, Math.min(parseInt(searchParams.get('days') || '30', 10) || 30, 90))

  switch (view) {
    case 'summary': {
      if ([7, 30, 90].includes(days)) {
        const cached = await readCache(`crawler-stats-summary-${days}`)
        if (cached) return json(cached, 'PRECOMPUTED')
      }

      const cachedDaily = await readCache<DailyCache>('crawler-stats-daily-7')
      if (cachedDaily?.daily?.length) {
        return json(summarizeDaily(cachedDaily, Math.min(days, 7)), 'PRECOMPUTED-DAILY-SUMMARY')
      }

      return json(emptySummary(days), 'CACHE_ONLY_MISS')
    }

    case 'daily': {
      if ([7, 30, 90].includes(days)) {
        const cached = await readCache(`crawler-stats-daily-${days}`)
        if (cached) return json(cached, 'PRECOMPUTED')
      }

      const cached = await readCache<DailyCache>('crawler-stats-daily-7')
      if (cached) {
        return json(
          { ...cached, daily: (cached.daily || []).slice(-Math.min(days, 7)) },
          'PRECOMPUTED-SLICE',
        )
      }

      return json({ period: { days }, daily: [], note: 'Cache-only mode: daily cache unavailable.' }, 'CACHE_ONLY_MISS')
    }

    case 'spider-web': {
      const cached = await readCache('crawler-stats-spider-web-30')
      if (cached) return json(cached, 'PRECOMPUTED')
      return json({ cross_site_sessions: 0, flows: [], sites: [], note: 'Cache-only mode: spider-web cache unavailable.' }, 'CACHE_ONLY_MISS')
    }

    case 'sessions': {
      const cached = await readCache<{ sessions?: unknown[] }>('crawler-sessions-1')
      if (cached?.sessions) return json(cached.sessions, 'PRECOMPUTED')
      return json([], 'CACHE_ONLY_MISS')
    }

    case 'pages':
    case 'bots':
      return json([], 'CACHE_ONLY_DISABLED')

    case 'journey':
      return json({ journey: [], note: 'Cache-only mode: journey live query disabled.' }, 'CACHE_ONLY_DISABLED')

    case 'live-summary':
      return json(
        { error: 'live-summary disabled', note: 'Cache-only baseline restored; no crawler_visits live scan is allowed.' },
        'CACHE_ONLY_DISABLED',
      )

    default:
      return NextResponse.json(
        { error: 'Invalid view. Use: summary, daily, spider-web, sessions, pages, bots, journey, live-summary' },
        { status: 400, headers: CORS },
      )
  }
}
