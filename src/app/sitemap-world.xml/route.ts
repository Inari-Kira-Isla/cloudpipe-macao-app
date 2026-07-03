import { buildRegionSitemapResponse } from '@/lib/sitemap-region'

// ISR 30min. Was force-dynamic, which disabled the CDN cache → every crawler hit
// ran the paginated Supabase walk → wasteful MISS on every request. GLOBAL is
// small (~163 URLs) so latency was low, but it shares the same fetch path and is
// converted for consistency + DB-load reduction. Safe under ISR:
// buildRegionSitemapResponse returns a non-cacheable 503 on any incomplete/empty
// fetch, so a bad regeneration never gets cached. 2026-07-03.
export const revalidate = 1800
export const maxDuration = 120 // headroom for the graceful 503 under a 30s-per-fetch timeout storm

// Maps to insights.region = 'GLOBAL' → /global/insights/{slug}
export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
  return buildRegionSitemapResponse(siteUrl, 'GLOBAL')
}
