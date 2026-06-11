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
  hasInsightRoute,
  toRoutedRegion,
  buildInsightLoc,
  renderUrlsetXml,
  SITEMAP_HEADERS,
} from '@/lib/sitemap-region'

export const dynamic = 'force-dynamic' // skip build-time prerender; CDN caches via Cache-Control header
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
  let consecutiveErrors = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const { data, error } = await createSitemapServiceClient()
        .from('insights')
        .select('slug, updated_at, region, lang')
        .eq('status', 'published')
        .eq('lang', 'ja')
        // Tiered exposure (Fable 裁決④: demote not delete) — only A-tier
        // (trust_score ≥ 70) insights are surfaced. NULL trust excluded.
        // ~832 JA rows pass as of 2026-06-11.
        .gte('trust_score', 70)
        .order('id', { ascending: true })
        .range(offset, offset + 999)
      if (error || !data) {
        consecutiveErrors++
        if (rows.length > 0 || consecutiveErrors >= 3) break
        await new Promise(r => setTimeout(r, 800 * consecutiveErrors))
        continue
      }
      consecutiveErrors = 0
      if (data.length === 0) break
      rows.push(...(data as InsightRow[]))
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

  const rows = await fetchJapanesePublishedInsights()

  const nowMs = Date.now()
  const urls = rows
    .filter((r): r is InsightRow & { slug: string } => Boolean(r.slug))
    // Region whitelist: DROP rows whose region has no live route on this project
    // (MY/JBL/NULL/'macao'/'MO/SG'). The [slug] page is region-scoped, so these
    // 404 under both /malaysia/ and the /macao/ fallback — omit them entirely so
    // no dead 404 links reach AI crawlers.
    .filter((r) => hasInsightRoute(r.region))
    .map((r) => {
      const region = toRoutedRegion(r.region)

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
