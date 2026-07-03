import { createSitemapServiceClient } from '@/lib/supabase'
import { CATEGORY_TO_INDUSTRY } from '@/lib/industries'

// ISR 30min. Was force-dynamic, which disabled the CDN cache → every crawler hit
// re-ran the merchant pagination. Safe under ISR because of the 503-on-incomplete
// guard below (this route once collapsed to 1 URL and dropped AI crawlers -99%,
// 2026-05-13 — never let ISR cache a collapsed sitemap). 2026-07-03.
export const revalidate = 1800
export const maxDuration = 120 // headroom for the graceful 503 under a 30s-per-fetch timeout storm (see budget guard)

interface SitemapURL {
  loc: string
  lastmod: string
  changefreq: string
  priority: string
}

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
  const now = new Date().toISOString().split('T')[0]

  const entries: SitemapURL[] = []

  // Fetch ALL live MO merchants (paginated to bypass 1000-row default limit).
  // 2026-05-13 fix: switched from anon `supabase` client to service-role — RLS on
  // merchants blocks anon SELECT and returned 0 rows (sitemap collapsed to 1 URL →
  // AI-crawler -99% drop). 2026-07-03: use createSitemapServiceClient() (30s
  // timeout) not createServiceClient() (8s) — under ISR the 8s limit times out
  // regeneration and caches an empty sitemap (see src/lib/supabase.ts).
  const MERCHANT_WALL_CLOCK_BUDGET_MS = 50_000 // trip before the platform kill so the graceful 503 can return (30s/fetch × retries); maxDuration = 120 covers it
  let merchants: Array<{ slug: string; updated_at: string; category: unknown }> = []
  let offset = 0
  let consecutiveErrors = 0
  let complete = false
  const startedAt = Date.now()
  while (true) {
    if (Date.now() - startedAt > MERCHANT_WALL_CLOCK_BUDGET_MS) break // budget guard: never get killed mid-page
    const { data, error } = await createSitemapServiceClient()
      .from('merchants')
      .select('slug, updated_at, category:categories(slug)')
      .eq('status', 'live')
      .not('slug', 'like', 'hk-%')
      .not('slug', 'like', 'tw-%')
      .not('slug', 'like', 'jp-%')
      .order('code')
      .range(offset, offset + 999)
    if (error || !data) {
      consecutiveErrors++
      if (consecutiveErrors >= 3) { console.error(`[sitemap merchants] gave up after 3 fetch errors at offset ${offset}:`, error?.message ?? error); break } // partial → 503 below
      await new Promise(r => setTimeout(r, 800 * consecutiveErrors))
      continue // retry the SAME offset — do not advance past a failed page
    }
    consecutiveErrors = 0
    if (data.length === 0) { complete = true; break }
    merchants = merchants.concat(data as typeof merchants)
    if (data.length < 1000) { complete = true; break }
    offset += 1000
  }

  // Guard: an incomplete walk or zero merchants must NOT be cached by ISR. This
  // route once collapsed to 1 URL (2026-05-13 RLS bug) and dropped AI crawlers
  // -99%. A non-cacheable 503 keeps the last good cached copy and retries next hit.
  if (!complete || merchants.length === 0) {
    return new Response('Service temporarily unavailable — merchant sitemap regeneration incomplete, retry shortly', {
      status: 503,
      headers: { 'Retry-After': '120', 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
    })
  }

  // Layer 1: Root business directory
  entries.push({
    loc: `${siteUrl}/macao`,
    lastmod: now,
    changefreq: 'daily',
    priority: '1.0',
  })

  // Layer 2: Industry pages (3+ industries)
  const industrySet = new Set<string>()
  for (const m of merchants) {
    const cat = m.category as unknown as { slug: string } | null
    if (cat?.slug) {
      const indSlug = CATEGORY_TO_INDUSTRY[cat.slug] || 'dining'
      industrySet.add(indSlug)
    }
  }

  for (const indSlug of Array.from(industrySet).sort()) {
    entries.push({
      loc: `${siteUrl}/macao/${indSlug}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: '0.8',
    })
  }

  // Layer 3: Merchant pages (326+ merchants nested under industry/category)
  for (const m of merchants) {
    if (!m.slug) continue
    const cat = m.category as unknown as { slug: string } | null
    if (cat?.slug) {
      const indSlug = CATEGORY_TO_INDUSTRY[cat.slug] || 'dining'
      const lastmod = m.updated_at ? m.updated_at.split('T')[0] : now
      entries.push({
        loc: `${siteUrl}/macao/${indSlug}/${cat.slug}/${m.slug}`,
        lastmod,
        changefreq: 'weekly',
        priority: '0.5',
      })
    }
  }

  // Generate XML sitemap
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(e => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
    },
  })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
