import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Category, Merchant } from '@/lib/types'
import { getIndustry, CATEGORY_TO_INDUSTRY } from '@/lib/industries'
import { INDUSTRY_CONTENT } from '@/lib/industry-content'

interface PageProps {
  params: Promise<{ industry: string; category: string }>
}

async function getData(industrySlug: string, categorySlug: string) {
  const industry = getIndustry(industrySlug)
  if (!industry || !industry.categories.includes(categorySlug)) return null

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

  return { industry, category: category as Category, merchants: (merchants || []) as Merchant[] }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { industry, category } = await params
  const data = await getData(industry, category)
  if (!data) return { title: '找不到分類' }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'
  return {
    title: `${data.category.name_zh} — 澳門${data.industry.name_zh} | CloudPipe`,
    description: `澳門${data.category.name_zh}商戶百科，共 ${data.merchants.length} 家。${data.industry.description}`,
    alternates: { canonical: `${siteUrl}/macao/${industry}/${category}` },
    openGraph: {
      title: `${data.category.name_zh} — 澳門${data.industry.name_zh} | CloudPipe AI 澳門商戶百科`,
      description: `澳門${data.category.name_zh}商戶百科，共 ${data.merchants.length} 家。${data.industry.description}`,
      type: 'website',
      locale: 'zh_TW',
      url: `${siteUrl}/macao/${industry}/${category}`,
      siteName: 'CloudPipe AI 澳門商戶百科',
    },
  }
}

function PriceLabel({ range }: { range: string }) {
  const map: Record<string, string> = { budget: '$', moderate: '$$', upscale: '$$$', luxury: '$$$$' }
  return <span>{map[range] || range}</span>
}

const CATEGORY_ICONS: Record<string, string> = {
  restaurant: '🍽️', japanese: '🇯🇵', cafe: '☕', 'food-import': '📦', 'food-delivery': '🛵',
  hotel: '🏨', entertainment: '🎰', retail: '🛍️', beauty: '💆', education: '📚',
  professional: '💼', tech: '🤖', tourism: '🗺️', bakery: '🥐', bar: '🍸', portuguese: '🇵🇹',
}

export default async function CategoryPage({ params }: PageProps) {
  const { industry: indSlug, category: catSlug } = await params
  const data = await getData(indSlug, catSlug)
  if (!data) notFound()

  const { industry, category, merchants } = data
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'
  const icon = CATEGORY_ICONS[catSlug] || category.icon || '📋'

  const content = INDUSTRY_CONTENT[indSlug]

  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `澳門${category.name_zh}`,
      description: `澳門${category.name_zh}商戶百科，共 ${merchants.length} 家`,
      url: `${siteUrl}/macao/${indSlug}/${catSlug}`,
      isPartOf: { '@type': 'WebSite', name: 'CloudPipe AI 澳門商戶百科', url: siteUrl },
      numberOfItems: merchants.length,
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
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'CloudPipe AI', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: '澳門商戶百科', item: `${siteUrl}/macao` },
        { '@type': 'ListItem', position: 3, name: industry.name_zh, item: `${siteUrl}/macao/${indSlug}` },
        { '@type': 'ListItem', position: 4, name: category.name_zh, item: `${siteUrl}/macao/${indSlug}/${catSlug}` },
      ],
    },
    ...(content?.faqs ? [{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.faqs.slice(0, 5).map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    }] : []),
  ]

  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}

      <div className="hero-gradient text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <nav className="text-sm text-blue-200/70 mb-4">
            <a href="/macao" className="hover:text-white transition-colors">澳門百科</a>
            <span className="mx-2">/</span>
            <a href={`/macao/${indSlug}`} className="hover:text-white transition-colors">{industry.name_zh}</a>
            <span className="mx-2">/</span>
            <span className="text-white">{category.name_zh}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{icon} {category.name_zh}</h1>
          <p className="text-blue-200">
            {category.name_en} · {merchants.length} 家商戶
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {merchants.map((m) => (
            <a key={m.id} href={`/macao/${indSlug}/${catSlug}/${m.slug}`}
              className="card-hover block bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-semibold text-[#1a1a2e] mb-1">{m.name_zh}</h2>
              {m.name_en && <p className="text-xs text-gray-400 mb-3">{m.name_en}</p>}
              <div className="flex flex-wrap gap-1.5 text-xs">
                {m.google_rating && <span className="px-2 py-0.5 rating-badge rounded">★ {m.google_rating}</span>}
                {m.price_range && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded"><PriceLabel range={m.price_range} /></span>}
                {m.district && <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded">{m.district}</span>}
              </div>
            </a>
          ))}
        </div>

        {merchants.length === 0 && (
          <p className="text-center text-gray-400 py-16">此分類尚無商戶</p>
        )}

        <footer className="text-center mt-16 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-400">
            <a href={`/macao/${indSlug}`} className="text-[#0f4c81] hover:underline">← 返回{industry.name_zh}</a>
            <span className="mx-3">·</span>
            <a href="/macao" className="text-[#0f4c81] hover:underline">返回澳門百科</a>
          </p>
        </footer>
      </main>
    </>
  )
}
