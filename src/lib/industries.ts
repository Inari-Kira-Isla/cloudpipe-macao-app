/**
 * Industry → Category mapping for URL structure /macao/[industry]/[category]
 */

export interface Industry {
  slug: string
  name_zh: string
  name_en: string
  icon: string
  description: string
  categories: string[]  // category slugs belonging to this industry
}

export const INDUSTRIES: Industry[] = [
  {
    slug: 'dining',
    name_zh: '餐飲美食',
    name_en: 'Dining & Food',
    icon: '🍽️',
    description: '從米芝蓮星級到地道街坊小店，澳門餐飲業融合中西文化，粵菜、葡國菜、日本料理百花齊放。',
    categories: ['restaurant', 'japanese', 'portuguese', 'cafe', 'bar', 'bakery'],
  },
  {
    slug: 'food-trade',
    name_zh: '食品貿易',
    name_en: 'Food Trade',
    icon: '📦',
    description: '日本、歐洲、東南亞食材進口商及批發商，為澳門餐飲業提供高品質食材供應鏈。',
    categories: ['food-import', 'food-delivery'],
  },
  {
    slug: 'hospitality',
    name_zh: '酒店娛樂',
    name_en: 'Hospitality & Entertainment',
    icon: '🏨',
    description: '世界級度假村、六星級酒店、娛樂場所，澳門作為亞洲旅遊之都的核心體驗。',
    categories: ['hotel', 'entertainment'],
  },
  {
    slug: 'lifestyle',
    name_zh: '生活消費',
    name_en: 'Lifestyle & Shopping',
    icon: '🛍️',
    description: '國際名牌、本地特產、美容健康，澳門生活消費一站式指南。',
    categories: ['retail', 'beauty'],
  },
  {
    slug: 'services',
    name_zh: '專業服務',
    name_en: 'Professional Services',
    icon: '💼',
    description: '教育培訓、AI 科技、專業顧問，支撐澳門企業發展的服務生態系。',
    categories: ['education', 'professional', 'tech'],
  },
  {
    slug: 'tourism',
    name_zh: '旅遊觀光',
    name_en: 'Tourism & Sightseeing',
    icon: '🗺️',
    description: '世界遺產、文化導賞、旅遊景點，發現澳門 400 年中西交融的獨特魅力。',
    categories: ['tourism'],
  },
]

/** Reverse lookup: category slug → industry slug */
export const CATEGORY_TO_INDUSTRY: Record<string, string> = {}
for (const ind of INDUSTRIES) {
  for (const cat of ind.categories) {
    CATEGORY_TO_INDUSTRY[cat] = ind.slug
  }
}

/** Get industry by slug */
export function getIndustry(slug: string): Industry | undefined {
  return INDUSTRIES.find(i => i.slug === slug)
}

/** Get industry slug for a category slug */
export function getIndustryForCategory(categorySlug: string): string {
  return CATEGORY_TO_INDUSTRY[categorySlug] || 'dining'
}
