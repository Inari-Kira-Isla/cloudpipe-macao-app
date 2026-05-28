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

export const revalidate = 1800 // 30min ISR — 日均100+新文章，降至30min讓AI爬蟲持續發現
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
    const { data } = await createSitemapServiceClient()
      .from('insights')
      .select('slug, updated_at, region, lang')
      .eq('status', 'published')
      .order('id', { ascending: true })
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    rows.push(...(data as AllInsightRow[]))
    if (data.length < 1000) break
    offset += 1000
  }
  return rows
}

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe.ai').trim()
  const now = new Date().toISOString().split('T')[0]

  const rows = await fetchAllPublishedInsights()

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
