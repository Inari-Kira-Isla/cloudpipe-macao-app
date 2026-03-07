import { supabase } from '@/lib/supabase'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'
  const now = new Date()

  // Fetch all live merchants with category
  const { data: merchants } = await supabase
    .from('merchants')
    .select('slug, updated_at, category:categories(slug)')
    .eq('status', 'live')
    .order('code')

  // Fetch all categories that have merchants
  const { data: categories } = await supabase
    .from('categories')
    .select('slug')

  const entries: MetadataRoute.Sitemap = [
    // Main index
    {
      url: `${siteUrl}/macao`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    // llms.txt
    {
      url: `${siteUrl}/macao/llms-txt`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]

  // Category pages
  for (const cat of (categories || [])) {
    entries.push({
      url: `${siteUrl}/macao/${cat.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  // Merchant pages
  for (const m of (merchants || [])) {
    const cat = m.category as unknown as { slug: string } | null
    if (cat?.slug) {
      entries.push({
        url: `${siteUrl}/macao/${cat.slug}/${m.slug}`,
        lastModified: m.updated_at ? new Date(m.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  }

  return entries
}
