/**
 * Sitemap index — references the canonical Next-generated /sitemap.xml plus
 * every sub-sitemap added on 2026-05-13 to fix the commit-9c438c3 404 wave.
 *
 * Schema: <sitemapindex> not <urlset>.
 */

export const revalidate = 3600 // 30min ISR — aligns with sub-sitemap revalidate window (CLAUDE.md §1)
export const maxDuration = 60

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe.ai').trim()
  const now = new Date().toISOString()

  const childSitemaps = [
    'sitemap.xml',
    'sitemap-merchants.xml',
    'sitemap-insights.xml',
    'sitemap-insights-en.xml',
    'sitemap-insights-ja.xml',
    'sitemap-mo.xml',
    'sitemap-hk.xml',
    'sitemap-tw.xml',
    'sitemap-jp.xml',
    'sitemap-world.xml',
  ]

  const body = childSitemaps
    .map(
      (path) => `  <sitemap>
    <loc>${escapeXml(`${siteUrl}/${path}`)}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`,
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
    },
  })
}
