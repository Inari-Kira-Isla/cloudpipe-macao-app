import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CACHE_BASE = 'https://inari-kira-isla.github.io/Openclaw/api-cache'

/**
 * GET /api/v1/merchant-discovery
 *
 * Reads pre-computed data from GitHub Pages static JSON (written by local cron every 5 min).
 * No heavy aggregation queries — just a static file fetch.
 */
export async function GET(req: NextRequest) {
  try {
    // Primary: GitHub Pages static JSON
    const res = await fetch(`${CACHE_BASE}/merchant-discovery-30.json`, {
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
        .eq('key', 'merchant-discovery-30')
        .single()
      if (data?.data) {
        return NextResponse.json(data.data, {
          headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300', 'X-Cache': 'SUPABASE' },
        })
      }
    } catch {}

    return NextResponse.json({
      days: 30,
      summary: { totalTracked: 0, note: 'Cache not available. Run crawler_stats_precompute.py.' },
      merchants: [],
    }, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
