import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

// 8-second query timeout — prevents connections from hanging indefinitely
// and exhausting the PostgreSQL connection pool
const QUERY_TIMEOUT_MS = 8000

function withTimeout(fetchFn: typeof fetch): typeof fetch {
  return (url, options) =>
    fetchFn(url, { ...options, signal: AbortSignal.timeout(QUERY_TIMEOUT_MS) })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { global: { fetch: withTimeout(fetch) } }
)

const CORS = { 'Access-Control-Allow-Origin': '*' }

const CACHE_BASE = 'https://inari-kira-isla.github.io/Openclaw/api-cache'

/** Read pre-computed data from GitHub Pages static JSON (written by local cron every 5 min) */
async function readCache(key: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${CACHE_BASE}/${key}.json`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    // Fallback: try Supabase api_cache table
    try {
      const { data } = await supabase
        .from('api_cache')
        .select('data')
        .eq('key', key)
        .single()
      return data?.data || null
    } catch {
      return null
    }
  }
}

/**
 * GET /api/v1/crawler-stats
 *
 * Heavy views (summary, daily, spider-web, pages, sessions) are pre-computed
 * by crawler_stats_precompute.py cron every 5 min → reads from api_cache table.
 * Only lightweight views (bots, journey) query live data.
 */
export async function GET(request: NextRequest) {
  const referer = request.headers.get('referer') || ''
  const token = request.nextUrl.searchParams.get('token')
  const expectedToken = process.env.CRAWLER_STATS_TOKEN
  const isInternal = referer.includes('cloudpipe-macao-app') || referer.includes('localhost')
  const isAuthorized = isInternal || (expectedToken && token === expectedToken)
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const view = searchParams.get('view') || 'summary'
  const bot = searchParams.get('bot')
  const days = parseInt(searchParams.get('days') || '30', 10)
  const sessionId = searchParams.get('session')
  const siteFilter = searchParams.get('site')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)
  const since = new Date(Date.now() - days * 86400000).toISOString()

  try {
    let result: unknown

    switch (view) {
      // ── Pre-computed views (instant, no heavy queries) ──────────────────
      case 'summary': {
        const cached = await readCache('crawler-stats-summary-30') as any
        if (cached) {
          // If days<=1 (today), use RPC or direct query for accurate data
          // (ratio-scaling from 30d cache rounds low-frequency bots like PerplexityBot to 0)
          if (days <= 1) {
            const todayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00Z'
            // Try RPC first (gives proper industry breakdown from path parsing)
            const { data: rpcData, error: rpcError } = await supabase
              .rpc('get_crawler_summary', { since_ts: todayStart })
            if (!rpcError && rpcData && rpcData.total_visits > 0) {
              return NextResponse.json({
                period: { since: todayStart, days: 1 },
                total_visits: rpcData.total_visits || 0,
                today_visits: rpcData.total_visits || 0,
                unique_bots: rpcData.unique_bots || 0,
                unique_sessions: 0,
                bots: rpcData.bots || {},
                top_pages: {},
                industries: rpcData.industries || {},
                page_types: {},
                sites: rpcData.sites || {},
                site_sample_total: rpcData.site_sample_total || 0,
              }, {
                headers: { ...CORS, 'Cache-Control': 'public, max-age=60', 'X-Cache': 'LIVE-TODAY-RPC' },
              })
            }
            // Fallback: direct queries
            const [
              { data: botData },
              { count: todayCount },
            ] = await Promise.all([
              supabase.from('crawler_visits').select('bot_name, bot_owner').gte('ts', todayStart).order('ts', { ascending: false }).limit(5000),
              supabase.from('crawler_visits').select('*', { count: 'exact', head: true }).gte('ts', todayStart),
            ])
            const todayBots: Record<string, { count: number; owner: string }> = {}
            for (const r of botData || []) {
              const bn = r.bot_name || 'Unknown'
              if (!todayBots[bn]) todayBots[bn] = { count: 0, owner: r.bot_owner || '' }
              todayBots[bn].count++
            }
            return NextResponse.json({
              period: { since: todayStart, days: 1 },
              total_visits: todayCount || 0,
              today_visits: todayCount || 0,
              unique_bots: Object.keys(todayBots).length,
              unique_sessions: 0,
              bots: todayBots,
              top_pages: {},
              industries: {},
              page_types: {},
              sites: cached.sites || {},
              site_sample_total: cached.site_sample_total || 0,
            }, {
              headers: { ...CORS, 'Cache-Control': 'public, max-age=60', 'X-Cache': 'LIVE-TODAY-FALLBACK' },
            })
          }
          // For days < 30, scale 30d data proportionally
          if (days < 30) {
            const ratio = days / 30
            const scaledBots: Record<string, { count: number; owner: string }> = {}
            for (const [name, info] of Object.entries<{ count: number; owner: string }>(cached.bots || {})) {
              scaledBots[name] = { count: Math.round((info.count || 0) * ratio), owner: info.owner }
            }
            const scaledIndustries: Record<string, number> = {}
            for (const [ind, cnt] of Object.entries<number>(cached.industries || {})) {
              scaledIndustries[ind] = Math.round((cnt || 0) * ratio)
            }
            return NextResponse.json({
              ...cached,
              total_visits: Math.round((cached.total_visits || 0) * ratio),
              bots: scaledBots,
              industries: scaledIndustries,
              period: { since, days },
            }, {
              headers: { ...CORS, 'Cache-Control': 'public, max-age=300', 'X-Cache': 'PRECOMPUTED-SCALED' },
            })
          }
          return NextResponse.json(cached, {
            headers: { ...CORS, 'Cache-Control': 'public, max-age=300', 'X-Cache': 'PRECOMPUTED' },
          })
        }
        // Fallback: minimal live query (just counts)
        const { count } = await supabase
          .from('crawler_visits')
          .select('*', { count: 'exact', head: true })
          .gte('ts', since)
        result = {
          period: { since, days },
          total_visits: count || 0,
          unique_bots: 0,
          note: 'Pre-computed cache not available. Run crawler_stats_precompute.py.',
        }
        break
      }

      case 'daily': {
        if (days <= 30) {
          const cached = await readCache('crawler-stats-daily-30') as any
          if (cached) {
            const dailyArr: unknown[] = cached.daily || []
            const sliced = days < 30 ? dailyArr.slice(-days) : dailyArr
            return NextResponse.json(
              { ...cached, daily: sliced, period: { since, days } },
              { headers: { ...CORS, 'Cache-Control': 'public, max-age=300', 'X-Cache': 'PRECOMPUTED' } },
            )
          }
        }
        // days > 30: live query grouped by date
        const { data: visitRows } = await supabase
          .from('crawler_visits')
          .select('ts, bot_owner')
          .gte('ts', since)
          .order('ts', { ascending: true })
          .limit(50000)
        const dailyMap: Record<string, { total: number; by_owner: Record<string, number> }> = {}
        for (const r of visitRows || []) {
          const d = (r.ts as string).slice(0, 10)
          if (!dailyMap[d]) dailyMap[d] = { total: 0, by_owner: {} }
          dailyMap[d].total++
          const owner = r.bot_owner || 'Unknown'
          dailyMap[d].by_owner[owner] = (dailyMap[d].by_owner[owner] || 0) + 1
        }
        const dailyArr = Object.entries(dailyMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, v]) => ({ date, total: v.total, by_owner: v.by_owner }))
        result = { period: { since, days }, daily: dailyArr }
        break
      }

      case 'spider-web': {
        if (days <= 30) {
          const cached = await readCache('crawler-stats-spider-web-30') as any
          if (cached) {
            // Scale site totals proportionally for sub-30d views
            if (days < 30) {
              const ratio = days / 30
              const scaledSites = (cached.sites || []).map((s: any) => ({
                ...s,
                total: Math.round((s.total || 0) * ratio),
                spider_web: Math.round((s.spider_web || 0) * ratio),
              }))
              return NextResponse.json(
                { ...cached, sites: scaledSites, period: { since, days } },
                { headers: { ...CORS, 'Cache-Control': 'public, max-age=300', 'X-Cache': 'PRECOMPUTED-SCALED' } },
              )
            }
            return NextResponse.json(cached, {
              headers: { ...CORS, 'Cache-Control': 'public, max-age=300', 'X-Cache': 'PRECOMPUTED' },
            })
          }
        }
        // days > 30: live query
        const { data: swRows } = await supabase
          .from('crawler_visits')
          .select('site, bot_name, page_type, referer')
          .gte('ts', since)
          .limit(50000)
        const siteAgg: Record<string, { total: number; bots: Set<string>; spider_web: number }> = {}
        for (const r of swRows || []) {
          const s = r.site || 'cloudpipe-macao-app'
          if (!siteAgg[s]) siteAgg[s] = { total: 0, bots: new Set(), spider_web: 0 }
          siteAgg[s].total++
          if (r.bot_name) siteAgg[s].bots.add(r.bot_name)
          if (r.page_type === 'spider-web' && r.referer) siteAgg[s].spider_web++
        }
        result = {
          period: { since, days },
          sites: Object.entries(siteAgg)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([site, v]) => ({ site, total: v.total, unique_bots: v.bots.size, spider_web: v.spider_web })),
        }
        break
      }

      // ── Live aggregated summary — single indexed RPC call instead of 6 parallel full scans ───
      case 'live-summary': {
        const since30 = new Date(Date.now() - 30 * 86400000).toISOString()

        // Use get_crawler_summary SQL function (1 indexed scan vs 6 full table scans)
        // Falls back to lightweight count-only if function not yet deployed
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_crawler_summary', { since_ts: since30 })

        if (!rpcError && rpcData && rpcData.total_visits > 0) {
          result = {
            period: { since: since30, days: 30 },
            total_visits: rpcData.total_visits || 0,
            today_visits: rpcData.today_visits || 0,
            unique_bots: rpcData.unique_bots || 0,
            bots: rpcData.bots || {},
            sites: rpcData.sites || {},
            site_sample_total: rpcData.site_sample_total || 0,
            industries: rpcData.industries || {},
            daily: rpcData.daily || {},
            daily_by_owner: rpcData.daily_by_owner || null,
            generated_at: rpcData.generated_at || new Date().toISOString(),
          }
        }

        // Fallback: RPC failed, build from raw queries
        if (!result) {
          const todayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00Z'
          const [
            { data: botData },
            { count: totalCount },
            { count: todayCount },
            { data: siteData },
          ] = await Promise.all([
            supabase.from('crawler_visits').select('bot_name, bot_owner').gte('ts', since30).order('ts', { ascending: false }).limit(1000),
            supabase.from('crawler_visits').select('*', { count: 'exact', head: true }).gte('ts', since30),
            supabase.from('crawler_visits').select('*', { count: 'exact', head: true }).gte('ts', todayStart),
            supabase.from('crawler_visits').select('site').gte('ts', since30).order('ts', { ascending: false }).limit(1000),
          ])
          const bots: Record<string, { count: number; owner: string }> = {}
          for (const r of botData || []) {
            const bn = r.bot_name || 'Unknown'
            if (!bots[bn]) bots[bn] = { count: 0, owner: r.bot_owner || '' }
            bots[bn].count++
          }
          const sites: Record<string, number> = {}
          for (const r of siteData || []) {
            const s = r.site || 'cloudpipe-macao-app'
            sites[s] = (sites[s] || 0) + 1
          }
          // Paginate to get ALL daily bot data (PostgREST default max=1000)
          const dailyMap: Record<string, number> = {}
          const dailyByOwner: Record<string, Record<string, number>> = {}
          let dboOffset = 0
          while (dboOffset < 60000) {
            const { data: page } = await supabase
              .from('crawler_visits')
              .select('ts, bot_owner')
              .gte('ts', since30)
              .order('ts', { ascending: false })
              .range(dboOffset, dboOffset + 999)
            if (!page || page.length === 0) break
            for (const r of page) {
              const d = (r.ts || '').slice(0, 10)
              if (!d) continue
              dailyMap[d] = (dailyMap[d] || 0) + 1
              const owner = r.bot_owner || 'Unknown'
              if (!dailyByOwner[d]) dailyByOwner[d] = {}
              dailyByOwner[d][owner] = (dailyByOwner[d][owner] || 0) + 1
            }
            if (page.length < 1000) break
            dboOffset += 1000
          }
          result = {
            period: { since: since30, days: 30 },
            total_visits: totalCount || 0,
            today_visits: todayCount || 0,
            unique_bots: Object.keys(bots).length,
            bots,
            sites,
            site_sample_total: (siteData || []).length,
            daily: dailyMap,
            daily_by_owner: dailyByOwner,
            generated_at: new Date().toISOString(),
          }
        }

        // Supplement: if RPC result lacks daily_by_owner, fetch it via paginated queries
        if (result && !(result as any).daily_by_owner) {
          const dbo: Record<string, Record<string, number>> = {}
          const pageSize = 1000
          let offset = 0
          const maxRows = 60000
          while (offset < maxRows) {
            const { data: page } = await supabase
              .from('crawler_visits')
              .select('ts, bot_owner')
              .gte('ts', since30)
              .order('ts', { ascending: false })
              .range(offset, offset + pageSize - 1)
            if (!page || page.length === 0) break
            for (const r of page) {
              const d = (r.ts || '').slice(0, 10)
              if (!d) continue
              const owner = r.bot_owner || 'Unknown'
              if (!dbo[d]) dbo[d] = {}
              dbo[d][owner] = (dbo[d][owner] || 0) + 1
            }
            if (page.length < pageSize) break
            offset += pageSize
          }
          ;(result as any).daily_by_owner = dbo
        }
        break
      }

      // ── Lightweight live queries (small result sets, no timeout risk) ───
      case 'bots': {
        let query = supabase
          .from('crawler_visits')
          .select('bot_name, bot_owner, ts, path, site')
          .gte('ts', since)
          .order('ts', { ascending: false })
          .limit(limit)
        if (bot) query = query.eq('bot_name', bot)
        if (siteFilter) query = query.eq('site', siteFilter)
        const { data } = await query
        result = { count: data?.length || 0, visits: data }
        break
      }

      case 'journey': {
        if (!sessionId) {
          return NextResponse.json({ error: 'session parameter required' }, { status: 400 })
        }
        const { data } = await supabase
          .from('crawler_visits')
          .select('ts, path, referer, page_type, industry, category, site')
          .eq('session_id', sessionId)
          .order('ts', { ascending: true })
          .limit(200)
        result = {
          session_id: sessionId,
          total_pages: data?.length || 0,
          journey: (data || []).map(v => ({
            ts: v.ts, path: v.path, referer: v.referer,
            page_type: v.page_type, industry: v.industry,
            category: v.category, site: v.site || 'cloudpipe-macao-app',
          })),
        }
        break
      }

      case 'pages': {
        // Lightweight: just get top pages from last 100 visits
        let query = supabase
          .from('crawler_visits')
          .select('path, bot_name, page_type')
          .gte('ts', since)
          .order('ts', { ascending: false })
          .limit(500)
        if (siteFilter) query = query.eq('site', siteFilter)
        const { data } = await query
        const pageSummary: Record<string, { count: number; bots: Set<string>; page_type: string }> = {}
        for (const v of data || []) {
          if (!pageSummary[v.path]) pageSummary[v.path] = { count: 0, bots: new Set(), page_type: v.page_type }
          pageSummary[v.path].count++
          pageSummary[v.path].bots.add(v.bot_name)
        }
        result = Object.entries(pageSummary)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, limit)
          .map(([path, info]) => ({ path, visits: info.count, bots: [...info.bots], page_type: info.page_type }))
        break
      }

      case 'sessions': {
        // Lightweight: recent sessions only
        let query = supabase
          .from('crawler_visits')
          .select('session_id, bot_name, bot_owner, path, ts, site')
          .gte('ts', since)
          .not('session_id', 'is', null)
          .order('ts', { ascending: false })
          .limit(500)
        if (bot) query = query.eq('bot_name', bot)
        if (siteFilter) query = query.eq('site', siteFilter)
        const { data } = await query
        const sessions: Record<string, {
          bot: string; owner: string; pages: number;
          first_ts: string; last_ts: string; paths: string[]; sites: Set<string>
        }> = {}
        for (const v of data || []) {
          if (!v.session_id) continue
          if (!sessions[v.session_id]) {
            sessions[v.session_id] = {
              bot: v.bot_name, owner: v.bot_owner,
              pages: 0, first_ts: v.ts, last_ts: v.ts, paths: [], sites: new Set(),
            }
          }
          const s = sessions[v.session_id]
          s.pages++
          if (v.ts < s.first_ts) s.first_ts = v.ts
          if (v.ts > s.last_ts) s.last_ts = v.ts
          if (s.paths.length < 50) s.paths.push(v.path)
          s.sites.add(v.site || 'cloudpipe-macao-app')
        }
        result = Object.entries(sessions)
          .sort((a, b) => b[1].pages - a[1].pages)
          .slice(0, limit)
          .map(([id, s]) => ({ session_id: id, ...s, sites: [...s.sites] }))
        break
      }

      default:
        return NextResponse.json(
          { error: 'Invalid view. Use: summary, live-summary, bots, pages, sessions, journey, spider-web, daily' },
          { status: 400 }
        )
    }

    return NextResponse.json(result, {
      headers: { ...CORS, 'Cache-Control': 'public, max-age=60', 'X-Cache': 'LIVE' },
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal error', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}
