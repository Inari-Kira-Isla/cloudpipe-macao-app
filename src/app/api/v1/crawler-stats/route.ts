import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

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
  industries?: Record<string, number>
  today_industries?: Record<string, number>
  today_industries_date?: string
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
    industries: (days <= 1 && cached.today_industries && Object.keys(cached.today_industries).length > 0)
      ? cached.today_industries
      : cached.industries || {},
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
      // Today view: read live from MV (mv_crawler_*_30d, refreshed every 5 min by pg_cron)
      // or legacy crawler_stats_cache table (fallback when USE_CRAWLER_MV=false)
      if (days === 1) {
        const USE_MV = process.env.USE_CRAWLER_MV !== 'false' // default true; set false to rollback
        try {
          const supabase = createServiceClient()
          const today = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Hong_Kong' }).slice(0, 10)

          if (USE_MV) {
            // ── New MV path ───────────────────────────────────────────────
            const [totalRes, botsRes, industriesRes, dailyRes, cacheRes] = await Promise.all([
              supabase.from('mv_crawler_total_visits_30d').select('*').single(),
              supabase
                .from('mv_crawler_bots_30d')
                .select('bot_name,bot_owner,visit_count')
                .order('visit_count', { ascending: false }),
              supabase
                .from('mv_crawler_industries_30d')
                .select('industry,visit_count')
                .order('visit_count', { ascending: false })
                .limit(50),
              supabase
                .from('mv_crawler_daily_30d')
                .select('day,bot_owner,visit_count')
                .order('day', { ascending: false }),
              supabase
                .from('crawler_stats_cache')
                .select('sites_breakdown')
                .eq('id', 1)
                .single(),
            ])

            const total = totalRes.data as
              | { total_visits_1d?: number; total_visits_7d?: number; unique_bots?: number; generated_at?: string }
              | null
            const botRows = (botsRes.data || []) as Array<{ bot_name: string; bot_owner: string; visit_count: number }>
            const industryRows = (industriesRes.data || []) as Array<{ industry: string; visit_count: number }>
            const dailyRows = (dailyRes.data || []) as Array<{ day: string; bot_owner: string; visit_count: number }>
            const sitesBreakdown = (cacheRes.data?.sites_breakdown as Record<string, number> | null) || {}

            if (total) {
              // Build daily_by_owner_30d-equivalent map keyed by YYYY-MM-DD
              const dailyByOwner: Record<string, Record<string, number>> = {}
              for (const row of dailyRows) {
                const dayKey = String(row.day).slice(0, 10)
                if (!dailyByOwner[dayKey]) dailyByOwner[dayKey] = {}
                dailyByOwner[dayKey][row.bot_owner] = (dailyByOwner[dayKey][row.bot_owner] || 0) + (Number(row.visit_count) || 0)
              }

              const generatedAt = total.generated_at ? new Date(total.generated_at) : new Date()
              const todayUtcMidnight = new Date()
              todayUtcMidnight.setUTCHours(0, 0, 0, 0)
              const isStale = generatedAt < todayUtcMidnight

              // mv_crawler_daily_30d stores UTC dates; HKT is UTC+8 so at 00:00-08:00 HKT
              // today's HKT date isn't in the MV yet — fall back to the most recent available date
              const latestMvDate = dailyRows.length > 0 ? String(dailyRows[0].day).slice(0, 10) : ''
              const todayByOwner: Record<string, number> = dailyByOwner[today] || (latestMvDate ? dailyByOwner[latestMvDate] : {}) || {}
              const bots: Record<string, { count: number; owner: string }> = {}
              for (const [owner, count] of Object.entries(todayByOwner)) {
                bots[owner] = { count: Number(count) || 0, owner }
              }
              const totalToday = isStale
                ? Object.values(todayByOwner).reduce((s, v) => s + (Number(v) || 0), 0)
                : (total.total_visits_1d ?? 0)
              const xCheck7d = total.total_visits_7d ?? null

              // Aggregate industries_breakdown from MV
              const industriesBreakdown: Record<string, number> = {}
              for (const row of industryRows) {
                if (!row.industry) continue
                industriesBreakdown[row.industry] = (industriesBreakdown[row.industry] || 0) + (Number(row.visit_count) || 0)
              }

              // Bots breakdown (top-N flat record bot_name → count) for x-check
              const botsBreakdownFlat: Record<string, number> = {}
              for (const row of botRows) {
                if (!row.bot_name) continue
                botsBreakdownFlat[row.bot_name] = (botsBreakdownFlat[row.bot_name] || 0) + (Number(row.visit_count) || 0)
              }

              const uniqueBots = Object.keys(bots).length || total.unique_bots || Object.keys(botsBreakdownFlat).length

              return json({
                period: { since: `${today}T00:00:00+08:00`, days: 1 },
                total_visits: totalToday,
                today_visits: totalToday,
                unique_bots: uniqueBots,
                unique_sessions: 0,
                bots,
                top_pages: {},
                industries: industriesBreakdown,
                page_types: {},
                sites: sitesBreakdown,
                daily: [{ date: today, total: totalToday }],
                generated_at: total.generated_at || new Date().toISOString(),
                is_stale: isStale,
                x_check_7d: xCheck7d,
              }, isStale ? 'STALE-MV' : 'LIVE-MV')
            }
          } else {
            // ── Legacy crawler_stats_cache path (kept 1 week for rollback) ──
            const { data: cacheRow } = await supabase
              .from('crawler_stats_cache')
              .select('total_visits_1d,total_visits_7d,daily_by_owner_30d,industries_breakdown,sites_breakdown,unique_bots,generated_at')
              .eq('id', 1)
              .single()
            if (cacheRow) {
              const generatedAt = new Date(cacheRow.generated_at)
              const todayUtcMidnight = new Date()
              todayUtcMidnight.setUTCHours(0, 0, 0, 0)
              const isStale = generatedAt < todayUtcMidnight

              const todayByOwner: Record<string, number> = (cacheRow.daily_by_owner_30d as Record<string, Record<string, number>> | null)?.[today] || {}
              const bots: Record<string, { count: number; owner: string }> = {}
              for (const [owner, count] of Object.entries(todayByOwner)) {
                bots[owner] = { count: Number(count) || 0, owner }
              }
              const totalToday = isStale
                ? Object.values(todayByOwner).reduce((s, v) => s + (Number(v) || 0), 0)
                : (cacheRow.total_visits_1d ?? 0)
              const xCheck7d = cacheRow.total_visits_7d ?? null
              return json({
                period: { since: `${today}T00:00:00+08:00`, days: 1 },
                total_visits: totalToday,
                today_visits: totalToday,
                unique_bots: Object.keys(bots).length || cacheRow.unique_bots,
                unique_sessions: 0,
                bots,
                top_pages: {},
                industries: (cacheRow.industries_breakdown as Record<string, number>) || {},
                page_types: {},
                sites: (cacheRow.sites_breakdown as Record<string, number>) || {},
                daily: [{ date: today, total: totalToday }],
                generated_at: cacheRow.generated_at,
                is_stale: isStale,
                x_check_7d: xCheck7d,
              }, isStale ? 'STALE-CACHE' : 'LIVE-CACHE')
            }
          }
        } catch {
          // fall through to GitHub cache
        }
      }

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

    case 'pages': {
      const summaryDays = [7, 30, 90].includes(days) ? days : 30
      const summaryCache = await readCache<{ top_pages?: Record<string, number> }>(`crawler-stats-summary-${summaryDays}`)
      const topPages = summaryCache?.top_pages || {}
      if (Object.keys(topPages).length > 0) {
        const pageList = Object.entries(topPages)
          .sort((a, b) => b[1] - a[1])
          .slice(0, parseInt(request.nextUrl.searchParams.get('limit') || '50', 10))
          .map(([path, visits]) => ({ path, visits, bots: [], industry: null, page_type: 'page' }))
        return json(pageList, 'PRECOMPUTED-TOP-PAGES')
      }
      return json([], 'CACHE_ONLY_MISS')
    }
    case 'bots':
      return json([], 'CACHE_ONLY_DISABLED')

    case 'journey':
      return json({ journey: [], note: 'Cache-only mode: journey live query disabled.' }, 'CACHE_ONLY_DISABLED')

    case 'live-summary':
      return json(
        { error: 'live-summary disabled', note: 'Cache-only baseline restored; no crawler_visits live scan is allowed.' },
        'CACHE_ONLY_DISABLED',
      )

    case 'insight-categories': {
      const cached = await readCache('insight-categories-30')
      if (cached) return json(cached, 'PRECOMPUTED')
      return json(
        { total_insight_visits: 0, by_region: {}, by_industry: {}, by_cross: {}, note: 'Cache not yet generated.' },
        'CACHE_ONLY_MISS',
      )
    }

    default:
      return NextResponse.json(
        { error: 'Invalid view. Use: summary, daily, spider-web, sessions, pages, bots, journey, live-summary, insight-categories' },
        { status: 400, headers: CORS },
      )
  }
}
