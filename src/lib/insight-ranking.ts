import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export interface RankedMerchant {
  slug: string
  name_zh: string
  name_en?: string
  rating?: number
  category?: string
  conversionRate: number
  rankingScore: number
}

export const calculateRankingScore = (merchant: any): number => {
  const conversionRate = merchant.conversion_rate || 0
  const googleRating = merchant.rating || 0
  const popularity = merchant.popularity || 0

  const weights = {
    conversion: 0.4,
    rating: 0.3,
    popularity: 0.2,
    alphabetical: 0.1
  }

  const conversionScore = Math.min(conversionRate * 100, 100) * weights.conversion
  const ratingScore = Math.min((googleRating / 5) * 100, 100) * weights.rating
  const popularityScore = Math.min(popularity, 100) * weights.popularity
  const alphabeticalScore = (1 - (merchant.name_zh.charCodeAt(0) % 26) / 26) * 100 * weights.alphabetical

  return conversionScore + ratingScore + popularityScore + alphabeticalScore
}

export const rankMerchantsForInsight = async (
  insightSlug: string,
  limit: number = 6
): Promise<RankedMerchant[]> => {
  const { data: merchants } = await supabase
    .from('merchants')
    .select('slug, name_zh, name_en, rating, category, conversion_rate, popularity')
    .eq('status', 'live')
    .limit(100)

  if (!merchants || merchants.length === 0) return []

  const ranked = merchants
    .map(m => ({
      slug: m.slug,
      name_zh: m.name_zh,
      name_en: m.name_en,
      rating: m.rating,
      category: m.category,
      conversionRate: m.conversion_rate || 0,
      rankingScore: calculateRankingScore(m)
    }))
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .slice(0, limit)

  return ranked
}

export const getTopConversionMerchants = async (
  limit: number = 5
): Promise<RankedMerchant[]> => {
  const { data: merchants } = await supabase
    .from('merchants')
    .select('slug, name_zh, name_en, rating, category, conversion_rate')
    .eq('status', 'live')
    .order('conversion_rate', { ascending: false })
    .limit(limit)

  return merchants?.map(m => ({
    slug: m.slug,
    name_zh: m.name_zh,
    name_en: m.name_en,
    rating: m.rating,
    category: m.category,
    conversionRate: m.conversion_rate || 0,
    rankingScore: calculateRankingScore(m)
  })) || []
}

export const getMerchantConversionRates = async () => {
  const { data } = await supabase
    .from('conversion_metrics')
    .select('merchant_slug, conversion_rate')
    .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  return data || []
}

export const getMerchantPopularity = async () => {
  const { data } = await supabase
    .from('analytics_cache')
    .select('data')
    .eq('cache_type', 'merchant_ranking')

  return data?.[0]?.data || {}
}
