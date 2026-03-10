import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { InsightArticle } from '@/lib/types'
import ComparisonTable from '../ComparisonTable'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

async function getInsight(slug: string) {
  const { data } = await supabase
    .from('insights')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()
  return data as InsightArticle | null
}

interface RelatedMerchant {
  slug: string
  name_zh: string
  name_en?: string
  district?: string
  google_rating?: number
  category: { slug: string; name_zh: string; icon?: string } | null
}

async function getRelatedMerchants(slugs: string[]): Promise<RelatedMerchant[]> {
  if (!slugs?.length) return []
  const { data } = await supabase
    .from('merchants')
    .select('slug, name_zh, name_en, category:categories(slug, name_zh, icon), district, google_rating')
    .in('slug', slugs)
    .eq('status', 'live')
  if (!data) return []
  // Supabase join may return category as array; normalize to single object
  return data.map((d: Record<string, unknown>) => ({
    ...d,
    category: Array.isArray(d.category) ? d.category[0] || null : d.category,
  })) as RelatedMerchant[]
}

export async function generateStaticParams() {
  const { data } = await supabase
    .from('insights')
    .select('slug')
    .eq('status', 'published')
  return (data || []).map(d => ({ slug: d.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getInsight(slug)
  if (!article) return { title: '找不到文章' }

  const title = article.og_title || `${article.title} — 澳門商戶百科 | CloudPipe AI`
  const description = article.og_description || article.description

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      locale: 'zh_TW',
      publishedTime: article.published_at || undefined,
      images: article.og_image ? [article.og_image] : undefined,
    },
    alternates: { canonical: `${siteUrl}/macao/insights/${slug}` },
    other: { 'llms-txt': '/macao/llms-txt' },
  }
}

/* ── CATEGORY_TO_INDUSTRY mapping for merchant links ── */
const CATEGORY_TO_INDUSTRY: Record<string, string> = {
  restaurant: 'dining', japanese: 'dining', portuguese: 'dining',
  chinese: 'dining', western: 'dining', cafe: 'dining', bakery: 'dining',
  'food-import': 'food-trade', 'food-delivery': 'food-trade',
  hotel: 'hotels', resort: 'hotels',
  tourism: 'attractions', museum: 'attractions',
  retail: 'shopping', 'shopping-mall': 'shopping',
  beauty: 'wellness', gym: 'wellness',
  bar: 'nightlife', entertainment: 'gaming',
}

export default async function InsightDetailPage({ params }: PageProps) {
  const { slug } = await params
  const article = await getInsight(slug)
  if (!article) notFound()

  const merchants = await getRelatedMerchants(article.related_merchant_slugs || [])

  /* ── Schema.org: Article + FAQPage + BreadcrumbList ── */
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.published_at || article.created_at,
    dateModified: article.updated_at,
    wordCount: article.word_count,
    author: { '@type': 'Organization', name: 'CloudPipe AI', url: 'https://cloudpipe-landing.vercel.app' },
    publisher: { '@type': 'Organization', name: 'CloudPipe AI', url: 'https://cloudpipe-landing.vercel.app' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl}/macao/insights/${slug}` },
    articleSection: '深度分析',
    inLanguage: 'zh-Hant',
    ...(article.og_image && { image: article.og_image }),
  }

  const faqSchema = article.faqs?.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  } : null

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'CloudPipe AI', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: '澳門商戶百科', item: `${siteUrl}/macao` },
      { '@type': 'ListItem', position: 3, name: '深度分析', item: `${siteUrl}/macao/insights` },
      { '@type': 'ListItem', position: 4, name: article.title, item: `${siteUrl}/macao/insights/${slug}` },
    ],
  }

  const sections = article.sections || []

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* ═══ Hero ═══ */}
      <div className="hero-gradient text-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <nav className="text-sm text-blue-200/70 mb-4">
            <a href="/macao" className="hover:text-white transition-colors">澳門百科</a>
            <span className="mx-2">/</span>
            <a href="/macao/insights" className="hover:text-white transition-colors">深度分析</a>
            <span className="mx-2">/</span>
            <span className="text-white">{article.title}</span>
          </nav>

          <h1 className="text-2xl md:text-4xl font-bold mb-3 leading-tight">{article.title}</h1>
          {article.subtitle && <p className="text-base md:text-lg text-blue-100 mb-4">{article.subtitle}</p>}

          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-xs px-3 py-1.5 bg-white/15 backdrop-blur rounded-full border border-white/20">
              {article.word_count.toLocaleString()} 字
            </span>
            <span className="text-xs px-3 py-1.5 bg-white/15 backdrop-blur rounded-full border border-white/20">
              閱讀 {article.read_time_minutes} 分鐘
            </span>
            {article.published_at && (
              <span className="text-xs px-3 py-1.5 bg-white/15 backdrop-blur rounded-full border border-white/20">
                {new Date(article.published_at).toLocaleDateString('zh-TW')}
              </span>
            )}
            {(article.tags || []).slice(0, 3).map(tag => (
              <span key={tag} className="text-xs px-3 py-1.5 bg-amber-400/90 text-white rounded-full font-semibold">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="gold-line"></div>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* ═══ Table of Contents ═══ */}
        {sections.length > 0 && (
          <nav className="bg-white border border-gray-200 rounded-xl p-6 mb-10 shadow-sm">
            <h2 className="text-lg font-bold text-[#0f4c81] mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              目錄
            </h2>
            <ol className="space-y-2 text-sm">
              {sections.map((sec, i) => (
                <li key={sec.id}>
                  <a href={`#${sec.id}`} className="text-[#0f4c81] hover:underline">
                    {i + 1}. {sec.title}
                  </a>
                </li>
              ))}
              {(article.faqs?.length || 0) > 0 && (
                <li>
                  <a href="#faq" className="text-[#0f4c81] hover:underline">
                    {sections.length + 1}. 常見問題 FAQ
                  </a>
                </li>
              )}
            </ol>
          </nav>
        )}

        {/* ═══ Article Body ═══ */}
        <article className="prose max-w-none mb-10">
          <div dangerouslySetInnerHTML={{ __html: article.body_html }} />
        </article>

        {/* ═══ Comparison Table ═══ */}
        {article.table_data && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-[#0f4c81] mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              綜合比較表
            </h2>
            <ComparisonTable data={article.table_data} />
          </section>
        )}

        {/* ═══ FAQ ═══ */}
        {article.faqs?.length > 0 && (
          <section id="faq" className="mb-10">
            <h2 className="text-xl font-bold text-[#0f4c81] mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              常見問題
            </h2>
            <div className="space-y-3">
              {article.faqs.map((faq, i) => (
                <details key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden group">
                  <summary className="font-semibold cursor-pointer p-5 flex justify-between items-center hover:bg-gray-50 transition-colors text-[#1a1a2e]">
                    <span className="pr-4">{faq.question}</span>
                    <span className="text-[#0f4c81] text-sm group-open:rotate-180 transition-transform flex-shrink-0">▼</span>
                  </summary>
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <p className="mt-4 text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* ═══ Authority Sources ═══ */}
        {(article.authority_sources?.length || 0) > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-[#0f4c81] mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              資料來源
            </h2>
            <ul className="space-y-2 text-sm text-gray-600">
              {article.authority_sources!.map((src, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#0f4c81] mt-0.5 flex-shrink-0">•</span>
                  <span>
                    <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-[#0f4c81] hover:underline font-medium">
                      {src.name}
                    </a>
                    {src.stat && <span className="text-gray-400 ml-1">— {src.stat}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ═══ Related Merchants ═══ */}
        {merchants.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-[#0f4c81] mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              相關商戶
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {merchants.map(m => {
                const indSlug = CATEGORY_TO_INDUSTRY[m.category?.slug || ''] || 'dining'
                return (
                  <a
                    key={m.slug}
                    href={`/macao/${indSlug}/${m.category?.slug || 'other'}/${m.slug}`}
                    className="card-hover block bg-white border border-gray-200 rounded-xl p-5"
                  >
                    <h3 className="font-semibold text-[#1a1a2e] mb-1">{m.name_zh}</h3>
                    {m.name_en && <p className="text-xs text-gray-400 mb-2">{m.name_en}</p>}
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {m.category?.name_zh && (
                        <span className="px-2 py-0.5 bg-[#e8f0fe] text-[#0f4c81] rounded font-medium">
                          {m.category.icon || '📋'} {m.category.name_zh}
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
                )
              })}
            </div>
          </section>
        )}

        {/* ═══ Footer ═══ */}
        <footer className="border-t border-gray-200 pt-8 mt-10 text-sm text-gray-400">
          <div className="flex flex-col md:flex-row justify-between gap-2">
            <div>
              <p>由 <a href="https://cloudpipe-landing.vercel.app" className="text-[#0f4c81] hover:underline">CloudPipe AI</a> 自動生成並人工審核</p>
              <p className="mt-1">最後更新：{new Date(article.updated_at).toLocaleDateString('zh-TW')}</p>
            </div>
            <div className="text-right">
              <a href="/macao/insights" className="text-[#0f4c81] hover:underline">← 返回深度分析</a>
              <p className="mt-1">© 2026 CloudPipe AI · CC BY 4.0</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}
