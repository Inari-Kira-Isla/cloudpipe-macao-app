/**
 * Language-specific "Japanese insights" sub-sitemap.
 *
 * Built 2026-05-26 to surface all published Japanese-language insights
 * to AI crawlers with explicit lang=ja query parameter. Complements
 * sitemap-insights.xml (all languages) by allowing bots to discover
 * and prioritize Japanese content separately.
 *
 * URLs use path-based lang routing: /{region}/ja/insights/{slug}
 * Most Japanese articles are in JP region; fallback to MO for edge cases.
 */
import { createSitemapServiceClient } from '@/lib/supabase'
import {
  REGION_PATH,
  buildInsightLoc,
  renderUrlsetXml,
  SITEMAP_HEADERS,
  type SitemapRegion,
} from '@/lib/sitemap-region'

export const revalidate = 1800 // 30min ISR — same as sitemap-insights.xml
export const maxDuration = 120

interface InsightRow {
  slug: string | null
  updated_at: string | null
  region: string | null
  lang: string | null
}

async function fetchJapanesePublishedInsights(): Promise<InsightRow[]> {
  const rows: InsightRow[] = []
  let offset = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await createSitemapServiceClient()
      .from('insights')
      .select('slug, updated_at, region, lang')
      .eq('status', 'published')
      .eq('lang', 'ja')
      .order('updated_at', { ascending: false })
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    rows.push(...(data as InsightRow[]))
    if (data.length < 1000) break
    offset += 1000
  }
  return rows
}

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe.ai').trim()
  const now = new Date().toISOString().split('T')[0]

  const rows = await fetchJapanesePublishedInsights()

  const nowMs = Date.now()
  const urls = rows
    .filter((r): r is InsightRow & { slug: string } => Boolean(r.slug))
    .map((r) => {
      const regionUpper = (r.region || 'MO').toUpperCase()
      // Fallback to MO if region is somehow not in our 5-region map
      const region: SitemapRegion = (regionUpper in REGION_PATH ? regionUpper : 'MO') as SitemapRegion

      // 按文章新舊分層 changefreq：7天內=daily；30天內=daily；更舊=weekly
      const ageDays = r.updated_at
        ? (nowMs - new Date(r.updated_at).getTime()) / 86400000
        : 999
      const changefreq = ageDays < 30 ? 'daily' : 'weekly'
      // Japanese content slightly lower priority than Chinese
      const basePri = ageDays < 7 ? 0.93 : ageDays < 30 ? 0.90 : 0.80

      return {
        loc: buildInsightLoc(siteUrl, region, r.slug, 'ja'),
        lastmod: r.updated_at ? r.updated_at.split('T')[0] : now,
        changefreq,
        priority: basePri.toFixed(2),
      }
    })

  return new Response(renderUrlsetXml(urls), { headers: SITEMAP_HEADERS })
}
