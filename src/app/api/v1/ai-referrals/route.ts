import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { aiReferralsCacheFile } from '@/lib/ai-referrals-windows'

// READ-ONLY CACHE ROUTE — this route (and the dashboard page) must NEVER query Supabase.
// (guarded by src/lib/dashboard-no-supabase.test.ts)
//
// Data flow: Supabase ai_referrals -> local mirror (crawler_local_sync.py) -> scripts/precompute_ai_referrals_v2.py
// (re-verifies copilot/grok/kagi rows by referrer_url host, using the same classifier code as the app)
// -> ai-referrals-v2-{1,7,30,90,all}.json on Vercel Blob -> this route / the dashboard page.
//
// History: origin/main served 30 days from a precomputed Blob (ai-referrals-30.json, NOT re-verified: bing.com counted
// as Copilot) and every other window via a live `ai_referrals` select (limit 1000) on each request (s-maxage 120).
// That live path is removed; unsupported windows now get 400 instead of hitting the database.
const CACHE_BASE = 'https://rgpxdhczlxkak6zh.public.blob.vercel-storage.com/api-cache'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') ?? '30')
  const site = searchParams.get('site') ?? 'cloudpipe-macao-app'
  const fname = aiReferralsCacheFile(days)
  if (!fname || site !== 'cloudpipe-macao-app') {
    return NextResponse.json({ error: 'unsupported window; use days=1|7|30|90|3650 (cached windows only)' }, { status: 400 })
  }
  try {
    // Local preview / tests: AI_REFERRALS_CACHE_DIR points at a folder of sample caches (never set on Vercel).
    const dir = process.env.AI_REFERRALS_CACHE_DIR
    const data = dir
      ? JSON.parse(await readFile(join(dir, fname), 'utf8'))
      : await (async () => {
          const res = await fetch(`${CACHE_BASE}/${fname}`, { next: { revalidate: 300 } })
          if (!res.ok) throw new Error(`cache ${res.status}`)
          return res.json()
        })()
    if (!data || typeof data.total !== 'number') throw new Error('bad cache shape')
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900', 'X-Cache': 'PRECOMPUTED-V2' } })
  } catch {
    return NextResponse.json({ error: 'ai-referrals cache not available yet' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
