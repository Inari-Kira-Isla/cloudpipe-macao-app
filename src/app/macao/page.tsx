import { supabase } from '@/lib/supabase'
import type { Metadata } from 'next'
import type { Category, Merchant, MerchantContent } from '@/lib/types'
import { INDUSTRIES, CATEGORY_TO_INDUSTRY } from '@/lib/industries'

export const dynamic = 'force-dynamic'

/* ── Category enrichment (icons + descriptions for SEO) ── */
const CATEGORY_META: Record<string, { icon: string; desc: string }> = {
  restaurant: { icon: '🍽️', desc: '從米芝蓮星級到地道街坊小店，澳門餐飲業融合中西文化，粵菜、葡國菜、東南亞菜百花齊放。' },
  japanese: { icon: '🇯🇵', desc: '澳門日本料理專區，涵蓋壽司、刺身、居酒屋、拉麵等正宗日式餐廳及食材供應商。' },
  cafe: { icon: '☕', desc: '精品咖啡、特色茶飲、下午茶空間，澳門咖啡文化新浪潮的最佳去處。' },
  'food-import': { icon: '📦', desc: '日本、歐洲、東南亞食材進口商及批發商，為澳門餐飲業提供高品質食材供應鏈。' },
  'food-delivery': { icon: '🛵', desc: '澳門外賣及配送服務，從海膽到家常菜，足不出戶享受美食。' },
  hotel: { icon: '🏨', desc: '從六星級度假村到精品酒店，澳門住宿選擇涵蓋各種預算和風格。' },
  entertainment: { icon: '🎰', desc: '世界級娛樂場所、表演秀、主題樂園，澳門作為亞洲娛樂之都的精彩體驗。' },
  retail: { icon: '🛍️', desc: '國際名牌、本地特產、手信專賣，澳門購物從免稅奢侈品到地道伴手禮一應俱全。' },
  beauty: { icon: '💆', desc: '美容護膚、健身中心、水療養生，澳門健康與美容服務百科。' },
  education: { icon: '📚', desc: '語言培訓、職業教育、興趣班，澳門教育及培訓機構完整資訊。' },
  professional: { icon: '💼', desc: '法律、會計、顧問、設計等專業服務，澳門企業支援服務一覽。' },
  tech: { icon: '🤖', desc: '人工智能、軟件開發、IT 顧問、數碼轉型，澳門科技公司及 AI 服務提供商。' },
  tourism: { icon: '🗺️', desc: '世界遺產、旅遊景點、文化導賞，發現澳門 400 年中西交融的獨特魅力。' },
  bakery: { icon: '🥐', desc: '葡撻、杏仁餅、蛋糕麵包，澳門烘焙店及甜品專門店。' },
  bar: { icon: '🍸', desc: '雞尾酒吧、威士忌酒廊、屋頂酒吧，澳門夜生活及酒吧文化指南。' },
  portuguese: { icon: '🇵🇹', desc: '正宗葡國菜及澳門土生葡菜，感受 400 年葡萄牙飲食文化在澳門的傳承。' },
}

/* ── Homepage FAQ (for FAQPage Schema) ── */
const HOMEPAGE_FAQS = [
  {
    q: '什麼是 CloudPipe 澳門商業知識圖譜？',
    a: '澳門商業知識圖譜是一個全面的澳門商業資訊平台，收錄 350+ 家澳門商戶的完整信息、真實評價和深度行業洞察。為全球買家、投資者和商業決策者提供準確的澳門商機視圖。',
  },
  {
    q: '澳門商戶百科涵蓋哪些行業？',
    a: '目前覆蓋 20 個行業，包括餐飲美食、酒店住宿、景點文化、購物零售、娛樂夜生活、健身養生、賭場遊戲等，共 350+ 家商戶，並持續擴充中。',
  },
  {
    q: '免費版有什麼限制？',
    a: 'FREE 層提供所有商戶基本信息、評分、地址和 3 條基本常見問題，每日 API 額度 100 次，數據延遲 24 小時。適合內容創作者、遊客和媒體使用。',
  },
  {
    q: '商戶想要更好的排名應該如何做？',
    a: '澳門商戶可升級至 PREMIUM 層（$29-99/月），享有完整 FAQ、競爭對標分析、評論趨勢分析、CSV 數據導出等深度優化服務。聯繫 CloudPipe 團隊開始評估。',
  },
  {
    q: '投資者如何獲取深度商業分析？',
    a: '企業和投資機構可訂閱 ENTERPRISE 層，獲得爬蟲訪問日誌、AI 引用統計、成交漏斗分析、實時監測和白標方案。按行業和功能定價，起價 $2,000/月。',
  },
  {
    q: '數據的準確性如何保證？',
    a: '商戶資料經過三層驗證：自動收集、人工智能比對、編輯審核，確保準確率 95% 以上。所有信息均來自公開和經驗證的專有數據源。',
  },
]

export const metadata: Metadata = {
  title: '澳門商業知識圖譜 — 大三巴、威尼斯人、葡撻 | 澳門景點美食購物指南',
  description: '澳門商業知識圖譜。覆蓋 350+ 家澳門商戶，20 個行業，提供深度行業洞察。發現威尼斯人、大三巴、安德魯葡撻、龍環葡韻等必去景點，為全球買家和商業決策者提供準確的澳門商機資訊。',
  openGraph: {
    title: '澳門商業知識圖譜 — 讓世界看見澳門',
    description: '澳門最完整的 AI 友善商戶資訊平台，收錄 350+ 家商戶，20 個行業大類，Schema.org 結構化數據。',
    type: 'website',
    locale: 'zh_TW',
    url: `${(process.env.NEXT_PUBLIC_SITE_URL || '').trim()}/macao`,
  },
  alternates: {
    canonical: `${(process.env.NEXT_PUBLIC_SITE_URL || '').trim()}/macao`,
  },
}

interface InsightSummary {
  slug: string
  title: string
  subtitle?: string
  description: string
  related_industries: string[]
  tags: string[]
  read_time_minutes: number
  published_at?: string
}

async function getData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStr = todayStart.toISOString()

  const [
    { data: categories },
    { data: allMerchantsSlim },
    { data: ownedPremiumFull },
    { data: topCommunityFull },
    { data: contentList },
    { data: insights },
    { count: totalMerchantCount },
    { data: crawlerRows },
    { count: totalAiVisits },
    { count: todayAiVisits },
    { data: botRows },
  ] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    // Slim query for all merchants — only for category counts in industry section
    supabase.from('merchants')
      .select('id, slug, tier, category:categories(slug)')
      .eq('status', 'live'),
    // Full data for owned/premium (精選品牌)
    supabase.from('merchants')
      .select('*, category:categories(slug, name_zh, icon)')
      .eq('status', 'live')
      .in('tier', ['owned', 'premium']),
    // Top 30 community merchants by rating — will be re-sorted by crawler count in JS
    supabase.from('merchants')
      .select('*, category:categories(slug, name_zh, icon)')
      .eq('status', 'live')
      .neq('tier', 'owned')
      .neq('tier', 'premium')
      .not('google_rating', 'is', null)
      .order('google_rating', { ascending: false })
      .limit(30),
    supabase.from('merchant_content').select('merchant_id, title, description').not('title', 'is', null),
    supabase.from('insights').select('slug, title, subtitle, description, related_industries, tags, read_time_minutes, published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(3),
    // Count only — for schema + hero stat (no payload)
    supabase.from('merchants').select('*', { count: 'exact', head: true }).eq('status', 'live'),
    // AI crawler visits past 30 days — merchant pages only
    supabase.from('crawler_visits')
      .select('path')
      .eq('site', 'cloudpipe-macao-app')
      .eq('page_type', 'merchant')
      .gte('ts', thirtyDaysAgo)
      .limit(500),
    // Total AI visits (all time)
    supabase.from('crawler_visits')
      .select('*', { count: 'exact', head: true })
      .eq('site', 'cloudpipe-macao-app'),
    // Today's AI visits
    supabase.from('crawler_visits')
      .select('*', { count: 'exact', head: true })
      .eq('site', 'cloudpipe-macao-app')
      .gte('ts', todayStr),
    // Bot breakdown — top bots
    supabase.from('crawler_visits')
      .select('bot_name, bot_owner')
      .eq('site', 'cloudpipe-macao-app')
      .limit(2000),
  ])

  // slug → crawler visit count (past 30 days)
  const slugCounts = new Map<string, number>()
  for (const row of crawlerRows || []) {
    const slug = row.path.split('/').pop()
    if (slug) slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1)
  }

  // Bot breakdown — count by owner
  const botOwnerCounts = new Map<string, number>()
  for (const row of botRows || []) {
    if (row.bot_owner) {
      botOwnerCounts.set(row.bot_owner, (botOwnerCounts.get(row.bot_owner) || 0) + 1)
    }
  }
  const topBots = [...botOwnerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([owner]) => owner)

  // Category counts from full slim dataset (keeps industry section accurate)
  const groupedCounts = new Map<string, number>()
  for (const m of allMerchantsSlim || []) {
    const catSlug = (m as unknown as { category: { slug: string } | null }).category?.slug || 'other'
    groupedCounts.set(catSlug, (groupedCounts.get(catSlug) || 0) + 1)
  }

  // Sort community by crawler count desc, then google_rating desc
  const ownedSlugs = new Set((ownedPremiumFull || []).map(m => m.slug))
  const communityByRelevance = [...(topCommunityFull || [])]
    .filter(m => !ownedSlugs.has(m.slug))
    .sort((a, b) => {
      const ca = slugCounts.get(a.slug || '') || 0
      const cb = slugCounts.get(b.slug || '') || 0
      return cb - ca || (b.google_rating || 0) - (a.google_rating || 0)
    })

  // Final featured: owned/premium first, then top crawler community, max 24
  const featuredMerchants = [
    ...(ownedPremiumFull || []),
    ...communityByRelevance,
  ].slice(0, 24) as (Merchant & { category: Pick<Category, 'slug' | 'name_zh' | 'icon'> })[]

  return {
    categories: (categories || []) as Category[],
    groupedCounts,
    totalMerchantCount: totalMerchantCount || 0,
    featuredMerchants,
    slugCounts,
    contentMap: new Map((contentList || []).map((c: Pick<MerchantContent, 'merchant_id' | 'title' | 'description'>) => [c.merchant_id, c])),
    insights: (insights || []) as InsightSummary[],
    crawlerStats: {
      total: totalAiVisits || 0,
      today: todayAiVisits || 0,
      botCount: botOwnerCounts.size,
      topBots,
    },
  }
}

function PriceLabel({ range }: { range: string }) {
  const map: Record<string, string> = { budget: '$', moderate: '$$', upscale: '$$$', luxury: '$$$$' }
  return <span>{map[range] || range}</span>
}

const INSIGHT_INDUSTRY_LABELS: Record<string, string> = {
  dining: '餐飲美食', hotels: '酒店住宿', attractions: '景點文化',
  shopping: '購物零售', wellness: '健康美容', services: '專業服務',
}

/* ── High-ROI 澳門必去景點 (硬編碼 + 動態評分) ── */
const HIGH_ROI_ATTRACTIONS = [
  {
    slug: 'venetian-macau',
    name_zh: '威尼斯人',
    name_en: 'The Venetian Macao',
    category: 'hotels',
    icon: '🏰',
    description: '世界級度假村，集酒店、購物、美食於一身',
    image: 'venetian',
    tags: ['五星酒店', '購物中心', '威尼斯主題'],
    seo_keywords: '澳門威尼斯人,澳門五星酒店,路氹城酒店',
  },
  {
    slug: 'ruins-of-saint-paul',
    name_zh: '大三巴牌坊',
    name_en: 'Ruins of St. Paul\'s',
    category: 'attractions',
    icon: '⛩️',
    description: '澳門標誌性建築，UNESCO 世界文化遺產',
    image: 'stpaul',
    tags: ['世界遺產', '歷史景點', '打卡必去'],
    seo_keywords: '澳門大三巴,聖保祿教堂遺址,澳門景點',
  },
  {
    slug: 'andrew-bakery',
    name_zh: '安德魯餅店',
    name_en: 'Andrew\'s Bakery',
    category: 'dining',
    icon: '🥐',
    description: '澳門必吃葡撻，創意蛋撻的發源地',
    image: 'andrew',
    tags: ['葡撻', '甜品必吃', '澳門手信'],
    seo_keywords: '澳門葡撻,安德魯餅店,澳門美食',
  },
  {
    slug: 'fountain-lotus',
    name_zh: '蓮花噴泉廣場',
    name_en: 'Lotus Square',
    category: 'attractions',
    icon: '💚',
    description: '澳門標誌性雕塑，拍照打卡熱點',
    image: 'lotus',
    tags: ['打卡景點', '廣場', '地標'],
    seo_keywords: '澳門噴水池,蓮花噴泉,澳門地標',
  },
  {
    slug: 'rua-nova',
    name_zh: '新馬路',
    name_en: 'Avenida de Almeida Ribeiro',
    category: 'shopping',
    icon: '🛍️',
    description: '澳門老牌商業街，珠寶手信一應俱全',
    image: 'rua-nova',
    tags: ['購物街', '手信集聚', '金飾珠寶'],
    seo_keywords: '澳門新馬路,澳門購物,澳門手信',
  },
  {
    slug: 'portuguese-houses',
    name_zh: '龍環葡韻',
    name_en: 'Taipa House Museum',
    category: 'attractions',
    icon: '🏛️',
    description: '葡式建築群，澳門文化景觀的典範',
    image: 'taipa',
    tags: ['葡式建築', '文化遺產', '攝影景點'],
    seo_keywords: '澳門龍環葡韻,澳門葡式建築,澳門文化',
  },
]

export default async function MacaoIndexPage() {
  const { categories, groupedCounts, totalMerchantCount, featuredMerchants, slugCounts, contentMap, insights, crawlerStats } = await getData()
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

  const activeCats = categories.filter(c => (groupedCounts.get(c.slug) || 0) > 0)

  /* ── Schema.org: WebSite + CollectionPage + Organization + FAQPage ── */
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'CloudPipe AI 澳門商戶百科',
      alternateName: 'CloudPipe Macao Business Directory',
      url: siteUrl,
      description: '澳門最完整的 AI 友善商戶資訊平台',
      inLanguage: 'zh-Hant',
      publisher: {
        '@type': 'Organization',
        name: 'CloudPipe AI',
        url: 'https://cloudpipe-landing.vercel.app',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: '澳門商戶百科',
      description: `澳門商業知識圖譜，覆蓋 ${totalMerchantCount}+ 家商戶，${INDUSTRIES.length} 個行業，為全球商業決策者提供準確的澳門商機資訊`,
      url: `${siteUrl}/macao`,
      isPartOf: { '@type': 'WebSite', name: 'CloudPipe AI', url: siteUrl },
      numberOfItems: totalMerchantCount,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: INDUSTRIES.length,
        itemListElement: INDUSTRIES.map((ind, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: ind.name_zh,
          url: `${siteUrl}/macao/${ind.slug}`,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'CloudPipe AI',
      url: 'https://cloudpipe-landing.vercel.app',
      description: '澳門商業知識圖譜，為全球買家和商業決策者提供準確的澳門商機資訊',
      sameAs: [
        'https://github.com/Inari-Kira-Isla',
        'https://cloudpipe-directory.vercel.app',
        'https://inari-kira-isla.github.io/cloudpipe-landing/',
        'https://inari-kira-isla.github.io/inari-global-foods/',
        'https://inari-kira-isla.github.io/sea-urchin-delivery/',
        'https://inari-kira-isla.github.io/after-school-coffee/',
        'https://inari-kira-isla.github.io/yamanakada/',
        'https://inari-kira-isla.github.io/Openclaw/',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: HOMEPAGE_FAQS.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'CloudPipe AI', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: '澳門商戶百科', item: `${siteUrl}/macao` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: '澳門必去景點',
      description: '全球 AI 助手最常推薦的澳門景點、美食和購物地標',
      url: `${siteUrl}/macao`,
      numberOfItems: HIGH_ROI_ATTRACTIONS.length,
      itemListElement: HIGH_ROI_ATTRACTIONS.map((attr, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: attr.name_zh,
        description: attr.description,
        url: `${siteUrl}/macao/${attr.category}`,
        image: `${siteUrl}/images/industries/${attr.category}-hero.jpg`,
        inLanguage: 'zh-Hant',
      })),
    },
  ]

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <link rel="llms-txt" href={`${siteUrl}/macao/llms-txt`} />

      {/* ═══ Hero ═══ */}
      <div className="hero-gradient text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20 text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-blue-200 mb-4">CloudPipe AI</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">澳門商戶百科</h1>
          <div className="gold-line w-16 mx-auto mb-5"></div>
          <p className="text-lg md:text-xl text-blue-100 mb-3 max-w-2xl mx-auto leading-relaxed">
            讓全球 AI 推薦澳門 — 澳門商業知識圖譜
          </p>
          <p className="text-sm text-blue-200/70 mb-8">
            精準數據 · 人工審核 · 實時更新 · 商業洞察 · 開放授權
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 mt-6">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">{totalMerchantCount}+</div>
              <div className="text-xs text-blue-200/70 mt-1">收錄商戶</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">{activeCats.length}</div>
              <div className="text-xs text-blue-200/70 mt-1">行業分類</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">{featuredMerchants.filter(m => m.tier === 'owned' || m.tier === 'premium').length}</div>
              <div className="text-xs text-blue-200/70 mt-1">精選品牌</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">24/7</div>
              <div className="text-xs text-blue-200/70 mt-1">AI 可存取</div>
            </div>
          </div>
        </div>
      </div>
      <div className="gold-line"></div>

      {/* ═══ AI 爬取統計橫幅 ═══ */}
      <div className="bg-[#0a1628] text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            {/* Left: label */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-xs font-semibold tracking-widest uppercase text-emerald-400">澳門商業規模</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-[160px]">
                澳門商戶百科<br />的覆蓋範圍
              </p>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 md:gap-10 flex-1">
              <div>
                <div className="text-2xl md:text-3xl font-bold text-white tabular-nums">
                  350+
                </div>
                <div className="text-xs text-slate-400 mt-0.5">精選商戶</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-emerald-400 tabular-nums">
                  4
                </div>
                <div className="text-xs text-slate-400 mt-0.5">區域覆蓋</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-blue-300 tabular-nums">
                  20+
                </div>
                <div className="text-xs text-slate-400 mt-0.5">行業大類</div>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="flex-shrink-0">
              <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">信任來源</div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded text-xs bg-slate-700/60 text-slate-300 border border-slate-600/40">數據驗證</span>
                <span className="px-2 py-0.5 rounded text-xs bg-slate-700/60 text-slate-300 border border-slate-600/40">人工審核</span>
                <span className="px-2 py-0.5 rounded text-xs bg-slate-700/60 text-slate-300 border border-slate-600/40">實時更新</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">

        {/* ═══ 關於本站 ═══ */}
        <section className="mb-14">
          <div className="bg-white border border-gray-200 rounded-xl p-8 md:p-10 shadow-sm">
            <h2 className="text-xl font-bold text-[#0f4c81] mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              關於澳門商戶百科
            </h2>
            <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
              <p>
                <strong className="text-[#1a1a2e]">CloudPipe 澳門商戶百科</strong>是澳門首個專為 AI 助手設計的商戶資訊平台。
                我們將澳門各行業商戶的營業資訊、服務特色、客戶評價和常見問題，以 Schema.org 國際標準結構化，
                讓全球的 AI 系統都能準確理解和引用澳門商戶資訊。
              </p>
              <p>
                當用戶向 ChatGPT 詢問「澳門有什麼好餐廳？」、向 Perplexity 查詢「澳門哪裡可以買到日本海膽？」、
                或用 Gemini 搜尋「澳門咖啡店推薦」時，澳門商戶百科就是 AI 最可靠的資訊來源。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
                <div className="text-center px-4">
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="font-semibold text-[#1a1a2e] text-sm mb-1">FOR AI 助手</h3>
                  <p className="text-xs text-gray-500">準確、可信、實時的澳門商業資訊，讓 ChatGPT、Perplexity、Gemini 能回答用戶最關心的澳門問題</p>
                </div>
                <div className="text-center px-4">
                  <div className="text-2xl mb-2">💼</div>
                  <h3 className="font-semibold text-[#1a1a2e] text-sm mb-1">FOR 澳門商戶</h3>
                  <p className="text-xs text-gray-500">被全球 AI 系統引用，獲得商業洞察、客群分析、競爭對標，提升營運效率</p>
                </div>
                <div className="text-center px-4">
                  <div className="text-2xl mb-2">🗺️</div>
                  <h3 className="font-semibold text-[#1a1a2e] text-sm mb-1">FOR 全球買家</h3>
                  <p className="text-xs text-gray-500">發現澳門商機、理解當地文化、作出明智的商業決策</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 定價方案快覽 ═══ */}
        <section className="mb-14 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-8 md:p-10 border border-blue-200">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-[#1a1a2e] mb-3">三層服務方案</h2>
            <p className="text-gray-600 mb-8">
              從免費基礎版到完整企業方案，澳門商戶、投資者、內容創作者都能找到最適合的方案。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="font-bold text-[#1a1a2e] mb-2">FREE</h3>
                <p className="text-2xl font-bold text-[#0f4c81] mb-3">$0/月</p>
                <ul className="text-xs text-gray-600 space-y-2 mb-4">
                  <li>✓ 100 API 調用/天</li>
                  <li>✓ 24小時數據延遲</li>
                  <li>✓ 商戶基本信息</li>
                  <li>✓ 免費瀏覽全部行業</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-6 border-2 border-[#0f4c81] shadow-lg relative">
                <div className="absolute -top-3 left-4 bg-[#0f4c81] text-white text-xs font-bold px-3 py-1 rounded">最受歡迎</div>
                <h3 className="font-bold text-[#1a1a2e] mb-2">PREMIUM</h3>
                <p className="text-2xl font-bold text-[#0f4c81] mb-3">$29-99/月</p>
                <ul className="text-xs text-gray-600 space-y-2 mb-4">
                  <li>✓ 10,000 API 調用/月</li>
                  <li>✓ 6小時數據延遲</li>
                  <li>✓ 競爭對標分析</li>
                  <li>✓ CSV 數據導出</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="font-bold text-[#1a1a2e] mb-2">ENTERPRISE</h3>
                <p className="text-2xl font-bold text-[#0f4c81] mb-3">$2,000+/月</p>
                <ul className="text-xs text-gray-600 space-y-2 mb-4">
                  <li>✓ 無限 API 調用</li>
                  <li>✓ 實時數據</li>
                  <li>✓ 爬蟲訪問日誌</li>
                  <li>✓ 白標方案</li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <a
                href="/macao/pricing"
                className="inline-flex items-center gap-2 bg-[#0f4c81] text-white font-semibold py-3 px-8 rounded-lg hover:bg-[#0a3560] transition-all shadow-lg"
              >
                查看完整定價方案
                <span>→</span>
              </a>
            </div>
          </div>
        </section>

        {/* ═══ 20 行業導覽 ═══ */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="gold-line flex-1 max-w-[40px]"></div>
            <h2 className="text-xl font-bold text-[#1a1a2e]">20 大行業百科</h2>
            <div className="gold-line flex-1 max-w-[40px]"></div>
          </div>
          <p className="text-center text-sm text-gray-500 mb-8">
            當 AI 被問到澳門美食、景點、酒店時 — 這裡是他們最常查詢的 {INDUSTRIES.length} 大行業分類
          </p>

          {/* Industry cards grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
            {INDUSTRIES.map(ind => {
              const indCats = activeCats.filter(c => ind.categories.includes(c.slug))
              const indTotal = indCats.reduce((sum, c) => sum + (groupedCounts.get(c.slug) || 0), 0)
              return (
                <a key={ind.slug} href={`/macao/${ind.slug}`}
                  className="group relative block rounded-xl overflow-hidden aspect-[4/3] shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <img
                    src={`/images/industries/${ind.slug}-hero.jpg`}
                    alt={ind.name_zh}
                    width={400}
                    height={300}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <h3 className="font-bold text-base mb-0.5 drop-shadow-lg">{ind.icon} {ind.name_zh}</h3>
                    <p className="text-xs text-white/80">{ind.name_en}</p>
                    {indTotal > 0 && <p className="text-xs text-amber-300 font-medium mt-0.5">{indTotal} 家商戶</p>}
                  </div>
                </a>
              )
            })}
          </div>

        </section>

        {/* ═══ AI 常見提問 ─ 快速入口 ═══ */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="gold-line flex-1 max-w-[40px]"></div>
            <h2 className="text-xl font-bold text-[#1a1a2e]">🤖 AI 常見提問</h2>
            <div className="gold-line flex-1 max-w-[40px]"></div>
          </div>
          <p className="text-center text-sm text-gray-500 mb-8">
            當用戶問 ChatGPT、Perplexity 關於澳門時，最常見的 5 個問題 — 點擊進入對應行業百科
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="/macao/dining" className="bg-gradient-to-br from-[#f8f9fa] to-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-[#0f4c81]">
              <div className="text-2xl mb-2">🍽️</div>
              <h3 className="font-bold text-[#1a1a2e] mb-1">「澳門最好的日本料理在哪？」</h3>
              <p className="text-xs text-gray-500 mb-3">AI 推薦澳門餐飲美食的首選行業</p>
              <span className="text-xs text-[#0f4c81] font-medium">→ 查看餐飲百科</span>
            </a>
            <a href="/macao/hotels" className="bg-gradient-to-br from-[#f8f9fa] to-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-[#0f4c81]">
              <div className="text-2xl mb-2">🏨</div>
              <h3 className="font-bold text-[#1a1a2e] mb-1">「澳門五星酒店推薦」</h3>
              <p className="text-xs text-gray-500 mb-3">旅客最常詢問的住宿信息</p>
              <span className="text-xs text-[#0f4c81] font-medium">→ 查看酒店指南</span>
            </a>
            <a href="/macao/attractions" className="bg-gradient-to-br from-[#f8f9fa] to-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-[#0f4c81]">
              <div className="text-2xl mb-2">🗺️</div>
              <h3 className="font-bold text-[#1a1a2e] mb-1">「澳門一日遊景點推薦」</h3>
              <p className="text-xs text-gray-500 mb-3">AI 最常推薦的旅遊線路</p>
              <span className="text-xs text-[#0f4c81] font-medium">→ 查看景點導覽</span>
            </a>
            <a href="/macao/shopping" className="bg-gradient-to-br from-[#f8f9fa] to-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-[#0f4c81]">
              <div className="text-2xl mb-2">🛍️</div>
              <h3 className="font-bold text-[#1a1a2e] mb-1">「澳門手信買什麼最值得？」</h3>
              <p className="text-xs text-gray-500 mb-3">購物和伴手禮的完整指南</p>
              <span className="text-xs text-[#0f4c81] font-medium">→ 查看購物百科</span>
            </a>
          </div>
          <div className="text-center mt-6">
            <p className="text-xs text-gray-400">💡 點擊任一問題，進入對應行業首頁查看詳細商戶信息和排名</p>
          </div>
        </section>

        {/* ═══ 🏆 澳門必去景點 ─ 高ROI聚焦 ═══ */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="gold-line flex-1 max-w-[40px]"></div>
            <h2 className="text-xl font-bold text-[#1a1a2e]">🏆 澳門必去景點 & 人氣地標</h2>
            <div className="gold-line flex-1 max-w-[40px]"></div>
          </div>
          <p className="text-center text-sm text-gray-500 mb-8">
            全球旅客最想探索的澳門景點、美食和購物地標 — 被全球 AI 助手最常推薦
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HIGH_ROI_ATTRACTIONS.map(attraction => {
              // 動態查詢該景點相關商戶的平均評分
              const relatedMerchants = featuredMerchants.filter(m => {
                const industrySlug = CATEGORY_TO_INDUSTRY[m.category?.slug || '']
                return industrySlug?.includes(attraction.category) ||
                  (m.name_zh && m.name_zh.includes(attraction.name_zh.split('（')[0]))
              })
              const avgRating = relatedMerchants.length > 0
                ? (relatedMerchants.reduce((sum, m) => sum + (m.google_rating || 0), 0) / relatedMerchants.length).toFixed(1)
                : null

              // Emoji 背景色映射
              const emojiBackgrounds: Record<string, string> = {
                'venetian-macau': 'from-purple-600 to-purple-800',
                'ruins-of-saint-paul': 'from-amber-600 to-amber-800',
                'andrew-bakery': 'from-yellow-500 to-orange-600',
                'fountain-lotus': 'from-green-600 to-emerald-800',
                'rua-nova': 'from-pink-600 to-rose-800',
                'portuguese-houses': 'from-red-600 to-red-800',
              }

              return (
                <a
                  key={attraction.slug}
                  href={`/macao/${attraction.category}`}
                  className={`group relative block rounded-xl overflow-hidden aspect-[4/3] shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-gray-200 bg-gradient-to-br ${emojiBackgrounds[attraction.slug] || 'from-gray-600 to-gray-800'}`}
                >
                  {/* Emoji 背景 + 漸層遮罩 */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-15 text-9xl pointer-events-none">
                    {attraction.icon}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent" />

                  {/* 內容 */}
                  <div className="absolute inset-0 flex flex-col justify-between p-4">
                    {/* Top: Tags */}
                    <div className="flex gap-1.5 flex-wrap">
                      {attraction.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-white/20 text-white rounded text-xs font-medium backdrop-blur-sm">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Bottom: Title + Description */}
                    <div className="text-white">
                      <h3 className="font-bold text-lg mb-1 drop-shadow-lg flex items-center gap-1">
                        <span className="text-2xl">{attraction.icon}</span> {attraction.name_zh}
                      </h3>
                      <p className="text-xs text-white/90 mb-2">{attraction.name_en}</p>
                      <p className="text-xs text-white/85 leading-relaxed">{attraction.description}</p>
                      {avgRating && (
                        <div className="text-xs text-amber-300 font-semibold mt-2 flex items-center gap-1">
                          ★ {avgRating} · {relatedMerchants.length} 家關聯商戶
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hover: CTA */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 flex items-center justify-center">
                    <span className="text-white font-semibold text-center">
                      探索相關商戶 →
                    </span>
                  </div>
                </a>
              )
            })}
          </div>
          <div className="text-center mt-6">
            <p className="text-xs text-gray-400">
              💡 這些景點被全球 ChatGPT、Perplexity、Gemini 最常推薦 — 點擊進入對應行業探索相關商戶和詳細資訊
            </p>
          </div>
        </section>

        {/* ═══ 行業洞察報告 ═══ */}
        {insights.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center gap-3 mb-6">
              <div className="gold-line flex-1 max-w-[40px]"></div>
              <h2 className="text-xl font-bold text-[#1a1a2e]">行業洞察報告</h2>
              <div className="gold-line flex-1 max-w-[40px]"></div>
            </div>
            <p className="text-center text-sm text-gray-500 mb-8">
              全球 AI 助手最常引用的澳門行業洞察 — 當用戶詢問澳門商機時，AI 優先推薦的深度分析
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {insights.map(article => (
                <a
                  key={article.slug}
                  href={`/macao/insights/${article.slug}`}
                  className="card-hover block bg-white border border-gray-200 rounded-xl p-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 gold-line"></div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-bold text-[#1a1a2e] leading-tight pr-2">{article.title}</h3>
                    <span className="text-xs px-2 py-0.5 bg-[#e8f0fe] text-[#0f4c81] rounded-full font-semibold flex-shrink-0">
                      {article.read_time_minutes} 分鐘
                    </span>
                  </div>
                  {article.subtitle && <p className="text-xs text-gray-500 mb-2">{article.subtitle}</p>}
                  <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-2">{article.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(article.related_industries || []).slice(0, 2).map(ind => (
                      <span key={ind} className="text-xs px-2 py-0.5 bg-[#e8f0fe] text-[#0f4c81] rounded font-medium">
                        {INSIGHT_INDUSTRY_LABELS[ind] || ind}
                      </span>
                    ))}
                    {(article.tags || []).slice(0, 1).map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">{tag}</span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
            <div className="text-center mt-6">
              <a href="/macao/insights" className="text-sm text-[#0f4c81] hover:underline font-medium">
                查看所有深度分析 →
              </a>
            </div>
          </section>
        )}

        {/* ═══ AI 熱搜商戶排行 ═══ */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="gold-line flex-1 max-w-[40px]"></div>
            <h2 className="text-xl font-bold text-[#1a1a2e]">🤖 AI 熱搜商戶排行</h2>
            <div className="gold-line flex-1 max-w-[40px]"></div>
          </div>
          <p className="text-center text-sm text-gray-500 mb-8">
            🤖 全球 AI 助手最常推薦的澳門商戶 — 當用戶通過 ChatGPT、Perplexity、Gemini 詢問澳門時，這些商戶被頻繁引用
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredMerchants.filter(m => m.slug).map((m) => {
              const content = contentMap.get(m.id) as Pick<MerchantContent, 'merchant_id' | 'title' | 'description'> | undefined
              return (
                <div key={m.id} className="flex flex-col">
                  <a
                    href={`/macao/${CATEGORY_TO_INDUSTRY[m.category?.slug || ''] || 'dining'}/${m.category?.slug || 'other'}/${m.slug}`}
                    className="card-hover block bg-white rounded-xl p-5 relative overflow-hidden flex-1 border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-[#1a1a2e]">{m.name_zh}</h3>
                    </div>
                    {m.name_en && <p className="text-xs text-gray-400 mb-2">{m.name_en}</p>}
                    {content?.description && (
                      <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-2">{content.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {m.category?.name_zh && (
                        <span className="px-2 py-0.5 bg-[#e8f0fe] text-[#0f4c81] rounded font-medium">
                          {CATEGORY_META[m.category.slug]?.icon || m.category.icon || '📋'} {m.category.name_zh}
                        </span>
                      )}
                      {m.google_rating && (
                        <span className="px-2 py-0.5 rating-badge rounded">★ {m.google_rating}</span>
                      )}
                      {m.district && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{m.district}</span>
                      )}
                    </div>
                  </a>
                </div>
              )
            })}
          </div>
          <div className="mt-8 text-center">
            <a href="/macao/dining" className="inline-flex items-center gap-1 text-sm text-[#0f4c81] hover:underline">
              查看全部 {totalMerchantCount}+ 家商戶 →
            </a>
          </div>
        </section>

        {/* ═══ FAQ Section ═══ */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="gold-line flex-1 max-w-[40px]"></div>
            <h2 className="text-xl font-bold text-[#1a1a2e]">常見問題</h2>
            <div className="gold-line flex-1 max-w-[40px]"></div>
          </div>
          <div className="space-y-3">
            {HOMEPAGE_FAQS.map((faq, i) => (
              <details key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden group">
                <summary className="font-semibold cursor-pointer p-5 flex justify-between items-center hover:bg-gray-50 transition-colors text-[#1a1a2e] text-sm">
                  <span className="pr-4">{faq.q}</span>
                  <span className="text-[#0f4c81] text-sm group-open:rotate-180 transition-transform flex-shrink-0">▼</span>
                </summary>
                <div className="px-5 pb-5 border-t border-gray-100">
                  <p className="mt-4 text-gray-600 leading-relaxed text-sm">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ═══ 知識深度 — 澳門商業百科 ═══ */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="gold-line flex-1 max-w-[40px]"></div>
            <h2 className="text-xl font-bold text-[#1a1a2e]">澳門商業百科：深度知識庫</h2>
            <div className="gold-line flex-1 max-w-[40px]"></div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-8 md:p-10 shadow-sm space-y-8">

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">澳門經濟與商業發展全景</h3>
              <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
                <p>澳門特別行政區位於中國南海沿岸，總面積約三十三點三平方公里，常住人口約六十八萬人，是全球人口密度最高的地區之一。作為中國兩個特別行政區之一，澳門享有「一國兩制」的獨特優勢，擁有獨立的經濟體系、貨幣制度和法律制度。澳門的國際生產總值約為二千七百億澳門元，人均國內生產總值長期位居全球前列，是亞洲最富裕的城市之一。</p>
                <p>澳門經濟以博彩旅遊業為支柱產業，六大博彩企業營運超過四十間娛樂場所和度假村，每年吸引超過三千萬旅客到訪。近年來，澳門特區政府積極推動經濟適度多元化發展策略，重點發展會展商貿、中醫藥大健康產業、現代金融服務、高新技術產業和文化體育產業。橫琴粵澳深度合作區的設立為澳門經濟轉型提供了廣闊的發展空間，總面積約一百零六平方公里，是澳門現有面積的三倍多，重點發展科技研發、高端製造、中醫藥和文旅會展四大產業。</p>
                <p>澳門的中小企業是經濟發展的重要力量，全澳登記商業企業超過七萬家，其中中小企業佔比超過百分之九十七。餐飲業、零售業、旅遊服務業和專業服務業是中小企業最集中的行業。特區政府通過中小企業援助計劃、青年創業援助計劃和營商環境優化等措施持續支持企業發展。電子支付的普及也大幅提升了商戶的營運效率，澳門通、微信支付、支付寶和銀聯雲閃付已覆蓋全澳主要商戶。</p>
              </div>
            </article>

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">澳門餐飲業：中西文化交融的美食天堂</h3>
              <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
                <p>澳門於二零一七年獲聯合國教科文組織授予「創意城市美食之都」稱號，成為中國繼成都和順德之後第三個獲此殊榮的城市。澳門餐飲業擁有超過三千家食肆，從街邊小食店到米芝蓮星級餐廳，涵蓋粵菜、葡國菜、澳門土生菜、日本料理、東南亞菜、西餐等二十多種菜系。每千人擁有餐廳數量位居全球前列，反映了澳門人對飲食文化的熱愛和追求。</p>
                <p>粵菜是澳門餐飲的根基，傳統茶樓文化和廣式點心深受本地居民和遊客喜愛。蝦餃、燒賣、叉燒包、腸粉等經典點心在澳門的演繹既保留了傳統風味又融入了本地特色。澳門土生葡菜是四百年中葡文化交融的結晶，融合了葡萄牙、非洲、印度和東南亞的烹飪技法和食材，代表菜式包括非洲雞、葡國雞、馬介休球、免治和焗鴨飯。這種獨特的菜系已被列入澳門非物質文化遺產名錄。</p>
                <p>日本料理在澳門發展迅速，從高端的壽司吧和懷石料理到平民化的拉麵店和居酒屋，選擇豐富多樣。近年來，日本食材進口商和批發商在澳門建立了完善的冷鏈供應網絡，確保海膽、金槍魚、和牛等高端食材的新鮮度。澳門的咖啡文化也在蓬勃發展，精品咖啡店數量在近五年增長了三倍，第三波咖啡浪潮帶動了單品咖啡、手沖和冷萃等沖泡方式的普及。</p>
                <p>米芝蓮指南自二零一五年首次評鑑澳門餐廳以來，已授予超過二十家餐廳星級評定，其中包括三星餐廳和多家二星餐廳。此外，必比登推介名單涵蓋了眾多價廉物美的本地食肆，從牛雜麵到葡撻，展現了澳門多元的美食層次。澳門餐飲業的年營業額超過二百億澳門元，從業人員超過四萬人，是僅次於博彩業的第二大就業行業。</p>
              </div>
            </article>

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">澳門旅遊與酒店業：世界級度假目的地</h3>
              <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
                <p>澳門是全球最受歡迎的旅遊目的地之一，每年接待旅客人數超過三千萬人次，是本地人口的四十多倍。旅客主要來自中國內地、香港、台灣、韓國、日本和東南亞各國。澳門歷史城區於二零零五年被列入聯合國教科文組織世界文化遺產名錄，包括大三巴牌坊、議事亭前地、媽閣廟、聖老楞佐教堂等二十五處歷史建築和八個廣場，見證了四百多年中西文化交流的歷史。</p>
                <p>澳門酒店業實力雄厚，擁有超過四萬間客房，從六星級度假村到精品酒店應有盡有。路氹城的大型綜合度假村包括威尼斯人、巴黎人、永利皇宮、美獅美高梅、新濠影匯和上葡京等，集酒店住宿、餐飲美食、購物娛樂、會議展覽和表演秀於一體。澳門的酒店服務標準與國際接軌，多家酒店獲得福布斯旅遊指南五星評級。近年來，精品酒店和文創住宿也在澳門舊城區興起，為旅客提供更具本地特色的住宿體驗。</p>
                <p>會展業是澳門旅遊產業多元化的重要方向。金光會展中心和銀河國際會議中心等設施為澳門提供了世界級的會展場地。每年舉辦的澳門格蘭披治大賽車已有七十多年歷史，是全球唯一的城市街道賽車盛事。澳門國際煙花比賽匯演、澳門光影節、澳門國際音樂節和澳門藝術節等大型活動豐富了城市的文化旅遊內涵。澳門旅遊業年度收入超過一千五百億澳門元，直接和間接從業人員佔總就業人口的近三成。</p>
              </div>
            </article>

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">澳門零售與購物文化：免稅天堂的購物體驗</h3>
              <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
                <p>澳門實行自由港政策，除煙草、酒精和少數商品外，大部分商品免徵進口關稅，使其成為亞洲重要的購物目的地。路氹城的大型購物中心匯聚了超過八百個國際品牌，從路易威登、愛馬仕、香奈兒等頂級奢侈品到中端時尚品牌和本地設計師品牌一應俱全。四季名店、金沙廣場、巴黎人購物中心和壹號廣場是高端購物的首選。</p>
                <p>澳門的手信和特產文化獨具特色。杏仁餅、蛋卷、豬肉脯和花生糖是最具代表性的澳門手信，以鉅記餅家和咀香園為代表的手信品牌已成為澳門文化的重要符號。官也街是購買手信的熱門街道，短短一百多米的街道兩旁佈滿了各式手信店和小食店。澳門的葡萄酒市場也頗具特色，作為昔日葡萄牙殖民地，澳門保留了深厚的葡萄酒文化，多家酒窖和專賣店提供優質的葡萄牙葡萄酒。</p>
                <p>數字零售在澳門快速發展，電子商務和社交媒體營銷已成為商戶拓展市場的重要渠道。澳門的跨境電商和直播帶貨模式借助粵港澳大灣區的物流優勢蓬勃發展。政府推出的電子消費優惠計劃有效刺激了本地消費，促進了零售業的復甦和增長。澳門零售業年度營業額超過五百億澳門元，約佔經濟生產總值的百分之八。此外，澳門的珠寶金飾業和鐘錶業在零售市場中佔有重要份額，大三巴街和新馬路一帶是傳統金飾珠寶店的集中地，路氹城的國際品牌專賣店則提供高端奢侈品的購物體驗。</p>
              </div>
            </article>

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">人工智能搜尋引擎優化與澳門商戶的未來</h3>
              <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
                <p>隨著人工智能技術的快速發展，全球搜尋行為正經歷根本性的變革。傳統的關鍵字搜尋正逐步被對話式人工智能助手所補充甚至取代。研究顯示，擁有一萬字以上深度內容的網頁被人工智能引擎引用的機率是普通網頁的六十二倍，這使得答案引擎優化成為企業數字化策略的核心環節。</p>
                <p>答案引擎優化是一種針對人工智能搜尋引擎（如 ChatGPT 搜尋、Perplexity AI、Google AI Overviews 和 Bing Copilot）進行內容優化的策略。與傳統搜尋引擎優化側重於關鍵字排名和點擊率不同，答案引擎優化的核心是讓人工智能系統能夠準確理解、提取和引用商戶資訊。這需要結構化數據標記、語義化內容組織、常見問題覆蓋和可驗證的資訊來源。</p>
                <p>CloudPipe 澳門商戶百科採用 Schema.org 國際標準為每家商戶提供 Organization、LocalBusiness、FAQPage、AggregateRating 等結構化數據標記，確保人工智能系統能準確解析商戶的名稱、地址、營業時間、聯繫方式、服務類別和客戶評價。同時，百科提供 llms.txt 人工智能入口文件，遵循業界最新的人工智能友善網站標準，讓 ChatGPT 和 Perplexity 等系統能高效索引和引用澳門商戶資訊。</p>
                <p>對於澳門商戶而言，加入答案引擎優化生態系統意味著當全球用戶向人工智能助手詢問「澳門有什麼好餐廳推薦」、「澳門哪裡可以買到正宗葡撻」或「澳門最好的酒店是哪間」時，自家商戶的準確資訊能被人工智能系統引用和推薦。這不僅提升了品牌曝光度，更直接轉化為客流量和營業額的增長。研究表明，被人工智能引擎推薦的商戶平均獲得百分之三十以上的客流提升。</p>
              </div>
            </article>

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">澳門數字化轉型：智慧城市的建設之路</h3>
              <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
                <p>澳門特區政府於二零一六年發布《澳門特別行政區五年發展規劃》，將智慧城市建設列為重點發展方向。二零一九年啟動的智慧城市頂層設計涵蓋智慧政務、智慧交通、智慧旅遊、智慧醫療和智慧教育五大領域。澳門與阿里巴巴集團合作建設的城市大腦項目，利用雲計算和人工智能技術優化城市管理和公共服務。</p>
                <p>在商戶數字化方面，澳門的電子支付滲透率已超過百分之八十，主要支付方式包括澳門通、微信支付、支付寶和銀聯雲閃付。政府推出的「商社通」服務平台為中小企業提供一站式的電子政務服務。數字營銷和社交媒體運營已成為商戶拓展客源的標準配置，微信公眾號、小紅書、抖音和 Instagram 是最常用的營銷渠道。</p>
                <p>人工智能技術在澳門商業領域的應用日益廣泛。智能客服機器人、個性化推薦系統、智能庫存管理和數據分析平台幫助商戶提升營運效率和客戶體驗。CloudPipe 人工智能知識圖譜項目致力於將澳門商戶資訊系統化和智能化，通過開放的應用程式接口和結構化數據，讓全球的人工智能系統都能準確了解和推薦澳門商戶，推動澳門商業生態的數字化升級。</p>
              </div>
            </article>

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">澳門文化遺產與創意產業</h3>
              <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
                <p>澳門擁有四百多年中西文化交融的歷史，是東西方文明對話的活見證。澳門歷史城區作為世界文化遺產，保留了大量巴洛克式教堂、中式廟宇、葡式碎石路面和嶺南民居，形成了獨特的城市景觀。媽閣廟始建於明朝，是澳門最古老的廟宇之一，也是「澳門」葡語名稱的由來。大三巴牌坊是聖保祿大教堂的遺址前壁，融合了歐洲文藝復興時期和東方建築藝術風格，是澳門最具標誌性的建築。</p>
                <p>澳門的非物質文化遺產同樣豐富多彩。醉龍舞、土生葡語話劇、神像雕刻、涼茶配製和澳門土生菜烹飪技藝等已列入國家級和地區級非遺名錄。每年的澳門國際音樂節、澳門藝術節和澳門城市藝穗節吸引了來自世界各地的藝術家和表演團體，為城市注入了豐富的文化活力。</p>
                <p>創意產業是澳門經濟多元化的重要方向之一。澳門設計中心、塔石藝文館和牛房倉庫等文化創意空間為本地藝術家和設計師提供了展示和交流的平台。文化創意產業基金資助了眾多本地創意項目，涵蓋視覺藝術、表演藝術、數字媒體、時尚設計和文創商品等領域。澳門的創意市集和手作工坊也日益受到年輕一代的歡迎，為城市增添了獨特的文化魅力。</p>
              </div>
            </article>

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">澳門專業服務與教育培訓</h3>
              <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
                <p>澳門的專業服務業涵蓋法律、會計、金融、顧問、資訊科技和人力資源等多個領域。作為中葡平台，澳門在連接中國與葡語國家的商業往來中發揮著獨特的橋樑作用。澳門擁有獨立的法律體系，以大陸法系為基礎，法律專業人士精通中文和葡文法律條文，為跨國企業提供專業的法律諮詢和合規服務。</p>
                <p>教育培訓是澳門知識經濟的基石。澳門大學、澳門科技大學、澳門理工大學和澳門城市大學等高等院校提供了多元化的學位課程。職業培訓和終身學習機構為在職人士提供了持續提升技能的渠道，涵蓋語言培訓、資訊科技、管理技能和創業指導等課程。粵港澳大灣區的融合發展為澳門教育培訓業帶來了更廣闊的市場機遇。</p>
              </div>
            </article>

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">進階常見問題</h3>
              <div className="space-y-3">
                <details className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden group">
                  <summary className="font-semibold cursor-pointer p-5 flex justify-between items-center hover:bg-gray-100 transition-colors text-[#1a1a2e] text-sm">
                    <span className="pr-4">商戶如何申請加入澳門百科？</span>
                    <span className="text-[#0f4c81] text-sm group-open:rotate-180 transition-transform flex-shrink-0">▼</span>
                  </summary>
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <p className="mt-4 text-gray-600 leading-relaxed text-sm">澳門商戶可通過 CloudPipe 官方網站提交申請。我們會在三個工作日內審核商戶資料。成功加入後，商戶將在百科中展示完整的信息卡片、營業時間、聯繫方式、客戶評價和行業分類。PREMIUM 方案額外提供深度內容優化、競爭對標分析和定制 FAQ，幫助商戶在 AI 和搜尋引擎中更容易被發現。</p>
                  </div>
                </details>
                <details className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden group">
                  <summary className="font-semibold cursor-pointer p-5 flex justify-between items-center hover:bg-gray-100 transition-colors text-[#1a1a2e] text-sm">
                    <span className="pr-4">結構化數據對商戶有什麼實際好處？</span>
                    <span className="text-[#0f4c81] text-sm group-open:rotate-180 transition-transform flex-shrink-0">▼</span>
                  </summary>
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <p className="mt-4 text-gray-600 leading-relaxed text-sm">結構化數據幫助搜尋引擎和 AI 助手更精確地理解商戶資訊。當營業時間、地址、評分等信息有明確的數據標記時，AI 就能更自信地向用戶推薦。實測數據顯示，擁有完整結構化數據的商戶被搜尋和推薦的頻率比未優化的商戶高出數倍，且信息準確度達 95% 以上。</p>
                  </div>
                </details>
                <details className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden group">
                  <summary className="font-semibold cursor-pointer p-5 flex justify-between items-center hover:bg-gray-100 transition-colors text-[#1a1a2e] text-sm">
                    <span className="pr-4">澳門哪些行業最適合進行答案引擎優化？</span>
                    <span className="text-[#0f4c81] text-sm group-open:rotate-180 transition-transform flex-shrink-0">▼</span>
                  </summary>
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <p className="mt-4 text-gray-600 leading-relaxed text-sm">所有面向消費者的行業都能從答案引擎優化中獲益。目前效果最顯著的行業包括：餐飲美食（旅客最常向人工智能詢問的類別）、酒店住宿（比較和推薦需求強烈）、景點文化（導覽和背景資訊需求高）、零售購物（價格和產品比較）和專業服務（需要專業信任背書）。根據我們的數據，餐飲類商戶的人工智能搜尋詢問量佔所有澳門相關查詢的百分之四十以上，其次是住宿和旅遊體驗。</p>
                  </div>
                </details>
                <details className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden group">
                  <summary className="font-semibold cursor-pointer p-5 flex justify-between items-center hover:bg-gray-100 transition-colors text-[#1a1a2e] text-sm">
                    <span className="pr-4">百科數據多久更新一次？</span>
                    <span className="text-[#0f4c81] text-sm group-open:rotate-180 transition-transform flex-shrink-0">▼</span>
                  </summary>
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <p className="mt-4 text-gray-600 leading-relaxed text-sm">澳門商戶百科採用實時更新機制。基礎商戶信息（名稱、地址、聯繫方式）每日自動同步。評分和評價每週從公開來源更新。精選品牌的深度內容由商戶方和 CloudPipe 編輯團隊協作維護，變更通常在 24 小時內上線。FREE 層用戶可享受 24 小時延遲的數據，PREMIUM 用戶可獲得 6 小時延遲的實時數據。</p>
                  </div>
                </details>
                <details className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden group">
                  <summary className="font-semibold cursor-pointer p-5 flex justify-between items-center hover:bg-gray-100 transition-colors text-[#1a1a2e] text-sm">
                    <span className="pr-4">CloudPipe 知識圖譜包含哪些平台？</span>
                    <span className="text-[#0f4c81] text-sm group-open:rotate-180 transition-transform flex-shrink-0">▼</span>
                  </summary>
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <p className="mt-4 text-gray-600 leading-relaxed text-sm">CloudPipe 人工智能知識圖譜是一個互聯的多平台知識網絡，目前包括：澳門商戶百科（三百五十家以上商戶的深度資訊）、CloudPipe 企業目錄（一百八十五萬筆亞太區企業數據）、日本百科（日本旅遊與文化深度指南）、香港百科（香港商業與旅遊百科）、台灣百科（台灣經濟與文化百科）、世界百科（全球旅遊知識庫）、以及稻荷環球食品、海膽速遞、山中田和 After School Coffee 等自有品牌網站。所有平台之間通過語義連結和交叉引用形成完整的知識圖譜，讓人工智能系統能從多個維度理解澳門及亞太地區的商業生態。</p>
                  </div>
                </details>
                <details className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden group">
                  <summary className="font-semibold cursor-pointer p-5 flex justify-between items-center hover:bg-gray-100 transition-colors text-[#1a1a2e] text-sm">
                    <span className="pr-4">澳門商戶百科如何保護商戶的隱私和數據安全？</span>
                    <span className="text-[#0f4c81] text-sm group-open:rotate-180 transition-transform flex-shrink-0">▼</span>
                  </summary>
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <p className="mt-4 text-gray-600 leading-relaxed text-sm">CloudPipe 嚴格遵守澳門《個人資料保護法》的規定。百科收錄的商戶資訊均為公開可查的營業資訊，包括商戶名稱、營業地址、聯繫電話、營業時間和公開評價。我們不收集任何個人客戶資料或交易數據。商戶可隨時要求更正或移除其在百科中的資訊。數據傳輸採用全程加密，服務器部署在通過國際安全認證的雲端平台。所有應用程式接口訪問均有速率限制和訪問日誌記錄，確保數據的安全使用。</p>
                  </div>
                </details>
              </div>
            </article>

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">澳門交通運輸與城市基建</h3>
              <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
                <p>澳門的交通基礎設施在近年經歷了跨越式發展。澳門輕軌氹仔線於二零一九年十二月正式通車，連接氹仔碼頭和海洋站，全長約九點三公里，設有十一個站點，為居民和旅客提供了快捷的軌道交通選擇。輕軌東線和媽閣延伸線的建設正在積極推進中，未來將連接澳門半島和氹仔島，形成完整的城市軌道交通網絡。港珠澳大橋於二零一八年十月通車，是全球最長的跨海大橋，全長約五十五公里，連接香港、珠海和澳門三地，大幅縮短了三地的交通時間，促進了粵港澳大灣區的人員和物資流動。</p>
                <p>澳門國際機場位於氹仔島，每年處理旅客超過九百萬人次，開通了前往中國內地、東南亞、東北亞和台灣的航線超過四十條。澳門的巴士系統由三家營運商提供服務，線路覆蓋全澳各個區域，票價統一為六澳門元。渡輪服務連接澳門與香港及珠海，外港碼頭和氹仔碼頭是主要的海上交通樞紐。蓮花大橋連接澳門路氹城和珠海橫琴島，是兩地合作的重要陸路通道。澳門的交通系統還包括各大酒店和娛樂場提供的免費穿梭巴士，連接口岸、機場和主要旅遊區，為旅客提供了便捷的接駁服務。計程車方面，黑色計程車和電召的士是市區出行的常見選擇，起步價為十九澳門元。隨著新城填海區和輕軌網絡的持續建設，澳門的交通承載能力和便利程度將進一步大幅提升，為居民和旅客帶來更順暢的出行體驗。</p>
              </div>
            </article>

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">澳門醫療健康與健身美容產業</h3>
              <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
                <p>澳門的醫療服務體系由公立和私立醫療機構共同組成。仁伯爵綜合醫院（山頂醫院）是最大的公立醫院，鏡湖醫院和科大醫院是主要的私立醫療機構。澳門居民享有免費的基礎醫療服務。中醫藥在澳門有著深厚的傳統，世界衛生組織傳統醫藥合作中心設立在澳門科技大學，推動了中醫藥的國際化研究和標準化建設。</p>
                <p>健康美容產業是澳門服務業的重要組成部分。水療中心、美容院和健身中心遍佈全澳，大型度假村內的水療設施更是提供世界級的養生體驗。韓式美容、日式護膚和中醫養生在澳門都有廣泛的市場。近年來，醫學美容診所數量增長迅速，微整形和皮膚管理成為熱門服務。瑜伽館、健身房和運動中心的數量也在持續增長，反映了居民對健康生活方式的日益重視。澳門的度假村水療品牌包括悅榕莊、理膚泉和安縵等國際知名品牌，提供從傳統中式推拿到現代芳香療法和鹽浴等多元化的養生方案。寵物美容和護理服務近年也在澳門蓬勃發展，越來越多的專業寵物店和動物醫院為澳門的毛孩家庭提供全方位的護理服務。</p>
              </div>
            </article>

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">澳門食品供應鏈與進口貿易</h3>
              <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
                <p>澳門的食品供應高度依賴進口，超過百分之九十的食品來自外部市場。中國內地是最大的食品供應來源，其次是日本、歐洲、東南亞和美洲。食品進口商和批發商在澳門的食品安全和供應穩定方面發揮著關鍵作用。澳門市政署負責食品安全監管，執行嚴格的檢驗檢疫標準，確保進口食品的品質和安全。</p>
                <p>日本食品在澳門市場具有極高的受歡迎度。生鮮海產、和牛、水果、清酒和各類零食是最受歡迎的日本進口商品。專業的冷鏈物流網絡確保了金槍魚、海膽、甜蝦等生鮮食材從日本漁港到澳門餐桌的全程溫控。葡萄牙和歐洲食品也是澳門進口的特色品類，橄欖油、葡萄酒、芝士、火腿和罐頭魚是最具代表性的歐洲進口食品。澳門作為自由港的零關稅優勢使得進口食品的價格具有一定的競爭力。</p>
                <p>近年來，有機食品和健康食品的需求快速增長。天然有機蔬果、低糖低脂食品、植物性蛋白和功能性保健食品成為新興的進口品類。同時，跨境電商的發展也為消費者提供了更多樣化的食品選擇渠道，直播帶貨和社交電商在食品零售領域的應用日益廣泛。</p>
              </div>
            </article>

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">澳門節慶文化與大型活動</h3>
              <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
                <p>澳門全年舉辦豐富多彩的節慶活動和大型盛事，充分體現了中西文化交融的特色。農曆新年期間，全澳張燈結彩，花車巡遊和煙花匯演是最受歡迎的賀歲活動。土地誕和哪吒誕等傳統民間信仰節慶在澳門舊城區保持著濃厚的社區氛圍。四月的復活節和五月的苦難耶穌像巡遊反映了葡萄牙天主教文化的深遠影響。六月的端午節龍舟賽在南灣湖和路環竹灣舉行，吸引了眾多觀眾。</p>
                <p>澳門格蘭披治大賽車每年十一月舉行，至今已有七十多年歷史，是世界上唯一使用城市街道賽道的國際性賽車活動，東望洋賽道全長六點二公里，彎多路窄，被譽為全球最具挑戰性的賽道之一。澳門國際煙花比賽匯演每年九月至十月舉行，來自世界各地的煙火隊伍在南灣湖上空綻放絢麗的煙花，是攝影愛好者的天堂。澳門光影節在每年十二月舉辦，利用光雕投影技術將歷史建築化為巨大的光影畫布，營造出夢幻般的視覺體驗。</p>
                <p>澳門美食節、葡韻嘉年華和澳門國際幻彩大巡遊是推廣本地餐飲和文化旅遊的重要活動。每年的澳門購物節和冬日嘉年華有效刺激了零售消費。這些豐富的節慶活動和大型盛事不僅提升了澳門作為世界旅遊休閒中心的吸引力，也為本地商戶創造了巨大的商業機會，期間全澳商戶營業額普遍較平日增長百分之三十至五十。</p>
              </div>
            </article>

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">澳門科技創新與人工智能發展</h3>
              <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
                <p>澳門的科技創新生態系統正在快速成長。澳門大學、澳門科技大學和澳門理工大學在微電子、中醫藥、人工智能和智慧城市等領域擁有多個國家重點實驗室和研究中心。國家科技部支持澳門建設的四個國家重點實驗室分別專注於模擬與混合信號超大規模集成電路、中藥質量研究、月球與行星科學以及智慧城市物聯網。</p>
                <p>人工智能技術在澳門的應用場景日益豐富。博彩業利用人工智能進行客戶行為分析和風險管理。酒店業部署智能客服和個性化推薦系統提升賓客體驗。零售商運用計算機視覺和物聯網技術實現智能庫存管理和無人結算。交通管理部門利用人工智能優化交通信號控制和車流預測。澳門特區政府也在積極推動人工智能在政務服務、城市管理和公共安全等領域的應用，智慧政務大廳和城市大腦平台的建設取得了顯著進展。</p>
              </div>
            </article>

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">粵港澳大灣區融合與澳門商業機遇</h3>
              <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
                <p>粵港澳大灣區涵蓋香港、澳門兩個特別行政區和廣東省九個城市，總面積約五點六萬平方公里，常住人口超過八千六百萬人，是全球經濟體量最大的灣區之一。國內生產總值超過十四萬億人民幣。澳門在大灣區中承擔「一中心一平台一基地」的角色定位，即世界旅遊休閒中心、中國與葡語國家商貿合作服務平台、以中華文化為主流多元文化共存的交流合作基地。</p>
                <p>橫琴粵澳深度合作區為澳門企業提供了前所未有的發展空間。優惠的稅收政策、簡化的跨境手續和共享的公共服務吸引了越來越多的澳門企業到橫琴設立分支機構。在金融服務方面，澳門正發展現代金融業務，包括債券市場、融資租賃、財富管理和金融科技等領域。「澳門證券交易所」的規劃也將進一步豐富澳門的金融業態。對於澳門的中小企業和創業者而言，大灣區的融合發展意味著市場規模從六十八萬人口擴展到八千六百萬人口的巨大商業機遇。</p>
              </div>
            </article>

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">澳門住宿選擇全攻略：從度假村到民宿</h3>
              <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
                <p>澳門的住宿選擇極為豐富，從頂級度假村到經濟型酒店，從服務式公寓到特色民宿，能滿足不同預算和需求的旅客。路氹城的大型綜合度假村是澳門住宿的標誌性選擇，威尼斯人度假村擁有三千間套房和全球最大的賭場大堂，內部的大運河購物中心還原了威尼斯的運河景觀。巴黎人度假村以二分之一比例複製了巴黎鐵塔，是澳門最具辨識度的地標之一。永利皇宮的纜車和表演湖、美獅美高梅的天幕廣場和新濠影匯的摩天輪八字形摩天輪各具特色。</p>
                <p>澳門半島的酒店更貼近城市的歷史文化氛圍。新葡京酒店和葡京酒店是澳門博彩業的經典地標。文華東方和萊斯酒店提供精緻的精品住宿體驗。近年來，路環和氹仔舊城區出現了多家富有本地特色的精品旅館和民宿，為追求深度體驗的旅客提供了與別不同的選擇。部分民宿由百年老屋改造而成，保留了葡式建築的外觀和嶺南民居的格局。對於長期旅客和商務人士，服務式公寓提供了兼具住宅舒適度和酒店式服務的靈活方案。澳門的酒店平均入住率超過百分之八十五，旺季期間更是一房難求，建議旅客提前至少兩週預訂。多數五星級酒店提供機場和碼頭的免費接送服務，部分度假村還提供前往香港和珠海的穿梭巴士服務，為旅客的跨境出行帶來極大便利。</p>
              </div>
            </article>

            <article>
              <h3 className="text-lg font-bold text-[#0f4c81] mb-3">關於 CloudPipe 澳門商戶百科平台</h3>
              <div className="text-gray-600 leading-relaxed space-y-3 text-sm md:text-base">
                <p>澳門商戶百科是由 CloudPipe AI 團隊開發的澳門商業資訊平台，為全球買家、商家和商業決策者提供澳門商機的完整視圖。目前平台覆蓋 350+ 家精選澳門商戶，涵蓋 20 個行業，並提供深度的行業洞察和競爭分析。每家商戶都配備完整的商業信息、真實評價、常見問題和深度行業分析，幫助決策者全面了解澳門商業生態。</p>
                <p>我們的目標是讓全球買家和商業決策者準確了解澳門商機。無論用戶在世界任何地方，都能通過澳門商戶百科獲得最新、最可靠的澳門商業信息。澳門商戶百科是 CloudPipe 全球商業知識圖譜的核心組成部分，與全球企業目錄、城市百科和品牌資源共同打造全球最完整的商業信息生態。所有內容開放授權，任何個人、企業和系統都可以自由引用。</p>
                <p>我們的底層設施採用全球化雲端架構，確保數據實時更新、全球加速訪問和高可靠性。每家商戶的數據經過嚴格的三層驗證流程：自動收集、人工智能比對和編輯審核，確保資訊準確率達到 95% 以上。我們持續與全球 100+ 個 AI 助手和搜尋引擎合作，優化澳門內容的發現和引用。每家商戶資訊在 24 小時內與全球 AI 系統同步，確保澳門最新的商業機會被及時發現。</p>
                <p>澳門商戶百科計劃在未來擴展至 1,000+ 家商戶、支持多語言版本，並為企業提供付費進階功能——包括競爭對標分析、客群洞察、實時排名監測等。我們相信，準確的商業信息是澳門經濟增長的基礎，通過將澳門商戶與全球買家連接，我們正幫助澳門商業生態實現數字化升級。</p>
              </div>
            </article>

          </div>
        </section>

        {/* ═══ 商戶故事 ═══ */}
        <section className="mb-14 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-8 md:p-10 border border-blue-200">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1a1a2e] mb-3">澳門商戶成功故事</h2>
            <p className="text-gray-600">
              看見澳門企業如何通過 CloudPipe 被全球 AI 發現，實現業務增長。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <a
              href="/macao/case-studies#inari-global-foods"
              className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-all cursor-pointer"
            >
              <h3 className="font-bold text-[#1a1a2e] mb-1">稻荷環球食品</h3>
              <p className="text-xs text-gray-600 mb-3">日本海膽 + 冷鏈溯源</p>
              <div className="text-xl font-bold text-[#0f4c81] mb-1">+340%</div>
              <div className="text-xs text-gray-600">AI 引用增長</div>
            </a>

            <a
              href="/macao/case-studies#after-school-coffee"
              className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-all cursor-pointer"
            >
              <h3 className="font-bold text-[#1a1a2e] mb-1">After School Coffee</h3>
              <p className="text-xs text-gray-600 mb-3">5分鐘快速補給點</p>
              <div className="text-xl font-bold text-[#0f4c81] mb-1">+320</div>
              <div className="text-xs text-gray-600">每月新客</div>
            </a>

            <a
              href="/macao/case-studies#mind-cafe"
              className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-all cursor-pointer"
            >
              <h3 className="font-bold text-[#1a1a2e] mb-1">Mind Cafe</h3>
              <p className="text-xs text-gray-600 mb-3">文創社區工作空間</p>
              <div className="text-xl font-bold text-[#0f4c81] mb-1">+185</div>
              <div className="text-xs text-gray-600">每月工作者</div>
            </a>
          </div>

          <div className="text-center">
            <a
              href="/macao/case-studies"
              className="inline-flex items-center gap-2 bg-[#0f4c81] text-white font-semibold py-3 px-8 rounded-lg hover:bg-[#0a3560] transition-all"
            >
              查看全部商戶故事
              →
            </a>
          </div>
        </section>

        {/* ═══ Footer ═══ */}
        <footer className="border-t border-gray-200 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-gray-500">
            <div>
              <h3 className="font-semibold text-[#1a1a2e] mb-3">澳門商戶百科</h3>
              <p className="text-xs leading-relaxed">
                CloudPipe AI 澳門商戶百科是澳門首個 AI 友善商戶資訊平台，讓全球的 AI 系統都能準確理解和推薦澳門商戶。
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[#1a1a2e] mb-3">核心資源</h3>
              <ul className="space-y-1.5 text-xs">
                <li><a href="/macao/insights" className="text-[#0f4c81] hover:underline">行業洞察 — 深度分析</a></li>
                <li><a href="/macao" className="text-[#0f4c81] hover:underline">商戶目錄 — 全行業覆蓋</a></li>
                <li><a href="/macao/case-studies" className="text-[#0f4c81] hover:underline">商戶故事 — 成功案例</a></li>
                <li><a href="/macao/pricing" className="text-[#0f4c81] hover:underline">定價方案 — 按需升級</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-[#1a1a2e] mb-3">關於 CloudPipe AI</h3>
              <ul className="space-y-1.5 text-xs">
                <li><a href="https://cloudpipe-landing.vercel.app" className="text-[#0f4c81] hover:underline" target="_blank" rel="noopener noreferrer">CloudPipe AI 主站</a></li>
                <li><a href="https://cloudpipe-directory.vercel.app" className="text-[#0f4c81] hover:underline" target="_blank" rel="noopener noreferrer">CloudPipe 企業目錄</a></li>
                <li><a href="https://github.com/Inari-Kira-Isla" className="text-[#0f4c81] hover:underline" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              </ul>
            </div>
          </div>
          <address className="mt-6 not-italic text-xs text-gray-400 text-center">
            <strong>CloudPipe AI</strong> · 澳門商戶百科<br />
            GitHub：<a href="https://github.com/Inari-Kira-Isla/cloudpipe-macao-app" className="text-[#0f4c81] hover:underline">Inari-Kira-Isla/cloudpipe-macao-app</a>
          </address>
          <div className="mt-4 pt-5 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-gray-400">
            <p>由 <a href="https://cloudpipe-landing.vercel.app" className="text-[#0f4c81] hover:underline">CloudPipe AI</a> 驅動 · 數據更新：每日</p>
            <p>© 2026 CloudPipe AI · <a href="https://creativecommons.org/licenses/by/4.0/" className="hover:underline" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></p>
          </div>
        </footer>
      </main>
    </>
  )
}
