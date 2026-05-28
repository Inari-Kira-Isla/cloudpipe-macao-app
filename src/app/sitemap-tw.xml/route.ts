import { buildRegionSitemapXml, SITEMAP_HEADERS } from '@/lib/sitemap-region'

export const dynamic = 'force-dynamic' // skip build-time prerender; CDN caches via Cache-Control header
export const maxDuration = 60

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe.ai').trim()
  const xml = await buildRegionSitemapXml(siteUrl, 'TW')
  return new Response(xml, { headers: SITEMAP_HEADERS })
}
