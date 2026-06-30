/**
 * B-tier sub-sitemap — trust_score >= 70 AND trust_score < 85 (approx. 19K rows).
 *
 * Standard-indexed content, surfaced after A-tier in sitemap_index.xml.
 * Uses the same wall-clock-budget + 503-guard pattern as sitemap-insights.xml.
 *
 * Cache-Control: max-age=7200 (2h ISR) — B-tier content is more stable than
 * A-tier; longer cache reduces revalidation pressure while still refreshing
 * within the stale-while-revalidate=86400 window.
 */
import { createSitemapServiceClient } from '@/lib/supabase'
import {
  hasInsightRoute,
  hasInsightLangRoute,
  toRoutedRegion,
  buildInsightLoc,
  renderUrlsetXml,
} from '@/lib/sitemap-region'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

interface StandardInsightRow {
  slug: string | null
  updated_at: string | null
  region: string | null
  lang: string | null
}

interface FetchResult {
  rows: StandardInsightRow[]
  complete: boolean
}

const WALL_CLOCK_BUDGET_MS = 270_000

async function fetchStandardInsights(): Promise<FetchResult> {
  const rows: StandardInsightRow[] = []
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
        .gte('trust_score', 70)
        .lt('trust_score', 85)
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
      rows.push(...(data as StandardInsightRow[]))
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

  const { rows, complete } = await fetchStandardInsights()

  // 503 guard: B-tier expects ~19K rows; fewer than 100 indicates DB error or
  // budget exhaustion before first page completed.
  if (!complete || rows.length < 100) {
    return new Response('Service temporarily unavailable — B-tier sitemap regeneration incomplete, retry shortly', {
      status: 503,
      headers: {
        'Retry-After': '120',
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
      },
    })
  }

  const urls = rows
    .filter((r): r is StandardInsightRow & { slug: string } => Boolean(r.slug))
    .filter((r) => hasInsightRoute(r.region))
    .filter((r) => hasInsightLangRoute(r.lang))
    .map((r) => {
      const region = toRoutedRegion(r.region)
      const lang = r.lang || 'zh'
      return {
        loc: buildInsightLoc(siteUrl, region, r.slug!, lang),
        lastmod: r.updated_at ? r.updated_at.split('T')[0] : now,
        changefreq: 'weekly',
        priority: '0.6',
      }
    })

  if (urls.length === 0) {
    return new Response('Service temporarily unavailable — no routable B-tier insight URLs, retry shortly', {
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
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=7200, stale-while-revalidate=86400',
    },
  })
}
