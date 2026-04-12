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
        // Primary: read from crawler_stats_cache Supabase table (pg_cron refreshes every 5 min)
        // This is the single source of truth — same number shown everywhere
        const { data: cacheRow } = await supabase
          .from('crawler_stats_cache')
          .select('*')
          .eq('id', 1)
          .single()

        if (cacheRow && cacheRow.total_visits_30d > 0) {
          // Pick total_visits for the requested time window
          const windowVisits = days >= 90 ? cacheRow.total_visits_90d
            : days >= 30 ? cacheRow.total_visits_30d
            : days >= 7  ? cacheRow.total_visits_7d
            : cacheRow.total_visits_1d

          // Scale bot/industry breakdowns proportionally for sub-30d windows
          const ratio = days >= 30 ? 1 : windowVisits / (cacheRow.total_visits_30d || 1)
          const scaledBots: Record<string, { count: number; owner: string }> = {}
          for (const [name, info] of Object.entries<{ count: number; owner: string }>(cacheRow.bots_breakdown || {})) {
            scaledBots[name] = { count: Math.round((info.count || 0) * ratio), owner: info.owner }
          }
          const scaledIndustries: Record<string, number> = {}
          for (const [ind, cnt] of Object.entries<number>(cacheRow.industries_breakdown || {})) {
            scaledIndustries[ind] = Math.round((cnt || 0) * ratio)
          }

          return NextResponse.json({
            period: { since: new Date(Date.now() - days * 86400000).toISOString(), days },
            total_visits: windowVisits,
            today_visits: cacheRow.total_visits_1d,
            unique_bots: cacheRow.unique_bots,
            unique_sessions: 0,
            bots: scaledBots,
            top_pages: {},
            industries: scaledIndustries,
            page_types: {},
            sites: cacheRow.sites_breakdown || {},
            site_sample_total: cacheRow.total_visits_30d,
            daily: cacheRow.daily_30d || [],
            generated_at: cacheRow.generated_at,
          }, {
            headers: { ...CORS, 'Cache-Control': 'public, max-age=60', 'X-Cache': 'SUPABASE-CACHE' },
          })
        }

        // Fallback: cache table not seeded yet, read from GitHub Pages JSON
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
        const cached = await readCache('crawler-stats-daily-30')
        if (cached) {
          return NextResponse.json(cached, {
            headers: { ...CORS, 'Cache-Control': 'public, max-age=300', 'X-Cache': 'PRECOMPUTED' },
          })
        }
        result = { error: 'Pre-computed cache not available', note: 'Run crawler_stats_precompute.py' }
        break
      }

      case 'spider-web': {
        const cached = await readCache('crawler-stats-spider-web-30')
        if (cached) {
          return NextResponse.json(cached, {
            headers: { ...CORS, 'Cache-Control': 'public, max-age=300', 'X-Cache': 'PRECOMPUTED' },
          })
        }
        result = { error: 'Pre-computed cache not available', note: 'Run crawler_stats_precompute.py' }
        break
      }

      // ── Live aggregated summary — reads crawler_stats_cache (pg_cron refreshes every 5 min) ───
      case 'live-summary': {
        const since30 = new Date(Date.now() - 30 * 86400000).toISOString()

        // Primary: read from crawler_stats_cache (single-row, always fresh within 5 min)
        const { data: cacheRow, error: cacheErr } = await supabase
          .from('crawler_stats_cache')
          .select('*')
          .eq('id', 1)
          .single()

        if (!cacheErr && cacheRow && cacheRow.total_visits_30d > 0) {
          result = {
            period: { since: since30, days: 30 },
            total_visits: cacheRow.total_visits_30d,
            today_visits: cacheRow.total_visits_1d,
            unique_bots: cacheRow.unique_bots,
            bots: cacheRow.bots_breakdown || {},
            sites: cacheRow.sites_breakdown || {},
            site_sample_total: cacheRow.total_visits_30d,
            industries: cacheRow.industries_breakdown || {},
            daily: cacheRow.daily_30d || {},
            daily_by_owner: cacheRow.daily_by_owner_30d || null,
            generated_at: cacheRow.generated_at,
          }
        }

        // Fallback: cache table missing, call RPC directly
        if (!result) {
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

      case 'session-count': {
        // Lightweight COUNT DISTINCT for session count (used by precompute script)
        const since30 = new Date(Date.now() - 30 * 86400000).toISOString()
        const { count: sessionCount } = await supabase
          .from('crawler_visits')
          .select('session_id', { count: 'exact', head: true })
          .gte('ts', since30)
          .not('session_id', 'is', null)
        result = { unique_sessions: sessionCount || 0 }
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

      case 'insight-categories': {
        // Get top insight URLs from crawler_visits (last N days)
        const { data: visitData } = await supabase
          .from('crawler_visits')
          .select('path, bot_name')
          .eq('page_type', 'insight')
          .gte('ts', since)
          .order('ts', { ascending: false })
          .limit(5000)

        // Aggregate visits per slug
        const slugVisits: Record<string, { count: number; bots: Set<string> }> = {}
        for (const v of visitData || []) {
          const slug = v.path.split('/').filter(Boolean).pop()
          if (!slug) continue
          if (!slugVisits[slug]) slugVisits[slug] = { count: 0, bots: new Set() }
          slugVisits[slug].count++
          slugVisits[slug].bots.add(v.bot_name)
        }

        // Get insight metadata for top visited slugs
        const topSlugs = Object.entries(slugVisits)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 300)
          .map(([slug]) => slug)

        const { data: insightData } = await supabase
          .from('insights')
          .select('slug, title, tags, related_industries, lang')
          .in('slug', topSlugs)

        // Aggregate by tag
        const tagStats: Record<string, { count: number; bots: Set<string>; slugs: string[] }> = {}
        const langStats: Record<string, number> = {}
        const industryStats: Record<string, { count: number; bots: Set<string> }> = {}

        for (const insight of insightData || []) {
          const visits = slugVisits[insight.slug]
          if (!visits) continue

          // By tag
          for (const tag of (insight.tags || [])) {
            if (!tagStats[tag]) tagStats[tag] = { count: 0, bots: new Set(), slugs: [] }
            tagStats[tag].count += visits.count
            for (const b of visits.bots) tagStats[tag].bots.add(b)
            if (tagStats[tag].slugs.length < 5) tagStats[tag].slugs.push(insight.slug)
          }

          // By related_industries
          for (const ind of (insight.related_industries || [])) {
            if (!industryStats[ind]) industryStats[ind] = { count: 0, bots: new Set() }
            industryStats[ind].count += visits.count
            for (const b of visits.bots) industryStats[ind].bots.add(b)
          }

          // By language
          langStats[insight.lang] = (langStats[insight.lang] || 0) + visits.count
        }

        result = {
          period: { since, days },
          total_insight_visits: Object.values(slugVisits).reduce((s, v) => s + v.count, 0),
          by_tag: Object.fromEntries(
            Object.entries(tagStats)
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 60)
              .map(([tag, info]) => [tag, { count: info.count, unique_bots: info.bots.size, top_slugs: info.slugs }])
          ),
          by_industry: Object.fromEntries(
            Object.entries(industryStats)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([ind, info]) => [ind, { count: info.count, unique_bots: info.bots.size }])
          ),
          by_lang: langStats,
          top_insights: Object.entries(slugVisits)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 50)
            .map(([slug, info]) => {
              const ins = insightData?.find(i => i.slug === slug)
              return {
                slug,
                title: ins?.title || slug,
                visits: info.count,
                unique_bots: info.bots.size,
                tags: ins?.tags || [],
                lang: ins?.lang || 'zh',
              }
            }),
          generated_at: new Date().toISOString(),
        }
        break
      }

      default:
        return NextResponse.json(
          { error: 'Invalid view. Use: summary, live-summary, bots, pages, sessions, session-count, journey, spider-web, daily, insight-categories' },
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
