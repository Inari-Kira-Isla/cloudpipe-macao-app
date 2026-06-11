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
  REGION_PATH,
  buildInsightLoc,
  renderUrlsetXml,
  SITEMAP_HEADERS,
  type SitemapRegion,
} from '@/lib/sitemap-region'

export const dynamic = 'force-dynamic' // skip build-time prerender; CDN caches via Cache-Control header
export const maxDuration = 120

interface AllInsightRow {
  slug: string | null
  updated_at: string | null
  region: string | null
  lang: string | null
}

async function fetchAllPublishedInsights(): Promise<AllInsightRow[]> {
  const rows: AllInsightRow[] = []
  let offset = 0
  let consecutiveErrors = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const { data, error } = await createSitemapServiceClient()
        .from('insights')
        .select('slug, updated_at, region, lang')
        .eq('status', 'published')
        // Tiered exposure (Fable 裁決④: demote not delete) — only A-tier
        // (trust_score ≥ 70) insights are surfaced to AI crawlers. NULL trust
        // (未評分) is intentionally excluded: unscored ≠ A-tier qualified.
        // ~8,095 rows pass as of 2026-06-11, far above the <500 → 503 guard.
        .gte('trust_score', 70)
        .order('id', { ascending: true })
        .range(offset, offset + 999)

      if (error || !data) {
        consecutiveErrors++
        if (rows.length > 0 || consecutiveErrors >= 3) break  // return partial on transient error
        await new Promise(r => setTimeout(r, 800 * consecutiveErrors))
        continue
      }

      consecutiveErrors = 0
      if (data.length === 0) break
      rows.push(...(data as AllInsightRow[]))
      if (data.length < 1000) break
      offset += 1000
    } catch {
      consecutiveErrors++
      if (rows.length > 0 || consecutiveErrors >= 3) break
      await new Promise(r => setTimeout(r, 800 * consecutiveErrors))
    }
  }
  return rows
}

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
  const now = new Date().toISOString().split('T')[0]

  const rows = await fetchAllPublishedInsights()

  // Guard: if DB returned critically few rows, return 503 so CDN doesn't cache
  // an empty/broken sitemap that would tank AI crawler discovery for hours.
  if (rows.length < 500) {
    return new Response('Service temporarily unavailable — DB load high, retry shortly', {
      status: 503,
      headers: { 'Retry-After': '120', 'Content-Type': 'text/plain' },
    })
  }

  const nowMs = Date.now()
  const urls = rows
    .filter((r): r is AllInsightRow & { slug: string } => Boolean(r.slug))
    .map((r) => {
      const regionUpper = (r.region || 'MO').toUpperCase()
      // Fallback to MO if region is somehow not in our 5-region map (defensive
      // — DB has 169 NULL-region rows as of 2026-05-13).
      const region: SitemapRegion = (regionUpper in REGION_PATH ? regionUpper : 'MO') as SitemapRegion
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

  return new Response(renderUrlsetXml(urls), { headers: SITEMAP_HEADERS })
}
