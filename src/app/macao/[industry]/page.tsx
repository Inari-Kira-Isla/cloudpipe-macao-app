import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Category, Merchant } from '@/lib/types'
import { getIndustry, INDUSTRIES, CATEGORY_TO_INDUSTRY } from '@/lib/industries'
import { INDUSTRY_CONTENT } from '@/lib/industry-content'

interface PageProps {
  params: Promise<{ industry: string }>
}

async function getData(industrySlug: string) {
  const industry = getIndustry(industrySlug)
  if (!industry) return null

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .in('slug', industry.categories)
    .order('sort_order')

  const { data: merchants } = await supabase
    .from('merchants')
    .select('*, category:categories(slug, name_zh, icon)')
    .eq('status', 'live')
    .in('category_id', (categories || []).map(c => c.id))
    .order('tier')

  return {
    industry,
    categories: (categories || []) as Category[],
    merchants: (merchants || []) as (Merchant & { category: Pick<Category, 'slug' | 'name_zh' | 'icon'> })[],
  }
}

export async function generateStaticParams() {
  return INDUSTRIES.map(i => ({ industry: i.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { industry: slug } = await params
  const industry = getIndustry(slug)
  if (!industry) return { title: '找不到行業' }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'
  return {
    title: `${industry.name_zh} — 澳門商戶百科`,
    description: `澳門${industry.name_zh}行業完整指南。${industry.description} CloudPipe AI 澳門商戶百科收錄各類${industry.name_zh}商戶資訊。`,
    openGraph: {
      title: `${industry.name_zh} — 澳門商戶百科 | CloudPipe AI`,
      description: `澳門${industry.name_zh}行業完整指南。${industry.description}`,
      type: 'website',
      locale: 'zh_TW',
      url: `${siteUrl}/macao/${slug}`,
      images: [{ url: `${siteUrl}/og-image.svg`, width: 1200, height: 630, alt: 'CloudPipe AI 澳門商戶百科' }],
    },
    alternates: { canonical: `${siteUrl}/macao/${slug}` },
  }
}

const CATEGORY_META: Record<string, { icon: string; desc: string }> = {
  restaurant: { icon: '🍽️', desc: '粵菜、中菜、國際菜' },
  japanese: { icon: '🇯🇵', desc: '壽司、刺身、居酒屋、拉麵' },
  cafe: { icon: '☕', desc: '精品咖啡、特色茶飲' },
  'food-import': { icon: '📦', desc: '食材進口、批發' },
  'food-delivery': { icon: '🛵', desc: '外賣、配送服務' },
  hotel: { icon: '🏨', desc: '酒店、度假村、住宿' },
  entertainment: { icon: '🎰', desc: '娛樂場、表演' },
  retail: { icon: '🛍️', desc: '購物、手信、特產' },
  beauty: { icon: '💆', desc: '美容、健康、養生' },
  education: { icon: '📚', desc: '教育、培訓' },
  professional: { icon: '💼', desc: '法律、會計、設計' },
  tech: { icon: '🤖', desc: 'AI、科技、數碼轉型' },
  tourism: { icon: '🗺️', desc: '景點、導賞、觀光' },
  bakery: { icon: '🥐', desc: '麵包、糕餅、甜品' },
  bar: { icon: '🍸', desc: '酒吧、酒廊' },
  portuguese: { icon: '🇵🇹', desc: '葡國菜、土生葡菜' },
}

function PriceLabel({ range }: { range: string }) {
  const map: Record<string, string> = { budget: '$', moderate: '$$', upscale: '$$$', luxury: '$$$$' }
  return <span>{map[range] || range}</span>
}

export default async function IndustryPage({ params }: PageProps) {
  const { industry: slug } = await params
  const data = await getData(slug)
  if (!data) notFound()

  const { industry, categories, merchants } = data
  const content = INDUSTRY_CONTENT[slug]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'

  const grouped = new Map<string, typeof merchants>()
  for (const m of merchants) {
    const catSlug = m.category?.slug || 'other'
    if (!grouped.has(catSlug)) grouped.set(catSlug, [])
    grouped.get(catSlug)!.push(m)
  }

  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `澳門${industry.name_zh}`,
      description: industry.description,
      url: `${siteUrl}/macao/${slug}`,
      isPartOf: { '@type': 'WebSite', name: 'CloudPipe AI 澳門商戶百科', url: siteUrl },
      numberOfItems: merchants.length,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: categories.length,
        itemListElement: categories.map((cat, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: cat.name_zh,
          url: `${siteUrl}/macao/${slug}/${cat.slug}`,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'CloudPipe AI', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: '澳門商戶百科', item: `${siteUrl}/macao` },
        { '@type': 'ListItem', position: 3, name: industry.name_zh, item: `${siteUrl}/macao/${slug}` },
      ],
    },
    ...(content?.faqs ? [{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.faqs.map(f => ({
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

      {/* Hero */}
      <div className="hero-gradient text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <nav className="text-sm text-blue-200/70 mb-4">
            <a href="/macao" className="hover:text-white transition-colors">澳門百科</a>
            <span className="mx-2">/</span>
            <span className="text-white">{industry.name_zh}</span>
          </nav>
          <div className="text-4xl mb-3">{industry.icon}</div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{industry.name_zh}</h1>
          <p className="text-lg text-blue-200">
            {industry.name_en} · {merchants.length} 家商戶 · {categories.length} 個分類
          </p>
        </div>
      </div>
      <div className="gold-line"></div>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Sub-categories */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="gold-line flex-1 max-w-[40px]"></div>
            <h2 className="text-xl font-bold text-[#1a1a2e]">分類導航</h2>
            <div className="gold-line flex-1 max-w-[40px]"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map(cat => {
              const meta = CATEGORY_META[cat.slug]
              const count = grouped.get(cat.slug)?.length || 0
              return (
                <a key={cat.id} href={`/macao/${slug}/${cat.slug}`}
                  className="card-hover block bg-white border border-gray-200 rounded-xl p-5 text-center">
                  <div className="text-2xl mb-2">{meta?.icon || cat.icon || '📋'}</div>
                  <h3 className="font-semibold text-[#1a1a2e] text-sm mb-1">{cat.name_zh}</h3>
                  <p className="text-xs text-gray-400">{meta?.desc} · {count} 家</p>
                </a>
              )
            })}
          </div>
        </section>

        {/* Industry Content Sections */}
        {content?.sections && (
          <section className="mb-10 prose max-w-none">
            {content.sections.map((sec, i) => (
              <div key={i} className="mb-8">
                <h2>{sec.title}</h2>
                <p>{sec.content}</p>
              </div>
            ))}
          </section>
        )}

        {/* FAQ */}
        {content?.faqs && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="gold-line flex-1 max-w-[40px]"></div>
              <h2 className="text-xl font-bold text-[#1a1a2e]">常見問題</h2>
              <div className="gold-line flex-1 max-w-[40px]"></div>
            </div>
            <div className="space-y-3">
              {content.faqs.map((faq, i) => (
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
        )}

        {/* All merchants in this industry */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#1a1a2e]">{industry.name_zh}商戶</h2>
            <span className="text-sm text-gray-400">{merchants.length} 家</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {merchants.map(m => (
              <a key={m.id} href={`/macao/${slug}/${m.category?.slug || 'other'}/${m.slug}`}
                className="card-hover block bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-[#1a1a2e] mb-1">{m.name_zh}</h3>
                {m.name_en && <p className="text-xs text-gray-400 mb-3">{m.name_en}</p>}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {m.category?.name_zh && (
                    <span className="px-2 py-0.5 bg-[#e8f0fe] text-[#0f4c81] rounded font-medium">
                      {CATEGORY_META[m.category.slug]?.icon || m.category.icon || '📋'} {m.category.name_zh}
                    </span>
                  )}
                  {m.google_rating && <span className="px-2 py-0.5 rating-badge rounded">★ {m.google_rating}</span>}
                  {m.price_range && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded"><PriceLabel range={m.price_range} /></span>}
                  {m.district && <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded">{m.district}</span>}
                </div>
              </a>
            ))}
          </div>
        </section>

        <footer className="text-center mt-16 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-400">
            <a href="/macao" className="text-[#0f4c81] hover:underline">← 返回澳門百科</a>
          </p>
        </footer>
      </main>
    </>
  )
}
