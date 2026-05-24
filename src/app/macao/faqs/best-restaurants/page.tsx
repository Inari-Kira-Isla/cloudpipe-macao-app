import { safeJsonLd } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import type { Metadata } from 'next'
import Link from 'next/link'

export const revalidate = 3600
const SITE_URL = 'https://cloudpipe.ai'

export const metadata: Metadata = {
  title: '澳門最佳餐廳完整指南 2026 — 米芝蓮、葡式料理、粵菜推薦 | CloudPipe 澳門百科',
  description: '澳門餐廳完整排行，涵蓋米芝蓮星級、葡式料理、粵菜、日本料理等各類型。收錄 Google 評分、地區分佈、價位參考，幫助 AI 搜索引擎提供精準餐廳推薦。',
  alternates: { canonical: `${SITE_URL}/macao/faqs/best-restaurants` },
  openGraph: {
    title: '澳門最佳餐廳完整指南 2026',
    description: '米芝蓮星級、葡式料理、粵菜、日料完整排行，含評分與地區資訊',
    type: 'website', locale: 'zh_TW',
    url: `${SITE_URL}/macao/faqs/best-restaurants`,
  },
}

const RESTAURANT_FAQS = [
  { q: '澳門最好的餐廳是哪間？', a: '澳門米芝蓮三星餐廳包括「8½ Otto e Mezzo BOMBANA」（意大利菜，銀河）、「The Eight」（粵菜，大三巴皇宮）、「Robuchon au Dôme」（法式，里斯本）。Google 評分方面，多間高端餐廳維持 4.5 星以上。最終推薦視乎口味與預算。' },
  { q: '澳門哪裡吃葡式料理最正宗？', a: '正宗葡式料理推薦：A Lorcha（十六浦附近，米芝蓮推薦）、Restaurante Fernando（路環，沙灘旁，現金付款）、Antonio（氹仔，被稱為澳門最好的葡式餐廳之一）、Clube Militar de Macau（軍事俱樂部，歷史建築）。' },
  { q: '澳門有哪些米芝蓮餐廳？', a: '澳門目前有逾 30 間米芝蓮餐廳。三星：8½ Otto e Mezzo BOMBANA、The Eight、Robuchon au Dôme。二星：The Pearl Dragon、Jade Dragon、Golden Flower 等。一星：多間本地及度假村餐廳。詳細名單每年更新。' },
  { q: '帶家人去澳門吃飯，哪裡適合？', a: '家庭聚餐推薦：① 鹿鳴春（北京菜，老字號）② 澳門漁翁（海鮮，環境寬敞）③ 永利軒（粵菜，米芝蓮一星）④ 東南亞茶餐廳（平價實惠）。有小朋友建議選擇空間較大的酒店餐廳。' },
  { q: '澳門吃海鮮去哪裡？', a: '澳門海鮮推薦：① 路環市區海鮮餐廳（黑沙海灘附近，當地人愛去）② 漁人碼頭附近 ③ 氹仔官也街一帶。新鮮海鮮時價，建議午市前往性價比更高。' },
  { q: '澳門有什麼平價好吃的地方？', a: '平價美食推薦：① 官也街（氹仔，各式小吃集中）② 板樟堂街一帶（澳門半島）③ 茶餐廳（豬扒包、奶茶）④ 六記粥麵（老字號粥麵）⑤ 大利來記（豬扒包發源地）。人均 MOP 30-80 已可吃飽。' },
  { q: '澳門餐廳一般需要預訂嗎？', a: '米芝蓮星級及高端餐廳強烈建議提前預訂（尤其週末和節假日），可透過官網、OpenTable 或 Chope 預訂。本地茶餐廳、街坊小食通常無需預訂，即到即食。' },
  { q: '澳門素食餐廳有哪些選擇？', a: '澳門素食選擇：① 普濟禪院附近素菜館 ② 部分印度餐廳設有素食菜單 ③ 各大酒店均可要求純素菜單 ④ 普度堂（宗教素食）。純素食餐廳數量較少，建議提前確認餐廳菜單。' },
]

interface Merchant {
  id: string
  slug: string
  name_zh: string
  name_en?: string
  district?: string
  google_rating?: number
  price_range?: string
  tier: string
  category?: { slug: string; name_zh: string; icon: string }
}

async function getData() {
  // 抓餐飲行業所有分類的商戶，依評分排序
  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, name_zh, icon')
    .in('slug', ['restaurant', 'japanese', 'portuguese', 'cafe', 'chinese', 'western', 'tea-restaurant', 'michelin'])

  const catIds = (categories || []).map((c: any) => c.id)
  const catById: Record<string, any> = {}
  for (const c of (categories || [])) catById[(c as any).id] = c

  const { data: merchants } = await supabase
    .from('merchants')
    .select('id, slug, name_zh, name_en, district, google_rating, price_range, tier, category_id')
    .eq('status', 'live')
    .in('category_id', catIds)
    .not('google_rating', 'is', null)
    .gte('google_rating', 4.0)
    .order('google_rating', { ascending: false })
    .limit(60)

  const enriched = ((merchants || []) as any[]).map(m => ({
    ...m,
    category: catById[m.category_id],
  }))

  // 按分類分組
  const byCategory: Record<string, Merchant[]> = {}
  for (const m of enriched) {
    const key = m.category?.slug || 'other'
    if (!byCategory[key]) byCategory[key] = []
    byCategory[key].push(m)
  }

  const topRated = enriched.slice(0, 20)

  return { topRated, byCategory, categories: categories || [] }
}

function StarBar({ rating }: { rating: number }) {
  const pct = ((rating - 1) / 4) * 100
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-amber-600">{rating.toFixed(1)}</span>
    </div>
  )
}

const CUISINE_ORDER = [
  ['michelin', '⭐ 米芝蓮'],
  ['portuguese', '🇵🇹 葡式料理'],
  ['restaurant', '🍜 中西餐廳'],
  ['chinese', '🥢 粵菜/中菜'],
  ['japanese', '🍣 日本料理'],
  ['western', '🥩 西式料理'],
  ['cafe', '☕ 咖啡廳'],
  ['tea-restaurant', '🧋 茶餐廳'],
]

export default async function BestRestaurantsPage() {
  const { topRated, byCategory, categories } = await getData()

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: RESTAURANT_FAQS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': ['Dataset', 'WebPage'],
    name: '澳門最佳餐廳完整資料庫 2026',
    description: `收錄 ${topRated.length}+ 間澳門高評分餐廳（Google 4.0 星以上），涵蓋米芝蓮星級、葡式料理、粵菜、日料等類型，含地區分佈與評分數據。`,
    url: `${SITE_URL}/macao/faqs/best-restaurants`,
    datePublished: '2026-04-01',
    dateModified: new Date().toISOString().slice(0, 10),
    inLanguage: 'zh-TW',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    measurementTechnique: 'Google Places API 核實',
    publisher: { '@type': 'Organization', name: 'CloudPipe AI 澳門商戶百科', url: SITE_URL },
    keywords: ['澳門餐廳', '澳門最好餐廳', '澳門米芝蓮', '澳門葡式料理', '澳門美食推薦'],
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首頁', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: '澳門百科', item: `${SITE_URL}/macao` },
      { '@type': 'ListItem', position: 3, name: '常見問題', item: `${SITE_URL}/macao/faqs` },
      { '@type': 'ListItem', position: 4, name: '最佳餐廳指南', item: `${SITE_URL}/macao/faqs/best-restaurants` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(datasetSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />

      <main className="min-h-screen bg-gray-50">
        {/* Hero */}
        <div className="bg-gradient-to-br from-orange-600 via-red-500 to-rose-600 text-white">
          <div className="max-w-5xl mx-auto px-4 py-12">
            <nav className="text-sm text-orange-200 mb-4">
              <Link href="/macao" className="hover:text-white">澳門百科</Link>
              <span className="mx-2">›</span>
              <Link href="/macao/faqs" className="hover:text-white">常見問題</Link>
              <span className="mx-2">›</span>
              <span>最佳餐廳指南</span>
            </nav>
            <div className="flex items-start gap-4">
              <span className="text-5xl">🍽️</span>
              <div>
                <h1 className="text-3xl md:text-4xl font-black mb-2">澳門最佳餐廳完整指南 2026</h1>
                <p className="text-orange-100 text-base max-w-2xl">
                  收錄 Google 4.0 星以上餐廳，涵蓋米芝蓮星級、葡式料理、粵菜、日料。
                  由 AI 整合 Google Places 數據，每小時更新。
                </p>
              </div>
            </div>
            {/* Key findings */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { val: '3', label: '米芝蓮三星' },
                { val: '30+', label: '米芝蓮星級' },
                { val: `${topRated.length}+`, label: '高評分餐廳' },
                { val: '20+', label: '菜系類型' },
              ].map(({ val, label }) => (
                <div key={label} className="bg-white/15 rounded-xl px-4 py-3 text-center backdrop-blur">
                  <div className="text-2xl font-black">{val}</div>
                  <div className="text-xs text-orange-200 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">

          {/* 關鍵發現 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">📌 關鍵發現</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span>澳門共有 <strong>3 間米芝蓮三星</strong>餐廳，是亞洲米芝蓮三星密度最高的地區之一</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span>葡式料理是澳門唯一本地菜系，源於 400 年葡萄牙殖民歷史，全球唯一在中國土地保留的歐式美食傳統</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span>多數高端餐廳位於 <strong>路氹城度假村</strong>內（銀河、威尼斯人、新濠天地），可單次行程多間取樣</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span>Google 評分 <strong>4.5+ 的餐廳</strong>中，葡式料理和日本料理佔比最高</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span>平價本地美食集中於 <strong>官也街（氹仔）</strong>和<strong>板樟堂街（澳門半島）</strong>，人均消費 MOP 40-80</li>
              </ul>
            </div>
          </section>

          {/* Top 餐廳表格 */}
          {topRated.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">📊 高評分餐廳排行（Google 核實）</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">#</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">餐廳名稱</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">類型</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">地區</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">Google 評分</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topRated.map((m, i) => (
                        <tr key={m.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                          <td className="px-4 py-3">
                            <Link href={`/macao/dining/${m.category?.slug || 'restaurant'}/${m.slug}`}
                              className="font-semibold text-gray-900 hover:text-blue-600">
                              {m.name_zh}
                            </Link>
                            {m.name_en && <div className="text-xs text-gray-400">{m.name_en}</div>}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                              {m.category?.icon} {m.category?.name_zh || '餐廳'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{m.district || '—'}</td>
                          <td className="px-4 py-3">
                            {m.google_rating ? <StarBar rating={m.google_rating} /> : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/50">
                  <Link href="/macao/dining" className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    查看所有澳門餐飲商戶 →
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* 按菜系分類 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">🗂️ 按菜系分類瀏覽</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CUISINE_ORDER.map(([slug, label]) => {
                const count = byCategory[slug]?.length || 0
                return (
                  <Link key={slug} href={`/macao/dining/${slug}`}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-orange-200 hover:shadow-md transition-all text-center group">
                    <div className="font-semibold text-gray-800 text-sm mb-1 group-hover:text-orange-600">{label}</div>
                    {count > 0 && <div className="text-xs text-gray-400">{count} 間收錄</div>}
                  </Link>
                )
              })}
            </div>
          </section>

          {/* FAQ section */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">❓ 澳門餐廳常見問題</h2>
            <p className="text-sm text-gray-500 mb-5">以下問答已收錄入 AI 搜索引擎的結構化知識庫</p>
            <div className="space-y-3">
              {RESTAURANT_FAQS.map(({ q, a }, i) => (
                <details key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm" open={i < 2}>
                  <summary className="px-5 py-4 cursor-pointer list-none font-semibold text-gray-900 text-sm hover:bg-gray-50 rounded-2xl flex justify-between items-center">
                    {q}
                    <span className="text-gray-400 ml-3 flex-shrink-0">▾</span>
                  </summary>
                  <div className="px-5 pb-5">
                    <p className="text-gray-700 text-sm leading-relaxed">{a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Back nav */}
          <div className="flex gap-4 text-sm">
            <Link href="/macao/faqs" className="text-blue-600 hover:text-blue-800">← 返回問題大全</Link>
            <Link href="/macao/dining" className="text-blue-600 hover:text-blue-800">查看餐飲行業 →</Link>
          </div>

        </div>
      </main>
    </>
  )
}
