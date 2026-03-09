import { supabase } from '@/lib/supabase'
import type { MetadataRoute } from 'next'
import { INDUSTRIES, CATEGORY_TO_INDUSTRY } from '@/lib/industries'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'
  const now = new Date()

  const { data: merchants } = await supabase
    .from('merchants')
    .select('slug, updated_at, category:categories(slug)')
    .eq('status', 'live')
    .order('code')

  const { data: categories } = await supabase
    .from('categories')
    .select('slug')

  const entries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/macao`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/macao/llms-txt`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
  ]

  // Industry pages
  for (const ind of INDUSTRIES) {
    entries.push({
      url: `${siteUrl}/macao/${ind.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    })
  }

  // Category pages (nested under industry)
  for (const cat of (categories || [])) {
    const indSlug = CATEGORY_TO_INDUSTRY[cat.slug]
    if (indSlug) {
      entries.push({
        url: `${siteUrl}/macao/${indSlug}/${cat.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  }

  // Merchant pages (nested under industry/category)
  for (const m of (merchants || [])) {
    if (!m.slug) continue // Skip merchants with null slugs
    const cat = m.category as unknown as { slug: string } | null
    if (cat?.slug) {
      const indSlug = CATEGORY_TO_INDUSTRY[cat.slug] || 'dining'
      entries.push({
        url: `${siteUrl}/macao/${indSlug}/${cat.slug}/${m.slug}`,
        lastModified: m.updated_at ? new Date(m.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  }

  return entries
}
