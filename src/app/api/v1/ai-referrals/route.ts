import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { aggregateAiReferrals, type ReferralRow, type SourceMeta } from '@/lib/ai-referrals-aggregate'

export const revalidate = 120
export const maxDuration = 30

// PostgREST caps a single response at 1000 rows; page through up to MAX_ROWS so wide windows
// (days=3650 / 全部) are not silently cut at 1000. If MAX_ROWS is hit, `truncated: true` is returned.
const PAGE_SIZE = 1000
const MAX_ROWS = 5000

// Labels. EVERY window (30 / 90 / 全部) is served live with read-time referrer_url re-verification —
// the old 30-day shortcut (precomputed Blob ai-referrals-30.json from crawler_stats_precompute.py) was removed
// because that script does not select referrer_url, so it still counted bing.com as Copilot and made the
// 30-day figure (138) contradict the 90-day one (18). Nothing reads that Blob any more.
const SOURCE_LABELS: Record<string, SourceMeta> = {
  perplexity: { label: 'Perplexity',  color: '#20b2aa', icon: '🔍' },
  chatgpt:    { label: 'ChatGPT',     color: '#10a37f', icon: '🤖' },
  claude:     { label: 'Claude',      color: '#c5a572', icon: '🧠' },
  gemini:     { label: 'Gemini',      color: '#4285f4', icon: '✨' },
  // copilot/grok rows are re-verified against referrer_url at read time (aggregateAiReferrals),
  // so what remains in these buckets is genuinely copilot.microsoft.com / grok.com traffic.
  copilot:    { label: 'Copilot',     color: '#0078d4', icon: '🪟' },
  grok:       { label: 'Grok',        color: '#1da1f2', icon: '𝕏' },
  you:        { label: 'You.com',     color: '#6366f1', icon: '🔎' },
  kagi:       { label: 'Kagi',        color: '#f59e0b', icon: '🔱' },
  phind:      { label: 'Phind',       color: '#7c3aed', icon: '💡' },
  other_ai:   { label: 'Other AI',    color: '#6b7280', icon: '🤖' },
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const parsedDays = parseInt(searchParams.get('days') ?? '30')
  // Non-numeric / absurd values used to reach new Date(NaN).toISOString() and 500.
  const days = Number.isFinite(parsedDays) ? Math.min(Math.max(parsedDays, 1), 3650) : 30
  const site = searchParams.get('site') ?? 'cloudpipe-macao-app'

  const supabase = createServiceClient()
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const data: Record<string, unknown>[] = []
  let truncated = false
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data: page, error } = await supabase
      .from('ai_referrals')
      .select('ts, referrer_source, referrer_url, path, page_type, industry, ua_raw')
      .eq('site', site)
      .gte('ts', since)
      .order('ts', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    data.push(...(page ?? []))
    if ((page?.length ?? 0) < PAGE_SIZE) break
    if (from + PAGE_SIZE >= MAX_ROWS) truncated = true
  }

  // Bug fix: exclude any rows where ua_raw indicates a bot (e.g. PerplexityBot accidentally
  // inserted if bot-detection missed a UA variant). Only real human referrals should appear.
  const BOT_UA_RE = /bot|crawler|spider|scraper|perplexitybot|googlebot|gptbot|claudebot|bingbot|yandexbot|applebot|amazonbot|meta-externalagent|facebookbot|bytespider/i
  const rows = (data as unknown as (ReferralRow & { ua_raw?: string | null })[]).filter(r => !BOT_UA_RE.test(r.ua_raw ?? ''))

  // Aggregation + read-time re-verification of the copilot/grok buckets lives in a pure lib
  // module (unit-tested); see ai-referrals-aggregate.ts for why historical rows need it.
  return NextResponse.json({ ...aggregateAiReferrals(rows, days, since, SOURCE_LABELS), truncated }, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
  })
}
