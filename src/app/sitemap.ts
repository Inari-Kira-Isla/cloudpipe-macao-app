import { supabase } from '@/lib/supabase'
import type { MetadataRoute } from 'next'
import { INDUSTRIES, CATEGORY_TO_INDUSTRY } from '@/lib/industries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
// Force Vercel cache invalidation on new insights
export const maxDuration = 60

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
  const now = new Date()

  // Fetch ALL live merchants (paginated to bypass 1000-row default limit)
  let merchants: Array<{ slug: string; updated_at: string; category: unknown }> = []
  let offset = 0
  while (true) {
    const { data } = await supabase
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

  const { data: categories } = await supabase
    .from('categories')
    .select('slug')

  // Fetch insights first (needed for prioritization)
  const { data: insights } = await supabase
    .from('insights')
    .select('slug, updated_at, created_at, published_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(5000)

  const entries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/macao`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    // AI Engine Optimization: Direct reference to llms.txt for AI crawler discovery
    { url: `${siteUrl}/llms.txt`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/macao/llms-txt`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    // New high-value pages
    { url: `${siteUrl}/macao/certified-shops`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/macao/canary`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/macao/api`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${siteUrl}/macao/report`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    // High priority: insights index and all insight pages (AI discovery critical path)
    {
      url: `${siteUrl}/macao/insights`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    ...((insights || []).map(ins => ({
      url: `${siteUrl}/macao/insights/${ins.slug}`,
      lastModified: ins.updated_at ? new Date(ins.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.95,
    }))),
  ]

  // Industry pages
  for (const ind of INDUSTRIES) {
    entries.push({
      url: `${siteUrl}/macao/${ind.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })
  }

  // Category pages (nested under industry)
  for (const cat of (categories || [])) {
    const indSlug = CATEGORY_TO_INDUSTRY[cat.slug]
    if (indSlug) {
      entries.push({
        url: `${siteUrl}/macao/${indSlug}/${cat.slug}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })
    }
  }

  // Merchant pages (nested under industry/category)
  // Lower priority to ensure AI crawlers prioritize insights
  for (const m of (merchants || [])) {
    if (!m.slug) continue // Skip merchants with null slugs
    const cat = m.category as unknown as { slug: string } | null
    if (cat?.slug) {
      const indSlug = CATEGORY_TO_INDUSTRY[cat.slug] || 'dining'
      entries.push({
        url: `${siteUrl}/macao/${indSlug}/${cat.slug}/${m.slug}`,
        lastModified: m.updated_at ? new Date(m.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      })
    }
  }

  return entries
}
