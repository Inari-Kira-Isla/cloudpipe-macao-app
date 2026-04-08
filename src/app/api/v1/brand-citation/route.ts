import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { BRAND_CONFIGS } from '@/lib/brand-visibility'

export const dynamic = 'force-dynamic'

// Citation test results are stored in local SQLite
// This API reads from Supabase crawler_visits for competitor comparison
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  const days = parseInt(request.nextUrl.searchParams.get('days') || '30')

  if (!slug || !BRAND_CONFIGS[slug]) {
    return NextResponse.json({ error: 'Invalid brand slug' }, { status: 400 })
  }

  const brand = BRAND_CONFIGS[slug]
  const supabase = createServiceClient()

  // Get competitor merchants in same category/industry
  const { data: competitors } = await supabase
    .from('merchants')
    .select('slug, name_zh, name_en, google_rating, google_reviews')
    .or(`category_slug.eq.${brand.category},industry_slug.eq.${brand.industry}`)
    .neq('slug', brand.merchantSlugs[0])
    .order('google_reviews', { ascending: false, nullsFirst: false })
    .limit(10)

  // Get crawl counts for brand and competitors
  const brandVisits = await getCrawlCount(supabase, brand.merchantSlugs[0])

  const competitorData = []
  for (const comp of (competitors || []).slice(0, 6)) {
    const visits = await getCrawlCount(supabase, comp.slug)
    competitorData.push({
      slug: comp.slug,
      name: comp.name_zh || comp.name_en || comp.slug,
      visits,
      rating: comp.google_rating,
      reviews: comp.google_reviews,
    })
  }

  // Sort by visits descending, insert brand
  const allEntries = [
    { slug: brand.merchantSlugs[0], name: brand.displayName, visits: brandVisits, isBrand: true },
    ...competitorData.map(c => ({ ...c, isBrand: false })),
  ].sort((a, b) => b.visits - a.visits)

  // Calculate percentages
  const totalVisits = allEntries.reduce((s, e) => s + e.visits, 0) || 1
  const ranked = allEntries.map((entry, i) => ({
    ...entry,
    rank: i + 1,
    percentage: Math.round((entry.visits / totalVisits) * 100),
    label: entry.isBrand ? '你的品牌' :
           i < 3 ? '主要競爭者' : '潛在競爭者',
  }))

  return NextResponse.json({
    brand: brand.displayName,
    brandSlug: slug,
    brandRank: ranked.findIndex(r => r.isBrand) + 1,
    totalCompetitors: ranked.length,
    competitors: ranked,
    period: { days },
  })
}

async function getCrawlCount(supabase: ReturnType<typeof createServiceClient>, merchantSlug: string): Promise<number> {
  const { count } = await supabase
    .from('crawler_visits')
    .select('*', { count: 'exact', head: true })
    .ilike('path', `%${merchantSlug}%`)
    .not('bot_name', 'is', null)

  return count || 0
}
