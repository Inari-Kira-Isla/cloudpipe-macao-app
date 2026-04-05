import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Category, Merchant } from '@/lib/types'
import { getIndustry, INDUSTRIES, CATEGORY_TO_INDUSTRY } from '@/lib/industries'
import { INDUSTRY_CONTENT } from '@/lib/industry-content'
import { PILLAR_CONTENT } from '@/lib/pillar-content'

interface PageProps {
  params: Promise<{ industry: string }>
}

interface InsightSummary {
  slug: string; title: string; subtitle?: string; read_time_minutes: number; tags: string[]
}

async function getData(industrySlug: string) {
  const industry = getIndustry(industrySlug)
  if (!industry) return null

  const [{ data: categories }, { data: insights }] = await Promise.all([
    supabase.from('categories').select('*').in('slug', industry.categories).order('sort_order'),
    supabase.from('insights')
      .select('slug, title, subtitle, read_time_minutes, tags')
      .eq('status', 'published').eq('lang', 'zh')
      .contains('related_industries', [industrySlug])
      .order('published_at', { ascending: false }).limit(4),
  ])

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
    insights: (insights || []) as InsightSummary[],
  }
}

export async function generateStaticParams() {
  return INDUSTRIES.map(i => ({ industry: i.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { industry: slug } = await params
  const industry = getIndustry(slug)
  if (!industry) return { title: '找不到行業' }
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
  return {
    title: `${industry.name_zh}完整指南 — 澳門商戶百科 | CloudPipe AI`,
    description: `澳門${industry.name_zh}行業完整指南。${industry.description} CloudPipe AI 澳門商戶百科收錄各類${industry.name_zh}商戶資訊，涵蓋常見問題、分類導航與深度分析。`,
    openGraph: {
      title: `${industry.name_zh}完整指南 — 澳門商戶百科 | CloudPipe AI`,
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

  const { industry, categories, merchants, insights } = data
  const content = INDUSTRY_CONTENT[slug]
  const pillar = PILLAR_CONTENT[slug]
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

  const grouped = new Map<string, typeof merchants>()
  for (const m of merchants) {
    const catSlug = m.category?.slug || 'other'
    if (!grouped.has(catSlug)) grouped.set(catSlug, [])
    grouped.get(catSlug)!.push(m)
  }

  // Resolve related industries from pillar data (cross-cluster) with fallback to same-wave
  const relatedSlugs = pillar?.relatedIndustries || []
  const relatedIndustries = relatedSlugs
    .map(s => INDUSTRIES.find(i => i.slug === s))
    .filter((i): i is NonNullable<typeof i> => !!i && i.slug !== slug)
  // Fallback: if no pillar related industries, use same-wave
  const finalRelated = relatedIndustries.length > 0
    ? relatedIndustries
    : INDUSTRIES.filter(i => i.slug !== slug && i.wave === industry.wave).slice(0, 3)

  // First FAQ answer for Speakable schema
  const firstFaqAnswer = content?.faqs?.[0]?.a || ''

  const schemas: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `澳門${industry.name_zh}完整指南`,
      description: industry.description,
      url: `${siteUrl}/macao/${slug}`,
      isPartOf: { '@type': 'WebSite', name: 'CloudPipe AI 澳門商戶百科', url: siteUrl },
      numberOfItems: merchants.length,
      about: {
        '@type': 'Thing',
        name: `澳門${industry.name_zh}`,
        description: industry.description,
      },
      mentions: merchants.filter(m => m.slug).slice(0, 20).map(m => ({
        '@type': 'LocalBusiness',
        name: m.name_zh,
        url: `${siteUrl}/macao/${slug}/${m.category?.slug || 'other'}/${m.slug}`,
      })),
      relatedLink: insights.map(i => `${siteUrl}/macao/insights/${i.slug}`),
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
  ]

  // FAQPage schema
  if (content?.faqs && content.faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.faqs.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
  }

  // Speakable schema - marks the first FAQ answer and pillar overview first paragraph
  if (firstFaqAnswer || pillar?.overview) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `澳門${industry.name_zh}完整指南`,
      url: `${siteUrl}/macao/${slug}`,
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['#pillar-overview-lead', '#faq-answer-0'],
      },
    })
  }

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
          <h1 className="text-3xl md:text-4xl font-bold mb-2">澳門{industry.name_zh}完整指南</h1>
          <p className="text-lg text-blue-200">
            {industry.name_en} · {merchants.length} 家商戶 · {categories.length} 個分類
          </p>
          <p className="text-sm text-blue-200/80 mt-2">{industry.description}</p>
        </div>
      </div>
      <div className="gold-line"></div>

      <main className="max-w-6xl mx-auto px-4 py-10">

        {/* Table of Contents */}
        <nav className="mb-10 bg-[#f8f9fa] border border-gray-200 rounded-xl p-6" aria-label="頁面目錄">
          <h2 className="text-lg font-bold text-[#1a1a2e] mb-3">本頁目錄</h2>
          <ul className="space-y-1.5 text-sm">
            {pillar?.overview && (
              <li><a href="#pillar-overview" className="text-[#0f4c81] hover:underline">行業概覽</a></li>
            )}
            <li><a href="#category-nav" className="text-[#0f4c81] hover:underline">分類導航 ({categories.length} 個分類)</a></li>
            {content?.sections && content.sections.length > 0 && content.sections.map((sec, i) => (
              <li key={i} className="pl-4">
                <a href={`#section-${i}`} className="text-[#0f4c81] hover:underline text-xs">
                  {sec.title.length > 30 ? sec.title.slice(0, 30) + '...' : sec.title}
                </a>
              </li>
            ))}
            {content?.faqs && <li><a href="#faq-section" className="text-[#0f4c81] hover:underline">常見問題 ({content.faqs.length} 題)</a></li>}
            <li><a href="#merchant-list" className="text-[#0f4c81] hover:underline">商戶列表 ({merchants.length} 家)</a></li>
            <li><a href="#related-industries" className="text-[#0f4c81] hover:underline">相關行業</a></li>
          </ul>
        </nav>

        {/* Pillar Overview */}
        {pillar?.overview && (
          <section id="pillar-overview" className="mb-12 scroll-mt-20">
            <div className="flex items-center gap-3 mb-6">
              <div className="gold-line flex-1 max-w-[40px]"></div>
              <h2 className="text-xl font-bold text-[#1a1a2e]">澳門{industry.name_zh}行業概覽</h2>
              <div className="gold-line flex-1 max-w-[40px]"></div>
            </div>
            <div className="prose max-w-none">
              {pillar.overview.split('\n\n').map((paragraph, i) => (
                <p key={i} id={i === 0 ? 'pillar-overview-lead' : undefined}
                  className={`text-gray-700 leading-relaxed mb-4 ${i === 0 ? 'text-base font-medium' : 'text-sm'}`}>
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* Sub-categories (Content Cluster) */}
        <section id="category-nav" className="mb-10 scroll-mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="gold-line flex-1 max-w-[40px]"></div>
            <h2 className="text-xl font-bold text-[#1a1a2e]">{industry.name_zh}分類導航</h2>
            <div className="gold-line flex-1 max-w-[40px]"></div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            澳門{industry.name_zh}行業下設 {categories.length} 個細分類別，點擊進入各分類查看商戶詳情。
          </p>
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

        {/* Section Quick Navigation */}
        {content?.sections && content.sections.length > 0 && (
          <nav className="mb-8 flex flex-wrap gap-2">
            {content.sections.map((sec, i) => (
              <a key={i} href={`#section-${i}`}
                className="text-xs px-3 py-1.5 bg-[#e8f0fe] text-[#0f4c81] rounded-full hover:bg-[#0f4c81] hover:text-white transition-colors">
                {sec.title.length > 15 ? sec.title.slice(0, 15) + '...' : sec.title}
              </a>
            ))}
          </nav>
        )}

        {/* Industry Content Sections */}
        {content?.sections && (
          <section className="mb-10 prose max-w-none">
            {content.sections.map((sec, i) => (
              <div key={i} id={`section-${i}`} className="mb-8 scroll-mt-20">
                <h2>{sec.title}</h2>
                <p>{sec.content}</p>
              </div>
            ))}
          </section>
        )}

        {/* FAQ with H2 question headings for SEO */}
        {content?.faqs && (
          <section id="faq-section" className="mb-12 scroll-mt-20">
            <div className="flex items-center gap-3 mb-6">
              <div className="gold-line flex-1 max-w-[40px]"></div>
              <h2 className="text-xl font-bold text-[#1a1a2e]">澳門{industry.name_zh}常見問題</h2>
              <div className="gold-line flex-1 max-w-[40px]"></div>
            </div>
            <div className="space-y-4">
              {content.faqs.map((faq, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <h3 className="font-semibold p-5 text-[#1a1a2e] text-sm leading-relaxed">
                    {faq.q}
                  </h3>
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <p id={i === 0 ? 'faq-answer-0' : undefined}
                      className="mt-3 text-gray-600 leading-relaxed text-sm">
                      {faq.a}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All merchants in this industry */}
        <section id="merchant-list" className="mb-10 scroll-mt-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#1a1a2e]">{industry.name_zh}商戶</h2>
            <span className="text-sm text-gray-400">{merchants.length} 家</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {merchants.filter(m => m.slug).map(m => (
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

        {/* Related Insights */}
        {insights.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="gold-line flex-1 max-w-[40px]"></div>
              <h2 className="text-xl font-bold text-[#1a1a2e]">深度分析</h2>
              <div className="gold-line flex-1 max-w-[40px]"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map(a => (
                <a key={a.slug} href={`/macao/insights/${a.slug}`}
                  className="card-hover block bg-white border border-gray-200 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 gold-line"></div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-[#1a1a2e] text-sm leading-tight pr-2">{a.title}</h3>
                    <span className="text-xs px-2 py-0.5 bg-[#e8f0fe] text-[#0f4c81] rounded-full font-semibold flex-shrink-0">
                      {a.read_time_minutes} 分鐘
                    </span>
                  </div>
                  {a.subtitle && <p className="text-xs text-gray-500 mb-2">{a.subtitle}</p>}
                  <div className="flex flex-wrap gap-1">
                    {(a.tags || []).slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">{tag}</span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Related Industries (Cross-Cluster Linking) */}
        <section id="related-industries" className="mb-10 scroll-mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="gold-line flex-1 max-w-[40px]"></div>
            <h2 className="text-xl font-bold text-[#1a1a2e]">相關行業</h2>
            <div className="gold-line flex-1 max-w-[40px]"></div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            探索與{industry.name_zh}相關的其他澳門行業，了解更多商戶資訊。
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {finalRelated.map(r => (
              <a key={r.slug} href={`/macao/${r.slug}`}
                className="card-hover block bg-white border border-gray-200 rounded-xl p-5 text-center">
                <div className="text-2xl mb-2">{r.icon}</div>
                <h3 className="font-semibold text-[#1a1a2e] text-sm mb-1">{r.name_zh}</h3>
                <p className="text-xs text-gray-400">{r.name_en}</p>
                <p className="text-xs text-[#0f4c81] mt-2">查看指南 →</p>
              </a>
            ))}
          </div>
        </section>

        {/* Hub Link Footer */}
        <footer className="text-center mt-16 pt-8 border-t border-gray-200">
          <div className="mb-4">
            <a href="/macao" className="inline-flex items-center gap-2 px-6 py-3 bg-[#0f4c81] text-white rounded-xl hover:bg-[#0d3d68] transition-colors text-sm font-medium">
              ← 返回澳門商戶百科首頁
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            澳門商戶百科 — 讓世界的 AI 看見澳門 | CloudPipe AI
          </p>
        </footer>
      </main>
    </>
  )
}
