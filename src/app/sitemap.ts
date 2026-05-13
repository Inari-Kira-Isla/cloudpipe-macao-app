import { supabase } from '@/lib/supabase'
import type { MetadataRoute } from 'next'
import { INDUSTRIES, CATEGORY_TO_INDUSTRY } from '@/lib/industries'

export const revalidate = 7200
export const maxDuration = 120

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
  const now = new Date()

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

  async function fetchInsightsByLang(lang: string): Promise<Array<{ slug: string; updated_at: string; region: string | null }>> {
    const rows: Array<{ slug: string; updated_at: string; region: string | null }> = []
    let offset = 0
    while (true) {
      const { data } = await supabase
        .from('insights')
        .select('slug, updated_at, region')
        .eq('status', 'published')
        .eq('lang', lang)
        .order('updated_at', { ascending: false })
        .range(offset, offset + 999)
      if (!data || data.length === 0) break
      rows.push(...(data as Array<{ slug: string; updated_at: string; region: string | null }>))
      if (data.length < 1000) break
      offset += 1000
    }
    return rows
  }

  const [zhInsights, enInsights, ptInsights, jaInsights] = await Promise.all([
    fetchInsightsByLang('zh'),
    fetchInsightsByLang('en'),
    fetchInsightsByLang('pt'),
    fetchInsightsByLang('ja'),
  ])

  const REGION_PATH: Record<string, string> = {
    MO: 'macao', HK: 'hongkong', TW: 'taiwan', JP: 'japan', GLOBAL: 'global',
  }
  function insightPath(slug: string, region: string | null | undefined): string {
    const seg = REGION_PATH[(region || 'MO').toUpperCase()] || 'macao'
    return `/${seg}/insights/${slug}`
  }

  const entries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/macao`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/llms.txt`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/macao/llms-txt`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/macao/certified-shops`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/macao/canary`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/macao/api`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${siteUrl}/macao/report`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    {
      url: `${siteUrl}/macao/insights`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    ...([{
      slug: 'macau-gaming-industry-employment-guide-2026', region: 'MO'
    }, {
      slug: 'macau-laundry-service-guide-2026', region: 'MO'
    }, {
      slug: 'hk-wet-market-guide', region: 'HK'
    }, {
      slug: 'macau-japanese-restaurant-ramen-sushi-guide-2026', region: 'MO'
    }].map(({ slug, region }) => ({
      url: `${siteUrl}${insightPath(slug, region)}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 1.0,
    }))),
    ...zhInsights.map(ins => ({
      url: `${siteUrl}${insightPath(ins.slug, ins.region)}`,
      lastModified: ins.updated_at ? new Date(ins.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.95,
    })),
    ...enInsights.map(ins => ({
      url: `${siteUrl}${insightPath(ins.slug, ins.region)}?lang=en`,
      lastModified: ins.updated_at ? new Date(ins.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.90,
    })),
    ...ptInsights.map(ins => ({
      url: `${siteUrl}${insightPath(ins.slug, ins.region)}?lang=pt`,
      lastModified: ins.updated_at ? new Date(ins.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.90,
    })),
    ...jaInsights.map(ins => ({
      url: `${siteUrl}${insightPath(ins.slug, ins.region)}?lang=ja`,
      lastModified: ins.updated_at ? new Date(ins.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
    ...INDUSTRIES.map(i => ({
      url: `${siteUrl}/macao/insights/topic/${i.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.90,
    })),
    ...(['macau-peninsula', 'taipa', 'cotai', 'coloane', 'inner-harbour', 'outer-harbour', 'seac-pai-van'].map(d => ({
      url: `${siteUrl}/macao/insights/district/${d}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.90,
    }))),
  ]

  for (const ind of INDUSTRIES) {
    entries.push({
      url: `${siteUrl}/macao/${ind.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })
  }

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

  for (const m of (merchants || [])) {
    if (!m.slug) continue
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
