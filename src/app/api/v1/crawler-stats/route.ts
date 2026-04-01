import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  const isInternal = referer.includes('cloudpipe-macao-app') || referer.includes('localhost') || token === 'cloudpipe2026'
  if (!isInternal && !token) {
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
        const cached = await readCache('crawler-stats-summary-30')
        if (cached) {
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
          { error: 'Invalid view. Use: summary, bots, pages, sessions, journey, spider-web, daily' },
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
