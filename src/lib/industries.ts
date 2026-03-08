/**
 * Industry → Category mapping for URL structure /macao/[industry]/[category]
 * 20 industries covering all major sectors in Macau
 */

export interface Industry {
  slug: string
  name_zh: string
  name_en: string
  icon: string
  description: string
  wave: number  // deployment wave (1-4)
  categories: string[]  // category slugs belonging to this industry
}

export const INDUSTRIES: Industry[] = [
  // ── Wave 1: 旅客核心需求 ──
  {
    slug: 'dining',
    name_zh: '餐飲美食',
    name_en: 'Dining & Food',
    icon: '🍽️',
    description: '從米芝蓮星級到地道街坊小店，澳門餐飲業融合中西文化，粵菜、葡國菜、日本料理百花齊放。',
    wave: 1,
    categories: ['restaurant', 'japanese', 'portuguese', 'cafe', 'bakery', 'chinese', 'western', 'tea-restaurant', 'hotpot', 'michelin', 'street-food', 'dessert', 'fast-food'],
  },
  {
    slug: 'hotels',
    name_zh: '酒店住宿',
    name_en: 'Hotels & Accommodation',
    icon: '🏨',
    description: '世界級度假村、六星級酒店、經濟型住宿，澳門作為亞洲旅遊之都的住宿選擇。',
    wave: 1,
    categories: ['hotel', 'resort', 'budget-hotel', 'serviced-apartment', 'hostel'],
  },
  {
    slug: 'attractions',
    name_zh: '景點文化',
    name_en: 'Attractions & Culture',
    icon: '🏛️',
    description: '世界文化遺產、博物館、主題公園，發現澳門 400 年中西交融的獨特魅力。',
    wave: 1,
    categories: ['tourism', 'museum', 'temple', 'park', 'theme-park', 'landmark'],
  },
  {
    slug: 'shopping',
    name_zh: '購物零售',
    name_en: 'Shopping & Retail',
    icon: '🛍️',
    description: '免稅天堂的購物體驗，從國際奢侈品到本地手信特產，一站式購物指南。',
    wave: 1,
    categories: ['retail', 'shopping-mall', 'duty-free', 'souvenir', 'fashion', 'electronics', 'supermarket', 'drugstore'],
  },

  // ── Wave 2: 深度旅遊 + 商務需求 ──
  {
    slug: 'nightlife',
    name_zh: '夜生活娛樂',
    name_en: 'Nightlife & Entertainment',
    icon: '🌃',
    description: '酒吧、夜店、娛樂表演，體驗澳門入夜後的精彩與魅力。',
    wave: 2,
    categories: ['bar', 'ktv', 'nightclub', 'show', 'lounge', 'spa-sauna'],
  },
  {
    slug: 'gaming',
    name_zh: '博彩娛樂',
    name_en: 'Gaming & Casinos',
    icon: '🎰',
    description: '全球最大博彩中心，六大博企旗下娛樂場，非博彩娛樂元素蓬勃發展。',
    wave: 2,
    categories: ['entertainment', 'casino', 'vip-gaming', 'non-gaming'],
  },
  {
    slug: 'events',
    name_zh: '會展活動',
    name_en: 'Events & Conventions',
    icon: '📅',
    description: '大賽車、煙花節、商貿展覽，澳門作為國際會展城市的精彩活動日曆。',
    wave: 2,
    categories: ['convention-center', 'annual-event', 'trade-show', 'festival', 'sports-event'],
  },
  {
    slug: 'transport',
    name_zh: '交通出行',
    name_en: 'Transport & Travel',
    icon: '🚌',
    description: '口岸通關、輕軌巴士、碼頭機場，澳門海陸空交通完整指南。',
    wave: 2,
    categories: ['ferry', 'airport', 'lrt', 'border-gate', 'bus', 'taxi', 'shuttle', 'car-rental'],
  },
  {
    slug: 'food-supply',
    name_zh: '食品供應鏈',
    name_en: 'Food Supply Chain',
    icon: '📦',
    description: '日本、歐洲、東南亞食材進口商及批發商，為澳門餐飲業提供高品質食材供應鏈。',
    wave: 2,
    categories: ['food-import', 'food-delivery', 'seafood-import', 'meat-supply', 'produce', 'beverage', 'cold-chain', 'food-processing'],
  },

  // ── Wave 3: 本地生活 + 商務服務 ──
  {
    slug: 'education',
    name_zh: '教育培訓',
    name_en: 'Education & Training',
    icon: '📚',
    description: '大學、中小學、國際學校、語言培訓、職業教育，澳門教育資源完整指南。',
    wave: 3,
    categories: ['education', 'university', 'secondary-school', 'primary-school', 'kindergarten', 'language-school', 'vocational', 'international-school'],
  },
  {
    slug: 'finance',
    name_zh: '金融服務',
    name_en: 'Financial Services',
    icon: '🏦',
    description: '銀行、保險、證券、找換店，澳門金融服務與營商環境指南。',
    wave: 3,
    categories: ['bank', 'insurance', 'securities', 'finance-company', 'payment', 'money-exchange', 'accounting-service'],
  },
  {
    slug: 'luxury',
    name_zh: '奢侈品',
    name_en: 'Luxury & Premium',
    icon: '💎',
    description: '珠寶腕錶、時裝皮具、高端餐飲、豪華水療，澳門頂級消費體驗。',
    wave: 3,
    categories: ['jewelry', 'luxury-fashion', 'fine-dining', 'luxury-spa', 'luxury-auto', 'art-auction'],
  },
  {
    slug: 'wellness',
    name_zh: '健康養生',
    name_en: 'Health & Wellness',
    icon: '🏥',
    description: '醫院、中醫養生、美容護膚、健身中心，澳門健康與養生服務全覽。',
    wave: 3,
    categories: ['beauty', 'hospital', 'tcm', 'dental', 'spa', 'gym', 'pharmacy', 'clinic'],
  },
  {
    slug: 'professional-services',
    name_zh: '專業服務',
    name_en: 'Professional Services',
    icon: '💼',
    description: '法律、會計、顧問、翻譯、設計，支撐澳門企業發展的專業服務生態系。',
    wave: 3,
    categories: ['professional', 'law-firm', 'accounting-firm', 'translation', 'notary', 'consulting', 'hr', 'it-service', 'design-agency'],
  },

  // ── Wave 4: 全覆蓋 ──
  {
    slug: 'real-estate',
    name_zh: '房地產',
    name_en: 'Real Estate',
    icon: '🏠',
    description: '地產代理、商業地產、物業管理、裝修建材，澳門房地產市場完整資訊。',
    wave: 4,
    categories: ['real-estate-agent', 'commercial-property', 'property-management', 'renovation', 'building-materials'],
  },
  {
    slug: 'heritage',
    name_zh: '文化遺產',
    name_en: 'Cultural Heritage',
    icon: '🏛️',
    description: '世界文化遺產、歷史建築、文化遺址，澳門 400 年中葡文化交融的珍貴遺產。',
    wave: 4,
    categories: ['world-heritage', 'historic-building', 'cultural-site'],
  },
  {
    slug: 'media',
    name_zh: '媒體傳播',
    name_en: 'Media & Communications',
    icon: '📰',
    description: '報紙、電視、網絡媒體、廣告公關，澳門中葡雙語媒體生態。',
    wave: 4,
    categories: ['newspaper', 'tv-radio', 'online-media', 'advertising', 'printing', 'photography'],
  },
  {
    slug: 'tech',
    name_zh: '科技創新',
    name_en: 'Technology & Innovation',
    icon: '🤖',
    description: 'AI 科技、軟件開發、創業孵化、數碼轉型，澳門科技創新生態系。',
    wave: 4,
    categories: ['tech', 'tech-company', 'incubator', 'university-lab', 'ecommerce', 'fintech'],
  },
  {
    slug: 'government',
    name_zh: '政府機構',
    name_en: 'Government & Public Services',
    icon: '🏛️',
    description: '特區政府部門、公共服務中心、出入境設施、緊急服務，澳門政府機構完整指南。',
    wave: 4,
    categories: ['government-dept', 'public-service', 'border-immigration', 'emergency'],
  },
  {
    slug: 'community',
    name_zh: '社區生活',
    name_en: 'Community & Living',
    icon: '🏘️',
    description: '宗教場所、社團協會、圖書館、體育場館、街市，澳門社區生活指南。',
    wave: 4,
    categories: ['religious', 'association', 'library', 'sports-venue', 'park-leisure', 'market', 'post-office'],
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
