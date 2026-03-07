import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Category, Merchant } from '@/lib/types'

interface PageProps {
  params: Promise<{ category: string }>
}

async function getData(categorySlug: string) {
  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', categorySlug)
    .single()

  if (!category) return null

  const { data: merchants } = await supabase
    .from('merchants')
    .select('*')
    .eq('category_id', category.id)
    .eq('status', 'live')
    .order('tier')

  return { category: category as Category, merchants: (merchants || []) as Merchant[] }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: slug } = await params
  const data = await getData(slug)
  if (!data) return { title: '找不到分類' }
  return {
    title: `${data.category.name_zh} — 澳門百科 | CloudPipe`,
    description: `澳門${data.category.name_zh}商戶百科，共 ${data.merchants.length} 家`,
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { category: slug } = await params
  const data = await getData(slug)
  if (!data) notFound()

  const { category, merchants } = data

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-6">
        <a href="/macao" className="hover:text-blue-600">澳門百科</a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{category.name_zh}</span>
      </nav>

      <h1 className="text-3xl font-bold mb-2">{category.icon} {category.name_zh}</h1>
      <p className="text-gray-500 mb-8">{category.name_en} · {merchants.length} 家商戶</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {merchants.map((m) => (
          <a
            key={m.id}
            href={`/macao/${slug}/${m.slug}`}
            className="block border rounded-lg p-5 hover:shadow-lg hover:border-blue-300 transition-all"
          >
            <h2 className="text-lg font-semibold">{m.name_zh}</h2>
            {m.name_en && <p className="text-sm text-gray-500">{m.name_en}</p>}
            <div className="flex gap-2 mt-3 text-xs text-gray-500">
              {m.district && <span className="px-2 py-0.5 bg-gray-100 rounded">📍 {m.district}</span>}
              {m.google_rating && <span className="px-2 py-0.5 bg-gray-100 rounded">⭐ {m.google_rating}</span>}
            </div>
          </a>
        ))}
      </div>

      {merchants.length === 0 && (
        <p className="text-center text-gray-400 py-12">此分類尚無商戶</p>
      )}
    </main>
  )
}
