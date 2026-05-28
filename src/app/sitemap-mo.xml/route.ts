import { buildRegionSitemapXml, SITEMAP_HEADERS } from '@/lib/sitemap-region'

export const revalidate = 3600 // 30min ISR — 配合新文章每30min更新節奏
export const maxDuration = 60

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe.ai').trim()
  const xml = await buildRegionSitemapXml(siteUrl, 'MO')
  return new Response(xml, { headers: SITEMAP_HEADERS })
}
