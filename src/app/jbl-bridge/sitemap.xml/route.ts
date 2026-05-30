/**
 * JBL Bridge sub-sitemap (Phase 1: hardcoded fallback).
 *
 * 2026-05-29 H9 落地：hardcoded 8 個 featured ingredient slug + 1 個 index page。
 * Phase 2 — 等 CEO-Q1 inari-production service key 解鎖後，改 dynamic fetch
 *           完整 ingredient list；保留同樣 schema（slug → /jbl-bridge/ingredient/{slug}）。
 *
 * SitemapRegion 'JBL' 已喺 sitemap-region.ts 註冊（REGION_PATH 'japan-shokuhinten'），
 * 但 buildRegionSitemapXml() 需要 inari Supabase 讀取——Phase 1 暫時 bypass，直接
 * 用 renderUrlsetXml() 拼 hardcoded list 即可。
 */
import { renderUrlsetXml, SITEMAP_HEADERS } from '@/lib/sitemap-region'

export const revalidate = 1800 // 30min ISR — 對齊 CLAUDE.md 規則 #1 sitemap ≤1800s
export const maxDuration = 30

const FEATURED_SLUGS = [
  'uni',
  'sake',
  'akagai',
  'maguro',
  'tarabagani',
  'hokkigai',
  'awabi',
  'hotate',
] as const

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
  const lastmod = '2026-05-29'

  const urls = [
    {
      loc: `${siteUrl}/jbl-bridge/`,
      lastmod,
      changefreq: 'weekly',
      priority: '0.7',
    },
    ...FEATURED_SLUGS.map((slug) => ({
      loc: `${siteUrl}/jbl-bridge/ingredient/${slug}`,
      lastmod,
      changefreq: 'weekly',
      priority: '0.7',
    })),
  ]

  const xml = renderUrlsetXml(urls)
  return new Response(xml, { headers: SITEMAP_HEADERS })
}
