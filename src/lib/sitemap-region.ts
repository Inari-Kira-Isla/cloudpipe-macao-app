/**
 * Shared helpers for region-aware sub-sitemaps.
 *
 * Backing the 7 routes created on 2026-05-13 after commit 9c438c3 split
 * /macao/insights/ into 5 region routes (B+C migration) but did not add
 * corresponding sub-sitemap URLs — robots.txt / GSC / AI bots still hit
 * /sitemap-{mo,hk,tw,jp,world,insights}.xml and /sitemap_index.xml, all
 * of which returned 404 (cached ~33h) and crashed AI crawler discovery.
 *
 * Path mapping mirrors src/components/insight-region/InsightPageView.tsx
 *   MO → /macao,   HK → /hongkong,   TW → /taiwan,
 *   JP → /japan,   GLOBAL → /global
 */
import { createSitemapServiceClient } from '@/lib/supabase'

export type SitemapRegion = 'MO' | 'HK' | 'TW' | 'JP' | 'GLOBAL'

export const REGION_PATH: Record<SitemapRegion, string> = {
  MO: 'macao',
  HK: 'hongkong',
  TW: 'taiwan',
  JP: 'japan',
  GLOBAL: 'global',
}

export interface InsightRow {
  slug: string
  updated_at: string
  region: SitemapRegion | string | null
  lang: string
}

/**
 * Fetch every published insight for one region, paginated to bypass the
 * 1000-row PostgREST default limit. Service-role required (RLS blocks anon).
 */
export async function fetchInsightsByRegion(
  region: SitemapRegion,
): Promise<InsightRow[]> {
  const rows: InsightRow[] = []
  let offset = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await createSitemapServiceClient()
      .from('insights')
      .select('slug, updated_at, region, lang')
      .eq('status', 'published')
      .eq('region', region)
      .order('id', { ascending: true })
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    rows.push(...(data as InsightRow[]))
    if (data.length < 1000) break
    offset += 1000
  }
  return rows
}

/**
 * URL for one insight row — path-based lang routing (2026-05-27):
 *   zh  → /{seg}/insights/{slug}             (canonical)
 *   en  → /{seg}/en/insights/{slug}
 *   pt  → /{seg}/pt/insights/{slug}
 *   ja  → /{seg}/ja/insights/{slug}
 */
export function buildInsightLoc(
  siteUrl: string,
  region: SitemapRegion,
  slug: string,
  lang: string,
): string {
  const seg = REGION_PATH[region]
  return lang === 'zh'
    ? `${siteUrl}/${seg}/insights/${slug}`
    : `${siteUrl}/${seg}/${lang}/insights/${slug}`
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Render a list of <url> entries into a complete urlset XML document.
 */
export function renderUrlsetXml(
  urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }>,
): string {
  const body = urls
    .map(
      (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`
}

/**
 * Age-based changefreq + priority for region sitemaps.
 * Mirrors sitemap-insights.xml stratification rules (CLAUDE.md §2):
 *   < 7 days  → daily  / 0.98 (zh) | 0.93 (other)
 *   < 30 days → daily  / 0.95 (zh) | 0.90 (other)
 *   >= 30 days → weekly / 0.85 (zh) | 0.80 (other)
 *
 * NEVER use a flat 'weekly' for all entries — it signals bots to skip for a
 * full week, causing the "single-batch then 5-day silence" pattern observed
 * on HK/TW/JP in the week of 2026-05-20 (root-cause: flat weekly in v1).
 */
function regionChangefreqAndPriority(
  updatedAt: string | null,
  lang: string,
): { changefreq: string; priority: string } {
  const nowMs = Date.now()
  const ageDays = updatedAt
    ? (nowMs - new Date(updatedAt).getTime()) / 86400000
    : 999
  const isZh = lang === 'zh'
  if (ageDays < 7) {
    return { changefreq: 'daily', priority: isZh ? '0.98' : '0.93' }
  }
  if (ageDays < 30) {
    return { changefreq: 'daily', priority: isZh ? '0.95' : '0.90' }
  }
  return { changefreq: 'weekly', priority: isZh ? '0.85' : '0.80' }
}

/**
 * Build a region-scoped urlset for one of the per-region sub-sitemaps.
 * Emits one URL per (slug × lang) so all 4 language variants are surfaced
 * to AI crawlers / GSC.
 *
 * 2026-05-27: upgraded from flat 'weekly' to age-based stratification to fix
 * HK/TW/JP "single-batch then 5-day silence" crawl pattern.
 */
export async function buildRegionSitemapXml(
  siteUrl: string,
  region: SitemapRegion,
): Promise<string> {
  const rows = await fetchInsightsByRegion(region)
  const now = new Date().toISOString().split('T')[0]
  const urls = rows
    .filter((r) => r.slug)
    .map((r) => {
      const lang = r.lang || 'zh'
      const { changefreq, priority } = regionChangefreqAndPriority(r.updated_at, lang)
      return {
        loc: buildInsightLoc(siteUrl, region, r.slug, lang),
        lastmod: r.updated_at ? r.updated_at.split('T')[0] : now,
        changefreq,
        priority,
      }
    })
  return renderUrlsetXml(urls)
}

/**
 * Standard response headers for sub-sitemaps.
 *   - 30min ISR (matches revalidate = 1800) with 24h stale-while-revalidate
 *   - text/xml content-type
 *
 * 2026-05-27: reduced max-age from 3600→1800 to align with ISR revalidate window,
 * so AI bots always receive fresh sitemaps within 30min of new article publication.
 */
export const SITEMAP_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
} as const
