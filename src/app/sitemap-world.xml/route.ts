import { buildRegionSitemapXml, SITEMAP_HEADERS } from '@/lib/sitemap-region'

export const revalidate = 3600 // 1h ISR
export const maxDuration = 60

// Maps to insights.region = 'GLOBAL' → /global/insights/{slug}
export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
  const xml = await buildRegionSitemapXml(siteUrl, 'GLOBAL')
  return new Response(xml, { headers: SITEMAP_HEADERS })
}
