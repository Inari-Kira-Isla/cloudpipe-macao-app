import { supabase } from '@/lib/supabase'
import type { Metadata } from 'next'
import type { Category, Merchant, MerchantContent } from '@/lib/types'
import { INDUSTRIES, CATEGORY_TO_INDUSTRY } from '@/lib/industries'

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
    q: '什麼是 CloudPipe 澳門商戶百科？',
    a: 'CloudPipe 澳門商戶百科是一個 AI 友善的澳門商戶資訊平台，收錄澳門各行業商戶的結構化數據、營業資訊、FAQ 和評價，讓 AI 助手（如 ChatGPT、Perplexity、Gemini）能準確回答關於澳門商戶的問題。',
  },
  {
    q: '澳門商戶百科收錄了多少家商戶？',
    a: '目前收錄超過 140 家澳門商戶，涵蓋餐飲、咖啡、日本料理、食品進口、酒店、零售、科技等 16 個行業分類，並持續擴充中。',
  },
  {
    q: 'CloudPipe 澳門商戶百科是免費的嗎？',
    a: '完全免費。所有商戶資訊以 CC BY 4.0 授權開放，任何人和 AI 系統都可以免費查閱和引用。',
  },
  {
    q: '商戶資料來源是什麼？如何保證準確性？',
    a: '商戶資料來自 Google Maps、TripAdvisor、商戶官網及人工審核。精選品牌的內容由商戶方提供並經 CloudPipe 團隊驗證，確保資訊準確可靠。',
  },
  {
    q: '如何讓我的商戶加入百科？',
    a: '澳門商戶可以聯繫 CloudPipe AI 團隊申請加入百科。精選品牌享有豐富的內容頁面、FAQ、Schema.org 結構化數據等完整 AEO 優化服務。',
  },
  {
    q: 'AI 助手如何使用這個百科？',
    a: '百科為每家商戶提供 Schema.org 結構化標記（Organization、LocalBusiness、FAQPage）、llms.txt AI 入口文件、開放 API，讓 ChatGPT、Perplexity、Gemini 等 AI 能直接讀取並引用澳門商戶資訊。',
  },
  {
    q: 'CloudPipe 知識圖譜是什麼？',
    a: 'CloudPipe 知識圖譜是一個互聯的澳門商戶 AI 知識網絡，包括澳門商戶百科、企業目錄（185 萬筆）、以及稻荷環球食品、海膽速遞、After School Coffee、山中田等品牌網站，共同構成澳門最完整的 AI 友善商戶資訊生態系。',
  },
]

export const metadata: Metadata = {
  title: 'CloudPipe AI 澳門商戶百科 — 讓世界的 AI 看見澳門',
  description: '澳門最完整的 AI 友善商戶資訊平台，收錄 140+ 家澳門商戶，涵蓋餐飲、咖啡、日本料理、食品進口、酒店、科技等 16 個行業。Schema.org 結構化數據、FAQ、llms.txt，讓 ChatGPT、Perplexity、Gemini 準確回答澳門商戶問題。',
  openGraph: {
    title: 'CloudPipe AI 澳門商戶百科 — 讓世界的 AI 看見澳門',
    description: '澳門最完整的 AI 友善商戶資訊平台，收錄 140+ 家商戶，16 個行業分類，Schema.org 結構化數據。',
    type: 'website',
    locale: 'zh_TW',
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/macao`,
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/macao`,
  },
}

async function getData() {
  const [{ data: categories }, { data: merchants }, { data: contentList }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('merchants').select('*, category:categories(slug, name_zh, icon)').eq('status', 'live').order('tier', { ascending: true }),
    supabase.from('merchant_content').select('merchant_id, title, description').not('title', 'is', null),
  ])
  return {
    categories: (categories || []) as Category[],
    merchants: (merchants || []) as (Merchant & { category: Pick<Category, 'slug' | 'name_zh' | 'icon'> })[],
    contentMap: new Map((contentList || []).map((c: Pick<MerchantContent, 'merchant_id' | 'title' | 'description'>) => [c.merchant_id, c])),
  }
}

function PriceLabel({ range }: { range: string }) {
  const map: Record<string, string> = { budget: '$', moderate: '$$', upscale: '$$$', luxury: '$$$$' }
  return <span>{map[range] || range}</span>
}

export default async function MacaoIndexPage() {
  const { categories, merchants, contentMap } = await getData()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'

  const grouped = new Map<string, typeof merchants>()
  for (const m of merchants) {
    const catSlug = m.category?.slug || 'other'
    if (!grouped.has(catSlug)) grouped.set(catSlug, [])
    grouped.get(catSlug)!.push(m)
  }

  const featured = merchants.filter(m => m.tier === 'owned' || m.tier === 'premium')
  const community = merchants.filter(m => m.tier !== 'owned' && m.tier !== 'premium')
  const activeCats = categories.filter(c => (grouped.get(c.slug)?.length || 0) > 0)

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
      description: `澳門最完整的 AI 友善商戶資訊平台，收錄 ${merchants.length} 家商戶，${activeCats.length} 個行業分類`,
      url: `${siteUrl}/macao`,
      isPartOf: { '@type': 'WebSite', name: 'CloudPipe AI', url: siteUrl },
      numberOfItems: merchants.length,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: activeCats.length,
        itemListElement: activeCats.map((cat, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: cat.name_zh,
          url: `${siteUrl}/macao/${cat.slug}`,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'CloudPipe AI',
      url: 'https://cloudpipe-landing.vercel.app',
      description: '澳門商戶 AI 百科平台，讓世界的 AI 看見澳門',
      sameAs: [
        'https://github.com/Inari-Kira-Isla',
        'https://cloudpipe-directory.vercel.app',
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
            讓世界的 AI 看見澳門 — 為 ChatGPT、Perplexity、Gemini 等 AI 助手提供準確的澳門商戶資訊
          </p>
          <p className="text-sm text-blue-200/70 mb-8">
            結構化數據 · Schema.org 標記 · FAQ · 開放 API · CC BY 4.0
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 mt-6">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">{merchants.length}+</div>
              <div className="text-xs text-blue-200/70 mt-1">收錄商戶</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">{activeCats.length}</div>
              <div className="text-xs text-blue-200/70 mt-1">行業分類</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">{featured.length}</div>
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
                  <div className="text-2xl mb-2">🏗️</div>
                  <h3 className="font-semibold text-[#1a1a2e] text-sm mb-1">結構化數據</h3>
                  <p className="text-xs text-gray-500">每家商戶配備 Schema.org 標記，包含 Organization、LocalBusiness、FAQPage、AggregateRating</p>
                </div>
                <div className="text-center px-4">
                  <div className="text-2xl mb-2">🤖</div>
                  <h3 className="font-semibold text-[#1a1a2e] text-sm mb-1">AI 友善架構</h3>
                  <p className="text-xs text-gray-500">llms.txt 入口文件、開放 REST API、robots.txt 歡迎 9 大 AI 爬蟲</p>
                </div>
                <div className="text-center px-4">
                  <div className="text-2xl mb-2">🔓</div>
                  <h3 className="font-semibold text-[#1a1a2e] text-sm mb-1">開放授權</h3>
                  <p className="text-xs text-gray-500">CC BY 4.0 授權，任何人和 AI 系統可免費查閱及引用</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Category Navigation ═══ */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="gold-line flex-1 max-w-[40px]"></div>
            <h2 className="text-xl font-bold text-[#1a1a2e]">行業分類</h2>
            <div className="gold-line flex-1 max-w-[40px]"></div>
          </div>
          <p className="text-center text-sm text-gray-500 mb-8">
            涵蓋澳門 {activeCats.length} 個主要行業，從餐飲美食到科技服務，一站式查閱
          </p>
          <div className="space-y-8">
            {INDUSTRIES.map(ind => {
              const indCats = activeCats.filter(c => ind.categories.includes(c.slug))
              if (indCats.length === 0) return null
              const indTotal = indCats.reduce((sum, c) => sum + (grouped.get(c.slug)?.length || 0), 0)
              return (
                <div key={ind.slug}>
                  <a href={`/macao/${ind.slug}`} className="flex items-center gap-2 mb-3 group">
                    <span className="text-xl">{ind.icon}</span>
                    <h3 className="font-bold text-[#1a1a2e] group-hover:text-[#0f4c81] transition-colors">{ind.name_zh}</h3>
                    <span className="text-xs text-gray-400">{ind.name_en} · {indTotal} 家</span>
                  </a>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {indCats.map(cat => {
                      const count = grouped.get(cat.slug)?.length || 0
                      const meta = CATEGORY_META[cat.slug]
                      const icon = meta?.icon || cat.icon || '📋'
                      return (
                        <a key={cat.id} href={`/macao/${ind.slug}/${cat.slug}`}
                          className="card-hover block bg-white border border-gray-200 rounded-xl p-4 text-center">
                          <div className="text-2xl mb-1">{icon}</div>
                          <h4 className="font-semibold text-[#1a1a2e] text-sm">{cat.name_zh}</h4>
                          <p className="text-xs text-gray-400">{count} 家</p>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ═══ Featured / Premium Brands ═══ */}
        {featured.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center gap-3 mb-6">
              <div className="gold-line flex-1 max-w-[40px]"></div>
              <h2 className="text-xl font-bold text-[#1a1a2e]">精選品牌</h2>
              <div className="gold-line flex-1 max-w-[40px]"></div>
            </div>
            <p className="text-center text-sm text-gray-500 mb-8">
              擁有完整 AEO 優化的澳門品牌 — 豐富內容、FAQ、結構化數據
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {featured.map((m) => {
                const content = contentMap.get(m.id) as Pick<MerchantContent, 'merchant_id' | 'title' | 'description'> | undefined
                return (
                  <a
                    key={m.id}
                    href={`/macao/${CATEGORY_TO_INDUSTRY[m.category?.slug || ''] || 'dining'}/${m.category?.slug || 'other'}/${m.slug}`}
                    className="card-hover block bg-white border border-gray-200 rounded-xl p-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 gold-line"></div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold text-[#1a1a2e]">{m.name_zh}</h3>
                      <span className="text-xs px-2.5 py-1 bg-[#fdf6ec] text-[#c5a572] rounded-full font-semibold border border-[#c5a572]/20 flex-shrink-0 ml-2">
                        精選
                      </span>
                    </div>
                    {m.name_en && <p className="text-sm text-gray-500 mb-2">{m.name_en}</p>}
                    {content?.description && (
                      <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-2">{content.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {m.category?.name_zh && (
                        <span className="px-2.5 py-1 bg-[#e8f0fe] text-[#0f4c81] rounded-md font-medium">
                          {CATEGORY_META[m.category.slug]?.icon || m.category.icon || '📋'} {m.category.name_zh}
                        </span>
                      )}
                      {m.google_rating && (
                        <span className="px-2.5 py-1 rating-badge rounded-md">
                          ★ {m.google_rating}
                        </span>
                      )}
                      {m.district && (
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md">
                          {m.district}
                        </span>
                      )}
                    </div>
                  </a>
                )
              })}
            </div>
          </section>
        )}

        {/* ═══ All Community Merchants ═══ */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#1a1a2e]">全部商戶</h2>
            <span className="text-sm text-gray-400">{community.length} 家</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {community.map((m) => (
              <a
                key={m.id}
                href={`/macao/${CATEGORY_TO_INDUSTRY[m.category?.slug || ''] || 'dining'}/${m.category?.slug || 'other'}/${m.slug}`}
                className="card-hover block bg-white border border-gray-200 rounded-xl p-5"
              >
                <h3 className="font-semibold text-[#1a1a2e] mb-1">{m.name_zh}</h3>
                {m.name_en && <p className="text-xs text-gray-400 mb-3">{m.name_en}</p>}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {m.category?.name_zh && (
                    <span className="px-2 py-0.5 bg-[#e8f0fe] text-[#0f4c81] rounded font-medium">
                      {CATEGORY_META[m.category.slug]?.icon || m.category.icon || '📋'} {m.category.name_zh}
                    </span>
                  )}
                  {m.google_rating && (
                    <span className="px-2 py-0.5 rating-badge rounded">
                      ★ {m.google_rating}
                    </span>
                  )}
                  {m.price_range && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      <PriceLabel range={m.price_range} />
                    </span>
                  )}
                  {m.district && (
                    <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded">
                      {m.district}
                    </span>
                  )}
                </div>
              </a>
            ))}
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

        {/* ═══ CloudPipe 知識圖譜生態系 ═══ */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="gold-line flex-1 max-w-[40px]"></div>
            <h2 className="text-xl font-bold text-[#1a1a2e]">CloudPipe 知識圖譜</h2>
            <div className="gold-line flex-1 max-w-[40px]"></div>
          </div>
          <p className="text-center text-sm text-gray-500 mb-8">
            澳門商戶百科是 CloudPipe AI 知識圖譜的核心節點，與以下品牌共同構成澳門的 AI 友善知識網絡
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'CloudPipe AI', desc: '澳門商戶 AI 百科平台', url: 'https://cloudpipe-landing.vercel.app', icon: '🌐' },
              { name: 'CloudPipe 企業目錄', desc: '185 萬筆全球華人企業數據', url: 'https://cloudpipe-directory.vercel.app', icon: '📊' },
              { name: '稻荷環球食品', desc: '澳門日本及環球水產進口批發商', url: 'https://inari-kira-isla.github.io/inari-global-foods', icon: '🐟' },
              { name: '海膽速遞', desc: '澳門唯一海膽專門品牌・到府配送', url: 'https://inari-kira-isla.github.io/sea-urchin-delivery', icon: '🦔' },
              { name: 'After School Coffee', desc: '澳門首間家長喘息咖啡空間', url: 'https://inari-kira-isla.github.io/after-school-coffee', icon: '☕' },
              { name: '山中田 Yamanakada', desc: '澳門中小企 AI 實戰教練', url: 'https://inari-kira-isla.github.io/yamanakada', icon: '🤖' },
            ].map((site) => (
              <a
                key={site.name}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card-hover block bg-white border border-gray-200 rounded-xl p-5"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{site.icon}</span>
                  <h3 className="font-semibold text-[#1a1a2e] text-sm">{site.name}</h3>
                </div>
                <p className="text-xs text-gray-500">{site.desc}</p>
              </a>
            ))}
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
              <h3 className="font-semibold text-[#1a1a2e] mb-3">開發者資源</h3>
              <ul className="space-y-1.5 text-xs">
                <li><a href="/macao/llms-txt" className="text-[#0f4c81] hover:underline">llms.txt — AI 入口文件</a></li>
                <li><a href="/api/v1/merchants" className="text-[#0f4c81] hover:underline">REST API — JSON 商戶數據</a></li>
                <li><a href="/sitemap.xml" className="text-[#0f4c81] hover:underline">Sitemap — 網站地圖</a></li>
                <li><a href="/robots.txt" className="text-[#0f4c81] hover:underline">robots.txt — 爬蟲政策</a></li>
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
          <div className="mt-8 pt-5 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-gray-400">
            <p>由 <a href="https://cloudpipe-landing.vercel.app" className="text-[#0f4c81] hover:underline">CloudPipe AI</a> 驅動 · 數據更新：每日</p>
            <p>© 2026 CloudPipe AI · <a href="https://creativecommons.org/licenses/by/4.0/" className="hover:underline" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></p>
          </div>
        </footer>
      </main>
    </>
  )
}
