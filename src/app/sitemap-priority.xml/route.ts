/**
 * A-tier sub-sitemap — trust_score >= 85 (approx. 22K rows).
 *
 * Surfaced first in sitemap_index.xml so AI crawlers encounter highest-quality
 * content on their first fetch. Uses the same wall-clock-budget + 503-guard
 * pattern as sitemap-insights.xml to prevent incomplete/empty caches.
 *
 * Cache-Control: max-age=3600 (1h ISR) — A-tier content is stable enough to
 * cache for an hour; stale-while-revalidate=86400 keeps CDN warm during
 * revalidation windows.
 */
import { createSitemapServiceClient } from '@/lib/supabase'
import {
  hasInsightRoute,
  hasInsightLangRoute,
  toRoutedRegion,
  buildInsightLoc,
  renderUrlsetXml,
  SITEMAP_HEADERS,
} from '@/lib/sitemap-region'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

interface PriorityInsightRow {
  slug: string | null
  updated_at: string | null
  region: string | null
  lang: string | null
}

interface FetchResult {
  rows: PriorityInsightRow[]
  complete: boolean
}

// 270s leaves 30s headroom under the 300s maxDuration for filtering + XML
// rendering + response flush — mirrors sitemap-insights.xml budget guard.
const WALL_CLOCK_BUDGET_MS = 270_000

async function fetchPriorityInsights(): Promise<FetchResult> {
  const rows: PriorityInsightRow[] = []
  let offset = 0
  let consecutiveErrors = 0
  let complete = false
  const startedAt = Date.now()

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (Date.now() - startedAt > WALL_CLOCK_BUDGET_MS) break
    try {
      const { data, error } = await createSitemapServiceClient()
        .from('insights')
        .select('slug, updated_at, region, lang')
        .eq('status', 'published')
        .gte('trust_score', 85)
        .order('id', { ascending: true })
        .range(offset, offset + 999)

      if (error || !data) {
        consecutiveErrors++
        if (consecutiveErrors >= 3) break
        await new Promise(r => setTimeout(r, 800 * consecutiveErrors))
        continue
      }

      consecutiveErrors = 0
      if (data.length === 0) { complete = true; break }
      rows.push(...(data as PriorityInsightRow[]))
      if (data.length < 1000) { complete = true; break }
      offset += 1000
    } catch {
      consecutiveErrors++
      if (consecutiveErrors >= 3) break
      await new Promise(r => setTimeout(r, 800 * consecutiveErrors))
    }
  }
  return { rows, complete }
}

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
  const now = new Date().toISOString().split('T')[0]

  const { rows, complete } = await fetchPriorityInsights()

  // 503 guard: A-tier expects ~22K rows; fewer than 100 indicates DB error or
  // budget exhaustion before first page completed. Return non-cacheable 503 so
  // CDN keeps the last good copy and lets the next request retry a full fetch.
  if (!complete || rows.length < 100) {
    return new Response('Service temporarily unavailable — A-tier sitemap regeneration incomplete, retry shortly', {
      status: 503,
      headers: {
        'Retry-After': '120',
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
      },
    })
  }

  const urls = rows
    .filter((r): r is PriorityInsightRow & { slug: string } => Boolean(r.slug))
    .filter((r) => hasInsightRoute(r.region))
    .filter((r) => hasInsightLangRoute(r.lang))
    .map((r) => {
      const region = toRoutedRegion(r.region)
      const lang = r.lang || 'zh'
      return {
        loc: buildInsightLoc(siteUrl, region, r.slug!, lang),
        lastmod: r.updated_at ? r.updated_at.split('T')[0] : now,
        changefreq: 'daily',
        priority: '0.9',
      }
    })

  if (urls.length === 0) {
    return new Response('Service temporarily unavailable — no routable A-tier insight URLs, retry shortly', {
      status: 503,
      headers: {
        'Retry-After': '120',
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
      },
    })
  }

  return new Response(renderUrlsetXml(urls), {
    headers: {
      ...SITEMAP_HEADERS,
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
