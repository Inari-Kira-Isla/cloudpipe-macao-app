import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 120
export const maxDuration = 30

const CACHE_BASE = 'https://rgpxdhczlxkak6zh.public.blob.vercel-storage.com/api-cache'

// Kept in sync with SOURCE_META in ~/.openclaw/workspace/scripts/crawler_stats_precompute.py
// (precompute_ai_referrals) — that script backs the 30-day dashboard view via the Blob
// cache, this object backs the 1-day/7-day views (live Supabase query, no cache), so both
// paths must show the same unverified/note treatment for the same bucket.
const SOURCE_LABELS: Record<string, { label: string; color: string; icon: string; unverified?: boolean; note?: string }> = {
  perplexity: { label: 'Perplexity',  color: '#20b2aa', icon: '🔍' },
  chatgpt:    { label: 'ChatGPT',     color: '#10a37f', icon: '🤖' },
  claude:     { label: 'Claude',      color: '#c5a572', icon: '🧠' },
  gemini:     { label: 'Gemini',      color: '#4285f4', icon: '✨' },
  copilot:    { label: 'Bing / Copilot（未分辨）', color: '#0078d4', icon: '🪟',
                unverified: true,
                note: 'ai-referrers.ts 已於 2026-09-12 修正分類器（只認 copilot.microsoft.com，唔再將 bing.com 自然搜尋計落 Copilot）；此 unverified 標記保留係因為修復前寫入嘅歷史 ai_referrals rows 可能仍然沿用舊分類器誤標，新寫入嘅 rows 已用修正後嘅分類器。' },
  grok:       { label: 'X / Grok（未分辨）', color: '#1da1f2', icon: '𝕏',
                unverified: true,
                note: 'ai-referrers.ts 已於 2026-09-12 修正分類器（只認 grok.com/grok.x.ai，唔再將 x.com/twitter.com 一般瀏覽點擊計落 Grok）；此 unverified 標記保留係因為修復前寫入嘅歷史 ai_referrals rows 可能仍然沿用舊分類器誤標，新寫入嘅 rows 已用修正後嘅分類器。' },
  you:        { label: 'You.com',     color: '#6366f1', icon: '🔎' },
  kagi:       { label: 'Kagi',        color: '#f59e0b', icon: '🔱' },
  phind:      { label: 'Phind',       color: '#7c3aed', icon: '💡' },
  other_ai:   { label: 'Other AI',    color: '#6b7280', icon: '🤖' },
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') ?? '30')
  const site = searchParams.get('site') ?? 'cloudpipe-macao-app'

  // Primary: precomputed GitHub Pages cache (zero Supabase, generated every 30 min)
  // Only for default site + standard window (dashboard always uses these)
  if (site === 'cloudpipe-macao-app' && days === 30) {
    try {
      const res = await fetch(`${CACHE_BASE}/ai-referrals-30.json`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data && typeof data.total === 'number') {
          return NextResponse.json(data, {
            headers: { 'Cache-Control': 'public, max-age=120', 'X-Cache': 'PRECOMPUTED' },
          })
        }
      }
    } catch { /* fall through to Supabase */ }
  }

  // Fallback: live Supabase query (for non-standard days or cache miss)
  const supabase = createServiceClient()
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data, error } = await supabase
    .from('ai_referrals')
    .select('*')
    .eq('site', site)
    .gte('ts', since)
    .order('ts', { ascending: false })
    .limit(1000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Bug fix: exclude any rows where ua_raw indicates a bot (e.g. PerplexityBot accidentally
  // inserted if bot-detection missed a UA variant). Only real human referrals should appear.
  const BOT_UA_RE = /bot|crawler|spider|scraper|perplexitybot|googlebot|gptbot|claudebot|bingbot|yandexbot|applebot|amazonbot|meta-externalagent|facebookbot|bytespider/i
  const rows = (data ?? []).filter(r => {
    const ua = r.ua_raw ?? ''
    return !BOT_UA_RE.test(ua)
  })

  // Aggregate by source
  const bySource: Record<string, { count: number; pages: Record<string, number>; industries: Record<string, number>; latest: string }> = {}
  for (const row of rows) {
    const src = row.referrer_source ?? 'other_ai'
    if (!bySource[src]) bySource[src] = { count: 0, pages: {}, industries: {}, latest: row.ts }
    bySource[src].count++
    bySource[src].pages[row.path] = (bySource[src].pages[row.path] ?? 0) + 1
    if (row.industry) bySource[src].industries[row.industry] = (bySource[src].industries[row.industry] ?? 0) + 1
    if (row.ts > bySource[src].latest) bySource[src].latest = row.ts
  }

  // Top pages overall
  const topPages: Record<string, { visits: number; sources: string[] }> = {}
  for (const row of rows) {
    if (!topPages[row.path]) topPages[row.path] = { visits: 0, sources: [] }
    topPages[row.path].visits++
    const src = row.referrer_source ?? 'other_ai'
    if (!topPages[row.path].sources.includes(src)) topPages[row.path].sources.push(src)
  }

  // Daily trend (last 14 days)
  const daily: Record<string, Record<string, number>> = {}
  for (const row of rows) {
    const day = row.ts.slice(0, 10)
    if (!daily[day]) daily[day] = {}
    const src = row.referrer_source ?? 'other_ai'
    daily[day][src] = (daily[day][src] ?? 0) + 1
  }

  // Sort top pages
  const sortedPages = Object.entries(topPages)
    .sort((a, b) => b[1].visits - a[1].visits)
    .slice(0, 20)
    .map(([path, data]) => ({ path, ...data }))

  return NextResponse.json({
    total: rows.length,
    days,
    since,
    by_source: bySource,
    source_meta: SOURCE_LABELS,
    top_pages: sortedPages,
    daily,
    recent: rows.slice(0, 50).map(r => ({
      ts: r.ts,
      source: r.referrer_source,
      path: r.path,
      page_type: r.page_type,
      industry: r.industry,
    })),
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
  })
}
