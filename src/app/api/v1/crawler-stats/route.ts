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
 *   view=summary|bots|pages|sessions|journey  (default: summary)
 *   bot=GPTBot                                 (filter by bot name)
 *   days=7                                     (lookback window, default 30)
 *   path=/macao/dining                         (filter by path prefix)
 *   session=<session_id>                       (get full session journey)
 *   limit=50                                   (max results)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const view = searchParams.get('view') || 'summary'
  const bot = searchParams.get('bot')
  const days = parseInt(searchParams.get('days') || '30', 10)
  const pathFilter = searchParams.get('path')
  const sessionId = searchParams.get('session')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)

  const since = new Date(Date.now() - days * 86400000).toISOString()

  try {
    let result: unknown

    switch (view) {
      case 'summary': {
        // Overall stats: total visits, unique bots, top pages, top bots
        const { data: visits } = await supabase
          .from('crawler_visits')
          .select('bot_name, bot_owner, path, page_type, industry')
          .gte('ts', since)

        if (!visits?.length) {
          result = { total_visits: 0, unique_bots: 0, bots: {}, pages: {}, industries: {}, page_types: {} }
          break
        }

        const botCounts: Record<string, { count: number; owner: string }> = {}
        const pageCounts: Record<string, number> = {}
        const industryCounts: Record<string, number> = {}
        const pageTypeCounts: Record<string, number> = {}

        for (const v of visits) {
          botCounts[v.bot_name] = botCounts[v.bot_name] || { count: 0, owner: v.bot_owner }
          botCounts[v.bot_name].count++
          pageCounts[v.path] = (pageCounts[v.path] || 0) + 1
          if (v.industry) industryCounts[v.industry] = (industryCounts[v.industry] || 0) + 1
          pageTypeCounts[v.page_type] = (pageTypeCounts[v.page_type] || 0) + 1
        }

        // Sort and take top entries
        const sortObj = (obj: Record<string, number>, n: number) =>
          Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n)

        result = {
          period: { since, days },
          total_visits: visits.length,
          unique_bots: Object.keys(botCounts).length,
          unique_sessions: new Set(visits.map(() => '')).size, // placeholder
          bots: Object.fromEntries(
            Object.entries(botCounts)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([name, { count, owner }]) => [name, { count, owner }])
          ),
          top_pages: Object.fromEntries(sortObj(pageCounts, 20)),
          industries: Object.fromEntries(sortObj(industryCounts, 20)),
          page_types: Object.fromEntries(sortObj(pageTypeCounts, 10)),
        }
        break
      }

      case 'bots': {
        // Per-bot breakdown with daily counts
        let query = supabase
          .from('crawler_visits')
          .select('bot_name, bot_owner, ts, path')
          .gte('ts', since)
          .order('ts', { ascending: false })
          .limit(limit)

        if (bot) query = query.eq('bot_name', bot)
        const { data } = await query
        result = { count: data?.length || 0, visits: data }
        break
      }

      case 'pages': {
        // Per-page visit counts
        const { data: visits } = await supabase
          .from('crawler_visits')
          .select('path, bot_name, industry, category, page_type')
          .gte('ts', since)

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
          .select('session_id, bot_name, bot_owner, path, ts, referer')
          .gte('ts', since)
          .order('ts', { ascending: false })

        if (bot) query = query.eq('bot_name', bot)
        const { data: visits } = await query

        const sessions: Record<string, {
          bot: string; owner: string; pages: number;
          first_ts: string; last_ts: string; paths: string[]
        }> = {}

        for (const v of (visits || [])) {
          if (!v.session_id) continue
          if (!sessions[v.session_id]) {
            sessions[v.session_id] = {
              bot: v.bot_name, owner: v.bot_owner,
              pages: 0, first_ts: v.ts, last_ts: v.ts, paths: [],
            }
          }
          const s = sessions[v.session_id]
          s.pages++
          if (v.ts < s.first_ts) s.first_ts = v.ts
          if (v.ts > s.last_ts) s.last_ts = v.ts
          s.paths.push(v.path)
        }

        result = Object.entries(sessions)
          .sort((a, b) => b[1].pages - a[1].pages)
          .slice(0, limit)
          .map(([id, s]) => ({ session_id: id, ...s, paths: s.paths.slice(0, 50) }))
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
          })),
        }
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid view. Use: summary, bots, pages, sessions, journey' }, { status: 400 })
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
