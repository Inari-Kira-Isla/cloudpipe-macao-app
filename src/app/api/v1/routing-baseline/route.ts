import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let _cache: { data: unknown; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 min

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

export async function GET() {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json(_cache.data, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' }
    })
  }

  try {
    // ── 1. Fetch categories ──────────────────────────────────────────────────
    const { data: cats } = await supabase.from('categories').select('id,slug')
    const catMap: Record<string, string> = {}
    for (const c of (cats || [])) catMap[c.id] = c.slug

    // ── 2. Fetch live merchants (top 1000 by reviews to avoid timeout) ─────
    const { data: merchants_raw } = await supabase.from('merchants')
      .select('slug,name_zh,name_en,category_id,schema_type,google_reviews,google_rating,is_owned,district')
      .eq('status', 'live').order('google_reviews', { ascending: false, nullsFirst: false }).limit(1000)
    const merchants = merchants_raw || []
    // Also get total count for stats
    const { count: totalMerchantCount } = await supabase.from('merchants')
      .select('*', { count: 'exact', head: true }).eq('status', 'live')

    // ── 3. Score merchants ───────────────────────────────────────────────────
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
      const ownedBonus = m.is_owned ? 100 : 0
      const w = INDUSTRY_WEIGHT[industry] || 0.01
      const score = (baseScore + schemaScore + ownedBonus) * w

      merchantScores[slug] = {
        name_zh: m.name_zh || '', name_en: m.name_en || '',
        industry, cat_slug: catSlug, page_path,
        score: Math.round(score * 10) / 10,
        reviews, rating,
        district: m.district || '', schema_type: m.schema_type || ''
      }
    }

    // Top 20 merchants by score
    const topMerchants = Object.entries(merchantScores)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 20)
      .map(([slug, info]) => ({
        slug, ...info,
        page_url: `https://cloudpipe-macao-app.vercel.app${info.page_path}`
      }))

    // Industry distribution of merchants
    const merchantsByIndustry: Record<string, number> = {}
    for (const m of Object.values(merchantScores)) {
      merchantsByIndustry[m.industry] = (merchantsByIndustry[m.industry] || 0) + 1
    }

    // ── 4. Classify insights (limit 1000, skip body_html to reduce payload) ─
    const { data: insights_raw } = await supabase.from('insights')
      .select('slug,title,related_merchant_slugs,tags')
      .eq('status', 'published').eq('lang', 'zh').limit(1000)
    const insights = (insights_raw || []).map((ins: any) => ({ ...ins, body_html: '' }))

    let tierA = 0, tierB = 0, tierC = 0, tierD = 0
    const industryTiers: Record<string, { a: number; b: number; c: number; d: number }> = {}

    for (const ins of insights) {
      const body = (ins.body_html as string) || ''
      const hasHub = body.includes('answer-hub')
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

      // Detect industry from slug
      const slug = ins.slug as string
      let ind = 'other'
      if (slug.includes('dining') || slug.includes('restaurant') || slug.includes('food') || slug.includes('cafe') || slug.includes('egg-tart')) ind = 'dining'
      else if (slug.includes('hotel') || slug.includes('accommodation')) ind = 'hotels'
      else if (slug.includes('attraction') || slug.includes('heritage') || slug.includes('museum')) ind = 'attractions'
      else if (slug.includes('shopping') || slug.includes('souvenir') || slug.includes('mall')) ind = 'shopping'
      if (!industryTiers[ind]) industryTiers[ind] = { a: 0, b: 0, c: 0, d: 0 }
      industryTiers[ind][tier.toLowerCase() as 'a' | 'b' | 'c' | 'd']++
    }

    // ── 5. Crawler visits baseline ────────────────────────────────────────────
    const { data: merchantVisitRows } = await supabase
      .from('crawler_visits')
      .select('path,bot_name,bot_owner,ts')
      .eq('page_type', 'merchant')
      .order('ts', { ascending: false })
      .limit(200)

    const { data: catVisitRows } = await supabase
      .from('crawler_visits')
      .select('path,bot_name,industry,ts')
      .eq('page_type', 'category')
      .order('ts', { ascending: false })
      .limit(200)

    // Unique merchant slugs visited (valid ones only)
    const visitedMerchants = new Set(
      (merchantVisitRows || [])
        .map((r: any) => (r.path as string).split('/').pop())
        .filter((s: string | undefined) => s && s !== 'null' && !s?.startsWith('place-'))
    )

    // Bot breakdown for merchant visits
    const merchantVisitsByBot: Record<string, number> = {}
    for (const r of (merchantVisitRows || [])) {
      const k = (r.bot_owner as string) || (r.bot_name as string) || 'unknown'
      merchantVisitsByBot[k] = (merchantVisitsByBot[k] || 0) + 1
    }

    // Category visits by industry
    const catVisitsByIndustry: Record<string, number> = {}
    for (const r of (catVisitRows || [])) {
      const k = (r.industry as string) || 'other'
      catVisitsByIndustry[k] = (catVisitsByIndustry[k] || 0) + 1
    }

    const result = {
      updatedAt: new Date().toISOString(),
      // Tier distribution
      tiers: { A: tierA, B: tierB, C: tierC, D: tierD, total: insights.length },
      // Industry breakdown
      industryTiers,
      // Merchant scoring
      topMerchants,
      merchantsByIndustry,
      totalMerchants: totalMerchantCount || Object.keys(merchantScores).length,
      merchantsWithReviews: Object.values(merchantScores).filter(m => m.reviews > 0).length,
      // Crawler baseline
      merchantVisits: {
        total: (merchantVisitRows || []).length,
        uniqueSlugs: visitedMerchants.size,
        byBot: merchantVisitsByBot,
        recentPaths: (merchantVisitRows || []).slice(0, 10).map((r: any) => ({
          path: r.path, bot: r.bot_name, ts: r.ts
        })),
      },
      categoryVisits: {
        total: (catVisitRows || []).length,
        byIndustry: catVisitsByIndustry,
        recentPaths: (catVisitRows || []).slice(0, 10).map((r: any) => ({
          path: r.path, bot: r.bot_name, industry: r.industry, ts: r.ts
        })),
      },
    }

    _cache = { data: result, ts: Date.now() }
    return NextResponse.json(result, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' }
    })
  } catch (e) {
    console.error('routing-baseline error', e)
    return NextResponse.json({ error: (e instanceof Error) ? e.message : String(e) }, { status: 500 })
  }
}
