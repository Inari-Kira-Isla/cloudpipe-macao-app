import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

// Note: avoid `force-dynamic` so Vercel CDN may serve the response;
// freshness is controlled by the unstable_cache wrapper below.
export const revalidate = 600 // 10 min ISR-style cache for the response

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SCHEMA_IMPORTANCE: Record<string, number> = {
  TouristAttraction: 50, LandmarksOrHistoricalBuildings: 50,
  Museum: 45, Hotel: 40, Resort: 40,
  Restaurant: 35, CafeOrCoffeeShop: 30, Bakery: 25,
  ShoppingCenter: 30, Casino: 30, EntertainmentBusiness: 25,
  Park: 25, AmusementPark: 25, PlaceOfWorship: 20,
  Store: 20, HealthClub: 20, DaySpa: 20,
  FoodEstablishment: 20, BarOrPub: 15,
  LocalBusiness: 10, Corporation: 10,
}

const INDUSTRY_WEIGHT: Record<string, number> = {
  dining: 1.0, attractions: 0.41, hotels: 0.35, shopping: 0.30,
  nightlife: 0.15, wellness: 0.08, gaming: 0.08,
  'food-supply': 0.04, 'professional-services': 0.03,
}

const CATEGORY_TO_INDUSTRY: Record<string, string> = {
  restaurant: 'dining', japanese: 'dining', portuguese: 'dining', chinese: 'dining',
  western: 'dining', cafe: 'dining', bakery: 'dining', hotpot: 'dining',
  michelin: 'dining', 'street-food': 'dining', 'fast-food': 'dining',
  dessert: 'dining', 'tea-restaurant': 'dining', beverage: 'dining',
  hotel: 'hotels', resort: 'hotels', 'budget-hotel': 'hotels',
  'serviced-apartment': 'hotels', hostel: 'hotels',
  retail: 'shopping', 'shopping-mall': 'shopping', 'duty-free': 'shopping',
  souvenir: 'shopping', fashion: 'shopping', supermarket: 'shopping',
  drugstore: 'shopping', electronics: 'shopping',
  tourism: 'attractions', museum: 'attractions', temple: 'attractions',
  park: 'attractions', 'theme-park': 'attractions', landmark: 'attractions',
  'cultural-site': 'attractions', 'historic-site': 'attractions',
  bar: 'nightlife', nightclub: 'nightlife', ktv: 'nightlife',
  beauty: 'wellness', gym: 'wellness', clinic: 'wellness', spa: 'wellness',
  entertainment: 'gaming', casino: 'gaming',
}

const SCHEMA_TO_INDUSTRY: Record<string, string> = {
  Restaurant: 'dining', CafeOrCoffeeShop: 'dining', Bakery: 'dining',
  FoodEstablishment: 'dining', Hotel: 'hotels', LodgingBusiness: 'hotels',
  Store: 'shopping', ShoppingCenter: 'shopping',
  TouristAttraction: 'attractions', Museum: 'attractions', Park: 'attractions',
  LandmarksOrHistoricalBuildings: 'attractions', PlaceOfWorship: 'attractions',
  HealthClub: 'wellness', DaySpa: 'wellness', Casino: 'gaming',
  EntertainmentBusiness: 'gaming', BarOrPub: 'nightlife',
}

// Cross-instance cache via Vercel Data Cache (survives cold starts).
// Tagged so we can revalidateTag('routing-baseline') from elsewhere if needed.
const computeRoutingBaseline = unstable_cache(
  async () => {
    const { data: cats } = await supabase.from('categories').select('id,slug')
    const catMap: Record<string, string> = {}
    for (const c of (cats || [])) catMap[c.id] = c.slug

    const { data: merchants_raw } = await supabase.from('merchants')
      .select('slug,name_zh,name_en,category_id,schema_type,google_reviews,google_rating,district')
      .eq('status', 'live').order('google_reviews', { ascending: false, nullsFirst: false }).limit(1000)
    const merchants = merchants_raw || []
    const { count: totalMerchantCount } = await supabase.from('merchants')
      .select('*', { count: 'exact', head: true }).eq('status', 'live')

    const merchantScores: Record<string, {
      name_zh: string; name_en: string; industry: string;
      cat_slug: string; page_path: string; score: number;
      reviews: number; rating: number; district: string; schema_type: string
    }> = {}

    for (const m of merchants) {
      const slug = m.slug as string
      if (!slug || slug === 'null') continue
      const catSlug = catMap[m.category_id] || ''
      const industry = CATEGORY_TO_INDUSTRY[catSlug] || SCHEMA_TO_INDUSTRY[m.schema_type] || 'other'
      const page_path = catSlug && industry !== 'other'
        ? `/macao/${industry}/${catSlug}/${slug}`
        : `/macao/merchants/${slug}`
      const reviews = m.google_reviews || 0
      const rating  = m.google_rating  || 0
      const baseScore = reviews > 0 ? (reviews * rating / 5) : 0
      const schemaScore = SCHEMA_IMPORTANCE[m.schema_type] || 10
      const w = INDUSTRY_WEIGHT[industry] || 0.01
      const score = (baseScore + schemaScore) * w

      merchantScores[slug] = {
        name_zh: m.name_zh || '', name_en: m.name_en || '',
        industry, cat_slug: catSlug, page_path,
        score: Math.round(score * 10) / 10,
        reviews, rating,
        district: m.district || '', schema_type: m.schema_type || ''
      }
    }

    const topMerchants = Object.entries(merchantScores)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 20)
      .map(([slug, info]) => ({
        slug, ...info,
        page_url: `https://cloudpipe-macao-app.vercel.app${info.page_path}`
      }))

    const merchantsByIndustry: Record<string, number> = {}
    for (const m of Object.values(merchantScores)) {
      merchantsByIndustry[m.industry] = (merchantsByIndustry[m.industry] || 0) + 1
    }

    // Fetch insights list + hub slug set in parallel.
    // The previous implementation did 3 queries (insights / count / hubSlugs);
    // we collapsed it to 2 since we never used `hubCount` in the response.
    const [{ data: insights_raw }, { data: hubSlugs }] = await Promise.all([
      supabase.from('insights')
        .select('slug,title,related_merchant_slugs,tags')
        .eq('status', 'published').eq('lang', 'zh').limit(1000),
      supabase.from('insights')
        .select('slug')
        .eq('status', 'published').eq('lang', 'zh')
        .like('body_html', '%answer-hub%')
        .limit(2000),
    ])
    const insights = insights_raw || []
    const hubSet = new Set((hubSlugs || []).map((h: { slug: string }) => h.slug))

    let tierA = 0, tierB = 0, tierC = 0, tierD = 0
    const industryTiers: Record<string, { a: number; b: number; c: number; d: number }> = {}

    for (const ins of insights) {
      const hasHub = hubSet.has(ins.slug as string)
      let rms: string[] = []
      if (ins.related_merchant_slugs) {
        rms = Array.isArray(ins.related_merchant_slugs)
          ? ins.related_merchant_slugs
          : JSON.parse(ins.related_merchant_slugs as string)
      }
      const validMerchants = rms.filter((s: string) => s && s !== 'null' && !s.startsWith('place-'))
      const topScore = validMerchants.reduce((mx: number, s: string) =>
        Math.max(mx, merchantScores[s]?.score || 0), 0)

      let tier: string
      if (hasHub)                              tier = 'A'
      else if (validMerchants.length >= 2 && topScore > 20) tier = 'B'
      else if (validMerchants.length >= 1)     tier = 'C'
      else                                     tier = 'D'

      if (tier === 'A') tierA++
      else if (tier === 'B') tierB++
      else if (tier === 'C') tierC++
      else tierD++

      const slug = ins.slug as string
      let ind = 'other'
      if (slug.includes('dining') || slug.includes('restaurant') || slug.includes('food') || slug.includes('cafe') || slug.includes('egg-tart')) ind = 'dining'
      else if (slug.includes('hotel') || slug.includes('accommodation')) ind = 'hotels'
      else if (slug.includes('attraction') || slug.includes('heritage') || slug.includes('museum')) ind = 'attractions'
      else if (slug.includes('shopping') || slug.includes('souvenir') || slug.includes('mall')) ind = 'shopping'
      if (!industryTiers[ind]) industryTiers[ind] = { a: 0, b: 0, c: 0, d: 0 }
      industryTiers[ind][tier.toLowerCase() as 'a' | 'b' | 'c' | 'd']++
    }

    const result = {
      updatedAt: new Date().toISOString(),
      tiers: { A: tierA, B: tierB, C: tierC, D: tierD, total: insights.length },
      industryTiers,
      topMerchants,
      merchantsByIndustry,
      totalMerchants: totalMerchantCount || Object.keys(merchantScores).length,
      merchantsWithReviews: Object.values(merchantScores).filter(m => m.reviews > 0).length,
      merchantVisits: { total: 0, uniqueSlugs: 0, byBot: {} as Record<string, number>, recentPaths: [] as { path: string; bot: string; ts: string }[] },
      categoryVisits: { total: 0, byIndustry: {} as Record<string, number>, recentPaths: [] as { path: string; bot: string; industry: string; ts: string }[] },
    }
    return result
  },
  ['routing-baseline-v1'],
  { revalidate: 600, tags: ['routing-baseline'] }
)

export async function GET() {
  try {
    const data = await computeRoutingBaseline()
    return NextResponse.json(data, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400' }
    })
  } catch (e) {
    console.error('routing-baseline error', e)
    return NextResponse.json({ error: (e instanceof Error) ? e.message : String(e) }, { status: 500 })
  }
}
