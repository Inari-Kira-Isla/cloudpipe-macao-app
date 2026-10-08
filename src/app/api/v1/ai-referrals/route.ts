import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { aggregateAiReferrals, type SourceMeta } from '@/lib/ai-referrals-aggregate'

export const revalidate = 120
export const maxDuration = 30

const CACHE_BASE = 'https://rgpxdhczlxkak6zh.public.blob.vercel-storage.com/api-cache'

// Labels for the live (non-30-day) path. The 30-day path serves the precomputed Blob
// (precompute_ai_referrals in ~/.openclaw/workspace/scripts/crawler_stats_precompute.py),
// which still labels the copilot bucket 'Bing / Copilot（未分辨）' because it does not yet
// re-verify rows by referrer_url.
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

  // Aggregation + read-time re-verification of the copilot/grok buckets lives in a pure lib
  // module (unit-tested); see ai-referrals-aggregate.ts for why historical rows need it.
  return NextResponse.json(aggregateAiReferrals(rows, days, since, SOURCE_LABELS), {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
  })
}
