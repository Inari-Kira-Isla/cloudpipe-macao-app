/**
 * Cross-region "all insights" sub-sitemap.
 *
 * Built 2026-05-13 to fix the 33h-cached 404 introduced by commit 9c438c3
 * (split /macao/insights/ into 5 region routes without adding sub-sitemaps).
 * Aggregates published insights across all 5 regions and emits region-aware
 * URLs that match the actual page routes:
 *   MO → /macao/insights/{slug}        HK → /hongkong/insights/{slug}
 *   TW → /taiwan/insights/{slug}       JP → /japan/insights/{slug}
 *   GLOBAL → /global/insights/{slug}
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

export const dynamic = 'force-dynamic' // skip build-time prerender; CDN caches via Cache-Control header
export const maxDuration = 300 // Vercel max — 44 pages × ~30s worst-case page latency must fit (root cause: 120s budget killed mid-loop under crawl load → incomplete/empty cache)

interface AllInsightRow {
  slug: string | null
  updated_at: string | null
  region: string | null
  lang: string | null
}

interface FetchResult {
  rows: AllInsightRow[]
  /** True only when the loop walked every page to completion (got a short final page). */
  complete: boolean
}

// Stop collecting once we approach the function budget so Vercel never kills the
// invocation mid-loop (which produced an incomplete/empty sitemap that the CDN
// then cached for up to 24h via stale-while-revalidate). 270s leaves headroom
// under the 300s maxDuration for filtering + XML rendering + response flush.
const WALL_CLOCK_BUDGET_MS = 270_000

async function fetchAllPublishedInsights(): Promise<FetchResult> {
  const rows: AllInsightRow[] = []
  let offset = 0
  let consecutiveErrors = 0
  let complete = false
  const startedAt = Date.now()

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (Date.now() - startedAt > WALL_CLOCK_BUDGET_MS) break // budget guard: never get killed mid-page
    try {
      const { data, error } = await createSitemapServiceClient()
        .from('insights')
        .select('slug, updated_at, region, lang')
        .eq('status', 'published')
        // Tiered exposure (Fable 裁決④: demote not delete) — only A-tier
        // (trust_score ≥ 70) insights are surfaced to AI crawlers. NULL trust
        // (未評分) is intentionally excluded: unscored ≠ A-tier qualified.
        // As of 2026-06-19 every published row is already trust≥70 (G1 campaign),
        // so this is a safety filter, not a row reducer — ~43.8K rows / 44 pages.
        .gte('trust_score', 70)
        .order('id', { ascending: true })
        .range(offset, offset + 999)

      if (error || !data) {
        consecutiveErrors++
        if (consecutiveErrors >= 3) break  // give up after 3 transient failures (returns partial; completeness=false)
        await new Promise(r => setTimeout(r, 800 * consecutiveErrors))
        continue // retry the SAME offset — do not advance past a failed page
      }

      consecutiveErrors = 0
      if (data.length === 0) { complete = true; break }
      rows.push(...(data as AllInsightRow[]))
      if (data.length < 1000) { complete = true; break } // short page = last page = walked to the end
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

  const { rows, complete } = await fetchAllPublishedInsights()

  // Guard: if the pagination did NOT walk to completion (DB error, per-page
  // timeout, or wall-clock budget hit), OR returned critically few rows, return
  // a NON-CACHEABLE 503. This is the core fix for the "HTTP 200 + empty <loc> +
  // 34.5s" production failure: previously an incomplete/empty result could still
  // render a 200 XML body that the CDN cached for up to 24h (stale-while-
  // revalidate=86400), starving AI crawlers of the primary insights sitemap
  // (first entry in robots.txt). A 503 with no-store tells the CDN to keep the
  // last GOOD copy and lets the next ISR/crawler hit retry a full regeneration.
  if (!complete || rows.length < 500) {
    return new Response('Service temporarily unavailable — sitemap regeneration incomplete, retry shortly', {
      status: 503,
      headers: {
        'Retry-After': '120',
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
      },
    })
  }

  const nowMs = Date.now()
  const urls = rows
    .filter((r): r is AllInsightRow & { slug: string } => Boolean(r.slug))
    // Region whitelist: DROP rows whose region has no live route on this project
    // (MY/JBL/NULL/'macao'/'MO/SG'). The [slug] page is region-scoped, so these
    // 404 under both /malaysia/ and the /macao/ fallback — omit them entirely so
    // no dead 404 links reach AI crawlers. (MY content is served by a separate
    // Vercel project with its own sitemap.)
    .filter((r) => hasInsightRoute(r.region))
    // Lang whitelist: DROP rows whose lang has no live route (e.g. 'zh-TW' brand
    // duplicates). buildInsightLoc would emit /{seg}/zh-TW/insights/... which 404s
    // (no such route). The canonical lang='zh' sibling row already covers the
    // content at /{seg}/insights/{slug}, so no coverage is lost. (2026-06-11)
    .filter((r) => hasInsightLangRoute(r.lang))
    .map((r) => {
      const region = toRoutedRegion(r.region)
      const lang = r.lang || 'zh'

      // 按文章新舊分層 changefreq：7天內=daily；30天內=daily；更舊=weekly
      // 確保 AI 爬蟲每日持續抓新文章而非每週才回來
      const ageDays = r.updated_at
        ? (nowMs - new Date(r.updated_at).getTime()) / 86400000
        : 999
      const changefreq = ageDays < 30 ? 'daily' : 'weekly'
      const basePri = lang === 'zh' ? (ageDays < 7 ? 0.98 : ageDays < 30 ? 0.95 : 0.85)
                                    : (ageDays < 7 ? 0.93 : ageDays < 30 ? 0.90 : 0.80)

      return {
        loc: buildInsightLoc(siteUrl, region, r.slug, lang),
        lastmod: r.updated_at ? r.updated_at.split('T')[0] : now,
        changefreq,
        priority: basePri.toFixed(2),
      }
    })

  // Final defensive guard: a complete fetch of 43K+ rows must yield URLs after
  // filtering. If it somehow renders empty (e.g. future region/lang route drift
  // drops every row), emit a non-cacheable 503 rather than a 200 empty sitemap —
  // an empty <urlset> served as 200 is exactly what poisons AI crawler discovery.
  if (urls.length === 0) {
    return new Response('Service temporarily unavailable — no routable insight URLs, retry shortly', {
      status: 503,
      headers: {
        'Retry-After': '120',
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
      },
    })
  }

  return new Response(renderUrlsetXml(urls), { headers: SITEMAP_HEADERS })
}
