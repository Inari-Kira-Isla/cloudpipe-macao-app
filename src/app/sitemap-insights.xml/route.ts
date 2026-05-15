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
import { createServiceClient } from '@/lib/supabase'
import {
  REGION_PATH,
  buildInsightLoc,
  renderUrlsetXml,
  SITEMAP_HEADERS,
  type SitemapRegion,
} from '@/lib/sitemap-region'

export const revalidate = 3600 // 1h ISR
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
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await createServiceClient()
      .from('insights')
      .select('slug, updated_at, region, lang')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    rows.push(...(data as AllInsightRow[]))
    if (data.length < 1000) break
    offset += 1000
  }
  return rows
}

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
  const now = new Date().toISOString().split('T')[0]

  const rows = await fetchAllPublishedInsights()

  const urls = rows
    .filter((r): r is AllInsightRow & { slug: string } => Boolean(r.slug))
    .map((r) => {
      const regionUpper = (r.region || 'MO').toUpperCase()
      // Fallback to MO if region is somehow not in our 5-region map (defensive
      // — DB has 169 NULL-region rows as of 2026-05-13).
      const region: SitemapRegion = (regionUpper in REGION_PATH ? regionUpper : 'MO') as SitemapRegion
      const lang = r.lang || 'zh'
      return {
        loc: buildInsightLoc(siteUrl, region, r.slug, lang),
        lastmod: r.updated_at ? r.updated_at.split('T')[0] : now,
        changefreq: 'weekly',
        priority: lang === 'zh' ? '0.95' : '0.90',
      }
    })

  return new Response(renderUrlsetXml(urls), { headers: SITEMAP_HEADERS })
}
