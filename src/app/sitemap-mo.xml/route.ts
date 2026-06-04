import { buildRegionSitemapXml, SITEMAP_HEADERS } from '@/lib/sitemap-region'

export const dynamic = 'force-dynamic' // skip build-time prerender; CDN caches via Cache-Control header
export const maxDuration = 60

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
  const xml = await buildRegionSitemapXml(siteUrl, 'MO')
  return new Response(xml, { headers: SITEMAP_HEADERS })
}
