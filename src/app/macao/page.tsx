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

  // Group merchants by category
  const grouped = new Map<string, typeof merchants>()
  for (const m of merchants) {
    const catSlug = m.category?.slug || 'other'
    if (!grouped.has(catSlug)) grouped.set(catSlug, [])
    grouped.get(catSlug)!.push(m)
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">澳門商戶百科</h1>
          <p className="text-xl text-gray-500">讓世界的 AI 看見澳門</p>
          <p className="text-sm text-gray-400 mt-2">
            {merchants.length} 家商戶 · {categories.length} 個行業 · CloudPipe AI 生態系
          </p>
        </header>

        {/* Category Chips */}
        <nav className="flex flex-wrap gap-2 justify-center mb-10">
          {categories.map((cat) => {
            const count = grouped.get(cat.slug)?.length || 0
            return (
              <a
                key={cat.id}
                href={`/macao/${cat.slug}`}
                className="px-4 py-2 bg-gray-100 hover:bg-blue-100 rounded-full text-sm transition-colors"
              >
                {cat.icon} {cat.name_zh} ({count})
              </a>
            )
          })}
        </nav>

        {/* Merchant Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {merchants.map((m) => (
            <a
              key={m.id}
              href={`/macao/${m.category?.slug || 'other'}/${m.slug}`}
              className="block border rounded-lg p-5 hover:shadow-lg hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-lg font-semibold">{m.name_zh}</h2>
                {m.tier === 'premium' && (
                  <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">精品</span>
                )}
              </div>
              {m.name_en && <p className="text-sm text-gray-500 mb-3">{m.name_en}</p>}
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                {m.category?.name_zh && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded">{m.category.icon} {m.category.name_zh}</span>
                )}
                {m.district && <span className="px-2 py-0.5 bg-gray-100 rounded">📍 {m.district}</span>}
                {m.google_rating && <span className="px-2 py-0.5 bg-gray-100 rounded">⭐ {m.google_rating}</span>}
                {m.price_range && <span className="px-2 py-0.5 bg-gray-100 rounded">{m.price_range}</span>}
              </div>
            </a>
          ))}
        </div>

        <footer className="text-center mt-12 pt-8 border-t text-sm text-gray-500">
          <p>由 <a href="https://inari-kira-isla.github.io/cloudpipe-landing/" className="text-blue-600">CloudPipe AI</a> 驅動</p>
          <p className="mt-1">© 2026 CloudPipe · CC BY 4.0</p>
        </footer>
      </main>
    </>
  )
}
