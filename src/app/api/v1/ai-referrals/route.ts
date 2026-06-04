import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// Removed `force-dynamic` so Vercel CDN can cache by URL.
// Freshness is bounded by `s-maxage=120` below; client sends `cache: 'no-store'`
// so the dashboard "立即重新整理" button still bypasses CDN when needed.
export const revalidate = 120
export const maxDuration = 30

const SOURCE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  perplexity: { label: 'Perplexity',  color: '#20b2aa', icon: '🔍' },
  chatgpt:    { label: 'ChatGPT',     color: '#10a37f', icon: '🤖' },
  claude:     { label: 'Claude',      color: '#c5a572', icon: '🧠' },
  gemini:     { label: 'Gemini',      color: '#4285f4', icon: '✨' },
  copilot:    { label: 'Copilot',     color: '#0078d4', icon: '🪟' },
  grok:       { label: 'Grok',        color: '#1da1f2', icon: '𝕏' },
  you:        { label: 'You.com',     color: '#6366f1', icon: '🔎' },
  kagi:       { label: 'Kagi',        color: '#f59e0b', icon: '🔱' },
  phind:      { label: 'Phind',       color: '#7c3aed', icon: '💡' },
  other_ai:   { label: 'Other AI',    color: '#6b7280', icon: '🤖' },
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') ?? '30')
  const site = searchParams.get('site') ?? 'cloudpipe-macao-app'

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
