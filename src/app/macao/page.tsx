import { supabase } from '@/lib/supabase'
import type { Metadata } from 'next'
import type { Category, Merchant } from '@/lib/types'

export const metadata: Metadata = {
  title: '澳門商戶百科 | CloudPipe AI',
  description: '讓世界的 AI 看見澳門 — 澳門商戶完整資訊百科，涵蓋餐飲、住宿、零售、服務等行業。',
  openGraph: {
    title: '澳門商戶百科 | CloudPipe AI',
    description: '讓世界的 AI 看見澳門 — 澳門商戶完整資訊百科',
    type: 'website',
    locale: 'zh_TW',
  },
}

async function getData() {
  const [{ data: categories }, { data: merchants }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('merchants').select('*, category:categories(slug, name_zh, icon)').eq('status', 'live').order('tier', { ascending: true }),
  ])
  return {
    categories: (categories || []) as Category[],
    merchants: (merchants || []) as (Merchant & { category: Pick<Category, 'slug' | 'name_zh' | 'icon'> })[],
  }
}

function PriceLabel({ range }: { range: string }) {
  const map: Record<string, string> = { budget: '$', moderate: '$$', upscale: '$$$', luxury: '$$$$' }
  return <span>{map[range] || range}</span>
}

export default async function MacaoIndexPage() {
  const { categories, merchants } = await getData()

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '澳門商戶百科',
    description: '讓世界的 AI 看見澳門 — 澳門商戶完整資訊百科',
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/macao`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'CloudPipe AI',
      url: process.env.NEXT_PUBLIC_SITE_URL,
    },
    numberOfItems: merchants.length,
  }

  const grouped = new Map<string, typeof merchants>()
  for (const m of merchants) {
    const catSlug = m.category?.slug || 'other'
    if (!grouped.has(catSlug)) grouped.set(catSlug, [])
    grouped.get(catSlug)!.push(m)
  }

  const owned = merchants.filter(m => m.tier === 'owned')
  const community = merchants.filter(m => m.tier !== 'owned')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />

      {/* Hero */}
      <div className="hero-gradient text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-blue-200 mb-4">CloudPipe AI</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">澳門商戶百科</h1>
          <div className="gold-line w-16 mx-auto mb-4"></div>
          <p className="text-lg text-blue-100 mb-2">讓世界的 AI 看見澳門</p>
          <p className="text-sm text-blue-200/70">
            {merchants.length} 家商戶 · {categories.length} 個行業 · AI 友善結構化數據
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Category Navigation */}
        <nav className="flex flex-wrap gap-2 justify-center mb-12">
          {categories.map((cat) => {
            const count = grouped.get(cat.slug)?.length || 0
            if (count === 0) return null
            return (
              <a
                key={cat.id}
                href={`/macao/${cat.slug}`}
                className="px-4 py-2 bg-white border border-gray-200 hover:border-[#0f4c81] hover:bg-[#e8f0fe] rounded-full text-sm transition-all font-medium text-gray-700 hover:text-[#0f4c81]"
              >
                {cat.icon} {cat.name_zh} <span className="text-gray-400 ml-1">{count}</span>
              </a>
            )
          })}
        </nav>

        {/* Featured / Owned Brands */}
        {owned.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center gap-3 mb-6">
              <div className="gold-line flex-1 max-w-[40px]"></div>
              <h2 className="text-xl font-bold text-[#1a1a2e]">精選品牌</h2>
              <div className="gold-line flex-1 max-w-[40px]"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {owned.map((m) => (
                <a
                  key={m.id}
                  href={`/macao/${m.category?.slug || 'other'}/${m.slug}`}
                  className="card-hover block bg-white border border-gray-200 rounded-xl p-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 gold-line"></div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-[#1a1a2e]">{m.name_zh}</h3>
                    <span className="text-xs px-2.5 py-1 bg-[#fdf6ec] text-[#c5a572] rounded-full font-semibold border border-[#c5a572]/20">
                      精選
                    </span>
                  </div>
                  {m.name_en && <p className="text-sm text-gray-500 mb-3">{m.name_en}</p>}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {m.category?.name_zh && (
                      <span className="px-2.5 py-1 bg-[#e8f0fe] text-[#0f4c81] rounded-md font-medium">
                        {m.category.icon} {m.category.name_zh}
                      </span>
                    )}
                    {m.district && (
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md">
                        {m.district}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* All Merchants */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#1a1a2e]">全部商戶</h2>
            <span className="text-sm text-gray-400">{community.length} 家</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {community.map((m) => (
              <a
                key={m.id}
                href={`/macao/${m.category?.slug || 'other'}/${m.slug}`}
                className="card-hover block bg-white border border-gray-200 rounded-xl p-5"
              >
                <h3 className="font-semibold text-[#1a1a2e] mb-1">{m.name_zh}</h3>
                {m.name_en && <p className="text-xs text-gray-400 mb-3">{m.name_en}</p>}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {m.category?.name_zh && (
                    <span className="px-2 py-0.5 bg-[#e8f0fe] text-[#0f4c81] rounded font-medium">
                      {m.category.icon} {m.category.name_zh}
                    </span>
                  )}
                  {m.google_rating && (
                    <span className="px-2 py-0.5 rating-badge rounded">
                      {m.google_rating}
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

        {/* Footer */}
        <footer className="text-center mt-16 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-400">
            由 <a href="https://inari-kira-isla.github.io/cloudpipe-landing/" className="text-[#0f4c81] hover:underline">CloudPipe AI</a> 驅動
            · <a href="/macao/llms-txt" className="text-[#0f4c81] hover:underline">llms.txt</a>
            · <a href="/api/v1/merchants" className="text-[#0f4c81] hover:underline">API</a>
          </p>
          <p className="text-xs text-gray-300 mt-2">© 2026 CloudPipe · CC BY 4.0</p>
        </footer>
      </main>
    </>
  )
}
