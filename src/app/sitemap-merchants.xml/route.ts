import { createServiceClient } from '@/lib/supabase'
import { CATEGORY_TO_INDUSTRY } from '@/lib/industries'

export const revalidate = 3600 // 1h ISR — avoid excessive AI bot queries
export const maxDuration = 60

interface SitemapURL {
  loc: string
  lastmod: string
  changefreq: string
  priority: string
}

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe.ai').trim()
  const now = new Date().toISOString().split('T')[0]

  const entries: SitemapURL[] = []

  // Fetch ALL live MO merchants (paginated to bypass 1000-row default limit).
  // 2026-05-13 fix: switched from anon `supabase` client to service-role
  // `createServiceClient()` — RLS on merchants table blocks anon SELECT and
  // was returning 0 rows (sitemap collapsed to 1 URL → AI-crawler -99% drop).
  // Service-role mirrors what src/app/sitemap.ts already does.
  let merchants: Array<{ slug: string; updated_at: string; category: unknown }> = []
  let offset = 0
  while (true) {
    const { data } = await createServiceClient()
      .from('merchants')
      .select('slug, updated_at, category:categories(slug)')
      .eq('status', 'live')
      .not('slug', 'like', 'hk-%')
      .not('slug', 'like', 'tw-%')
      .not('slug', 'like', 'jp-%')
      .order('code')
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    merchants = merchants.concat(data as typeof merchants)
    if (data.length < 1000) break
    offset += 1000
  }

  // Fetch categories for the 3-layer structure
  const { data: categories } = await createServiceClient()
    .from('categories')
    .select('slug')

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
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
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
