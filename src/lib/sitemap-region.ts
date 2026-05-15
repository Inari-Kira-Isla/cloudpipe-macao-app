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
import { createServiceClient } from '@/lib/supabase'

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
    const { data } = await createServiceClient()
      .from('insights')
      .select('slug, updated_at, region, lang')
      .eq('status', 'published')
      .eq('region', region)
      .order('updated_at', { ascending: false })
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    rows.push(...(data as InsightRow[]))
    if (data.length < 1000) break
    offset += 1000
  }
  return rows
}

/**
 * URL for one insight row. Mirrors sitemap.ts insightPath():
 *   zh  → /{seg}/insights/{slug}             (canonical)
 *   en  → /{seg}/insights/{slug}?lang=en
 *   pt  → /{seg}/insights/{slug}?lang=pt
 *   ja  → /{seg}/insights/{slug}?lang=ja
 */
export function buildInsightLoc(
  siteUrl: string,
  region: SitemapRegion,
  slug: string,
  lang: string,
): string {
  const seg = REGION_PATH[region]
  const base = `${siteUrl}/${seg}/insights/${slug}`
  return lang === 'zh' ? base : `${base}?lang=${lang}`
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
 * Build a region-scoped urlset for one of the per-region sub-sitemaps.
 * Emits one URL per (slug × lang) so all 4 language variants are surfaced
 * to AI crawlers / GSC.
 */
export async function buildRegionSitemapXml(
  siteUrl: string,
  region: SitemapRegion,
): Promise<string> {
  const rows = await fetchInsightsByRegion(region)
  const now = new Date().toISOString().split('T')[0]
  const urls = rows
    .filter((r) => r.slug)
    .map((r) => ({
      loc: buildInsightLoc(siteUrl, region, r.slug, r.lang || 'zh'),
      lastmod: r.updated_at ? r.updated_at.split('T')[0] : now,
      changefreq: 'weekly',
      priority: r.lang === 'zh' ? '0.95' : '0.90',
    }))
  return renderUrlsetXml(urls)
}

/**
 * Standard response headers for sub-sitemaps.
 *   - 1h ISR with 24h stale-while-revalidate
 *   - text/xml content-type
 */
export const SITEMAP_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
} as const
