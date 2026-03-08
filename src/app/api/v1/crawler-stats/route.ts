import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/v1/crawler-stats
 *
 * Query params:
 *   view=summary|bots|pages|sessions|journey|spider-web  (default: summary)
 *   bot=GPTBot                                 (filter by bot name)
 *   days=7                                     (lookback window, default 30)
 *   path=/macao/dining                         (filter by path prefix)
 *   session=<session_id>                       (get full session journey)
 *   site=yamanakada                            (filter by site, omit for all)
 *   limit=50                                   (max results)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const view = searchParams.get('view') || 'summary'
  const bot = searchParams.get('bot')
  const days = parseInt(searchParams.get('days') || '30', 10)
  const pathFilter = searchParams.get('path')
  const sessionId = searchParams.get('session')
  const siteFilter = searchParams.get('site')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)

  const since = new Date(Date.now() - days * 86400000).toISOString()

  try {
    let result: unknown

    switch (view) {
      case 'summary': {
        // Overall stats: total visits, unique bots, top pages, top bots
        let summaryQuery = supabase
          .from('crawler_visits')
          .select('bot_name, bot_owner, path, page_type, industry, site, session_id')
          .gte('ts', since)
        if (siteFilter) summaryQuery = summaryQuery.eq('site', siteFilter)
        const { data: visits } = await summaryQuery

        if (!visits?.length) {
          result = { total_visits: 0, unique_bots: 0, bots: {}, pages: {}, industries: {}, page_types: {}, sites: {} }
          break
        }

        const botCounts: Record<string, { count: number; owner: string }> = {}
        const pageCounts: Record<string, number> = {}
        const industryCounts: Record<string, number> = {}
        const pageTypeCounts: Record<string, number> = {}
        const siteCounts: Record<string, number> = {}
        const sessionIds = new Set<string>()

        for (const v of visits) {
          botCounts[v.bot_name] = botCounts[v.bot_name] || { count: 0, owner: v.bot_owner }
          botCounts[v.bot_name].count++
          pageCounts[v.path] = (pageCounts[v.path] || 0) + 1
          if (v.industry) industryCounts[v.industry] = (industryCounts[v.industry] || 0) + 1
          pageTypeCounts[v.page_type] = (pageTypeCounts[v.page_type] || 0) + 1
          const site = v.site || 'cloudpipe-macao-app'
          siteCounts[site] = (siteCounts[site] || 0) + 1
          if (v.session_id) sessionIds.add(v.session_id)
        }

        const sortObj = (obj: Record<string, number>, n: number) =>
          Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n)

        result = {
          period: { since, days },
          total_visits: visits.length,
          unique_bots: Object.keys(botCounts).length,
          unique_sessions: sessionIds.size,
          bots: Object.fromEntries(
            Object.entries(botCounts)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([name, { count, owner }]) => [name, { count, owner }])
          ),
          top_pages: Object.fromEntries(sortObj(pageCounts, 20)),
          industries: Object.fromEntries(sortObj(industryCounts, 20)),
          page_types: Object.fromEntries(sortObj(pageTypeCounts, 10)),
          sites: Object.fromEntries(sortObj(siteCounts, 20)),
        }
        break
      }

      case 'bots': {
        // Per-bot breakdown with daily counts
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

      case 'pages': {
        // Per-page visit counts
        let pagesQuery = supabase
          .from('crawler_visits')
          .select('path, bot_name, industry, category, page_type, site')
          .gte('ts', since)
        if (siteFilter) pagesQuery = pagesQuery.eq('site', siteFilter)
        const { data: visits } = await pagesQuery

        const pageSummary: Record<string, { count: number; bots: Set<string>; industry: string | null; page_type: string }> = {}
        for (const v of (visits || [])) {
          if (pathFilter && !v.path.startsWith(pathFilter)) continue
          if (!pageSummary[v.path]) {
            pageSummary[v.path] = { count: 0, bots: new Set(), industry: v.industry, page_type: v.page_type }
          }
          pageSummary[v.path].count++
          pageSummary[v.path].bots.add(v.bot_name)
        }

        result = Object.entries(pageSummary)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, limit)
          .map(([path, info]) => ({
            path,
            visits: info.count,
            bots: [...info.bots],
            industry: info.industry,
            page_type: info.page_type,
          }))
        break
      }

      case 'sessions': {
        // List crawl sessions (grouped by session_id)
        let query = supabase
          .from('crawler_visits')
          .select('session_id, bot_name, bot_owner, path, ts, referer, site')
          .gte('ts', since)
          .order('ts', { ascending: false })

        if (bot) query = query.eq('bot_name', bot)
        if (siteFilter) query = query.eq('site', siteFilter)
        const { data: visits } = await query

        const sessions: Record<string, {
          bot: string; owner: string; pages: number;
          first_ts: string; last_ts: string; paths: string[]; sites: Set<string>
        }> = {}

        for (const v of (visits || [])) {
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
          s.paths.push(v.path)
          s.sites.add(v.site || 'cloudpipe-macao-app')
        }

        result = Object.entries(sessions)
          .sort((a, b) => b[1].pages - a[1].pages)
          .slice(0, limit)
          .map(([id, s]) => ({ session_id: id, ...s, paths: s.paths.slice(0, 50), sites: [...s.sites] }))
        break
      }

      case 'journey': {
        // Full journey for a specific session
        if (!sessionId) {
          return NextResponse.json({ error: 'session parameter required' }, { status: 400 })
        }

        const { data } = await supabase
          .from('crawler_visits')
          .select('*')
          .eq('session_id', sessionId)
          .order('ts', { ascending: true })

        result = {
          session_id: sessionId,
          total_pages: data?.length || 0,
          journey: (data || []).map(v => ({
            ts: v.ts,
            path: v.path,
            referer: v.referer,
            page_type: v.page_type,
            industry: v.industry,
            category: v.category,
            site: v.site || 'cloudpipe-macao-app',
          })),
        }
        break
      }

      case 'spider-web': {
        // Cross-site spider web traffic flow
        // Shows how bots traverse between sites in the ecosystem
        let swQuery = supabase
          .from('crawler_visits')
          .select('bot_name, bot_owner, path, referer, site, page_type, ts, session_id')
          .gte('ts', since)
          .order('ts', { ascending: false })

        if (bot) swQuery = swQuery.eq('bot_name', bot)
        const { data: visits } = await swQuery

        // Build site-to-site flow matrix
        const flows: Record<string, { count: number; bots: Set<string> }> = {}
        const siteVisits: Record<string, { total: number; bots: Set<string>; spider_web: number }> = {}
        const crossSiteSessions = new Set<string>()

        for (const v of (visits || [])) {
          const site = v.site || 'cloudpipe-macao-app'
          if (!siteVisits[site]) siteVisits[site] = { total: 0, bots: new Set(), spider_web: 0 }
          siteVisits[site].total++
          siteVisits[site].bots.add(v.bot_name)

          if (v.page_type === 'spider-web' && v.referer) {
            siteVisits[site].spider_web++
            // Determine source site from referer or industry field
            let fromSite = 'unknown'
            if (v.referer) {
              for (const knownSite of ['yamanakada', 'inari-global-foods', 'after-school-coffee', 'sea-urchin-delivery',
                'cloudpipe-macao-app', 'mind-coffee', 'bni-macau', 'test-cafe-demo',
                'aeo-demo-education', 'aeo-demo-finance', 'aeo-demo-luxury', 'aeo-demo-travel-food']) {
                if (v.referer.includes(knownSite)) { fromSite = knownSite; break }
              }
            }
            const flowKey = `${fromSite} → ${site}`
            if (!flows[flowKey]) flows[flowKey] = { count: 0, bots: new Set() }
            flows[flowKey].count++
            flows[flowKey].bots.add(v.bot_name)
            if (v.session_id) crossSiteSessions.add(v.session_id)
          }
        }

        result = {
          period: { since, days },
          cross_site_sessions: crossSiteSessions.size,
          flows: Object.entries(flows)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([flow, info]) => ({ flow, count: info.count, bots: [...info.bots] })),
          sites: Object.entries(siteVisits)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([site, info]) => ({
              site, total: info.total, spider_web: info.spider_web,
              bots: [...info.bots],
            })),
        }
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid view. Use: summary, bots, pages, sessions, journey, spider-web' }, { status: 400 })
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal error', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}
