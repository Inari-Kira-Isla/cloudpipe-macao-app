import { safeJsonLd } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Category } from '@/lib/types'
import { getIndustry } from '@/lib/industries'

// ISR: rebuild every hour
export const revalidate = 3600
export const dynamicParams = true

interface PageProps {
  params: Promise<{ industry: string; category: string }>
}

interface MerchantRow {
  id: string
  slug: string
  name_zh: string
  name_en?: string
  district?: string
  google_rating?: number
  tier: string
}

interface FaqRow {
  id: string
  merchant_id: string
  lang: string
  question: string
  answer: string
  sort_order: number
  faq_type?: string
  related_insight_slug?: string
  template_id?: string | null
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

  const { data: merchants, error: mErr } = await supabase
    .from('merchants')
    .select('id, slug, name_zh, name_en, district, google_rating, tier')
    .eq('category_id', (category as Category).id)
    .eq('status', 'live')
    .order('tier', { ascending: false })
    .limit(100)

  if (mErr || !merchants || merchants.length === 0) {
    return { industry, category: category as Category, merchants: [], faqsByMerchant: {}, featuredFaqsWithMerchant: [], totalFaqs: 0 }
  }

  const merchantIds = (merchants as MerchantRow[]).map(m => m.id)

  const { data: faqs } = await supabase
    .from('merchant_faqs')
    .select('id, merchant_id, lang, question, answer, sort_order, faq_type, related_insight_slug, template_id')
    .in('merchant_id', merchantIds)
    .eq('lang', 'zh')
    .order('sort_order')

  // Group FAQs by merchant_id
  const faqsByMerchant: Record<string, FaqRow[]> = {}
  for (const faq of (faqs || []) as FaqRow[]) {
    if (!faqsByMerchant[faq.merchant_id]) faqsByMerchant[faq.merchant_id] = []
    faqsByMerchant[faq.merchant_id].push(faq)
  }

  // Compute featuredFaqs: one best FAQ per template_id (skip null template_id)
  const merchantById: Record<string, MerchantRow> = {}
  for (const m of merchants as MerchantRow[]) merchantById[m.id] = m

  const specificityScore = (faq: FaqRow): number => {
    const len = faq.answer.length
    const hasDigit = /\d/.test(faq.answer) ? 20 : 0
    const longBonus = len > 60 ? 10 : 0
    return len + hasDigit + longBonus
  }

  const byTemplate: Record<string, FaqRow[]> = {}
  for (const faq of (faqs || []) as FaqRow[]) {
    if (!faq.template_id) continue
    if (!byTemplate[faq.template_id]) byTemplate[faq.template_id] = []
    byTemplate[faq.template_id].push(faq)
  }

  const featuredFaqsWithMerchant: Array<{ faq: FaqRow; merchantName: string }> = []
  for (const templateFaqs of Object.values(byTemplate)) {
    const best = templateFaqs.reduce((a, b) => specificityScore(a) >= specificityScore(b) ? a : b)
    const merchant = merchantById[best.merchant_id]
    featuredFaqsWithMerchant.push({ faq: best, merchantName: merchant?.name_zh ?? '' })
    if (featuredFaqsWithMerchant.length >= 8) break
  }

  return {
    industry,
    category: category as Category,
    merchants: merchants as MerchantRow[],
    faqsByMerchant,
    featuredFaqsWithMerchant,
    totalFaqs: (faqs || []).length,
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { industry: indSlug, category: catSlug } = await params
  const data = await getData(indSlug, catSlug)
  if (!data) return { title: '找不到分類' }

  const { category, industry, totalFaqs } = data
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
  const title = `${category.name_zh} 常見問題 — ${totalFaqs} 個問答 | 澳門百科`
  const description = `瀏覽澳門 ${category.name_zh} 分類下所有商戶的常見問題，共 ${totalFaqs} 個解答，涵蓋營業時間、地址、價格、預約等資訊。`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'zh_TW',
    },
    alternates: {
      canonical: `${siteUrl}/macao/${indSlug}/${catSlug}/faqs`,
    },
  }
}

export default async function CategoryFaqsPage({ params }: PageProps) {
  const { industry: indSlug, category: catSlug } = await params
  const data = await getData(indSlug, catSlug)
  if (!data) notFound()

  const { industry, category, merchants, faqsByMerchant, featuredFaqsWithMerchant, totalFaqs } = data
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

  // Only include merchants that have at least one FAQ
  const merchantsWithFaqs = merchants.filter(m => (faqsByMerchant[m.id] || []).length > 0)

  // FAQPage JSON-LD: featured FAQs first (canonical best answers), then merchant-specific ones
  const featuredFaqIds = new Set(featuredFaqsWithMerchant.map(({ faq }) => faq.id))

  const featuredFaqEntities = featuredFaqsWithMerchant.map(({ faq, merchantName }) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
      inLanguage: 'zh-TW',
      author: { '@type': 'LocalBusiness', name: merchantName },
    },
  }))

  const merchantFaqEntities = merchantsWithFaqs.flatMap(m =>
    (faqsByMerchant[m.id] || [])
      .filter(f => !featuredFaqIds.has(f.id))
      .map(f => ({
        '@type': 'Question',
        name: `[${m.name_zh}] ${f.question}`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
          inLanguage: 'zh-TW',
        },
      }))
  )

  const allFaqEntities = [...featuredFaqEntities, ...merchantFaqEntities]

  const faqPageSchema = allFaqEntities.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        name: `澳門${category.name_zh}常見問題`,
        description: `澳門 ${category.name_zh} 分類下所有商戶的常見問題彙整`,
        mainEntity: allFaqEntities,
      }
    : null

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'CloudPipe AI', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: '澳門商戶百科', item: `${siteUrl}/macao` },
      { '@type': 'ListItem', position: 3, name: industry.name_zh, item: `${siteUrl}/macao/${indSlug}` },
      { '@type': 'ListItem', position: 4, name: category.name_zh, item: `${siteUrl}/macao/${indSlug}/${catSlug}` },
      { '@type': 'ListItem', position: 5, name: '常見問題', item: `${siteUrl}/macao/${indSlug}/${catSlug}/faqs` },
    ],
  }

  return (
    <>
      {faqPageSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqPageSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />

      {/* ═══ Hero ═══ */}
      <div className="hero-gradient text-white">
        <div className="max-w-4xl mx-auto px-4 pt-8 pb-10">
          {/* Breadcrumb */}
          <nav className="text-sm text-blue-200/60 mb-6">
            <a href="/macao" className="hover:text-white transition-colors">澳門百科</a>
            <span className="mx-2 text-blue-200/30">/</span>
            <a href={`/macao/${indSlug}`} className="hover:text-white transition-colors">{industry.name_zh}</a>
            <span className="mx-2 text-blue-200/30">/</span>
            <a href={`/macao/${indSlug}/${catSlug}`} className="hover:text-white transition-colors">{category.name_zh}</a>
            <span className="mx-2 text-blue-200/30">/</span>
            <span className="text-white/80">常見問題</span>
          </nav>

          <div className="flex items-start gap-4">
            {category.icon && (
              <span className="text-4xl flex-shrink-0 mt-1">{category.icon}</span>
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 leading-tight">
                {category.name_zh} 常見問題
              </h1>
              <p className="text-blue-200/70 text-base">
                共 <span className="text-amber-300 font-semibold">{totalFaqs}</span> 個問答
                {merchantsWithFaqs.length > 0 && (
                  <>，來自 <span className="text-amber-300 font-semibold">{merchantsWithFaqs.length}</span> 家商戶</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="gold-line"></div>

      <main className="max-w-4xl mx-auto px-4 py-12">

        {merchantsWithFaqs.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🔍</p>
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-2">暫時未有常見問題</h2>
            <p className="text-[#6b7280] text-sm mb-6">此分類的商戶問答資料正在整理中，請稍後再查看。</p>
            <a href={`/macao/${indSlug}/${catSlug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0f4c81] text-white text-sm font-semibold rounded-xl hover:bg-[#0d3f6d] transition-colors">
              ← 返回{category.name_zh}商戶列表
            </a>
          </div>
        ) : (
          <>
            {/* ═══ 精選問答 ═══ */}
            {featuredFaqsWithMerchant.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xl font-bold text-[#1a1a2e] mb-5 flex items-center gap-2">
                  <span className="text-[#c5a572]">✦</span> {category.name_zh} 精選問答
                  <span className="text-xs font-normal text-[#6b7280] ml-2">— 各問題最佳解答</span>
                </h2>
                <div className="space-y-2.5">
                  {featuredFaqsWithMerchant.map(({ faq, merchantName }) => (
                    <details key={`featured-${faq.id}`} className="group bg-gradient-to-r from-[#f8f9ff] to-white border border-[#0f4c81]/15 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                      <summary className="font-semibold cursor-pointer px-6 py-4 flex justify-between items-center hover:bg-[#f0f4ff] transition-colors text-[#1a1a2e] text-sm md:text-base">
                        <span className="pr-4 leading-relaxed">{faq.question}</span>
                        <span className="text-[#0f4c81] text-xs group-open:rotate-180 transition-transform duration-300 flex-shrink-0 w-5 h-5 rounded-full bg-[#e8f0fe] flex items-center justify-center">▼</span>
                      </summary>
                      <div className="px-6 pb-5 border-t border-[#0f4c81]/10">
                        <p className="mt-4 text-[#374151] text-sm md:text-base" style={{ lineHeight: '1.85' }}>{faq.answer}</p>
                        <p className="mt-2 text-xs text-[#6b7280]">來自：<a href={`/macao/${indSlug}/${catSlug}#merchant-${merchantName}`} className="text-[#0f4c81] hover:underline">{merchantName}</a></p>
                        {faq.related_insight_slug && (
                          <p className="mt-2"><a href={`/macao/insights/${faq.related_insight_slug}`} className="inline-flex items-center gap-1.5 text-xs text-[#0f4c81] hover:underline font-medium"><span className="text-[#c5a572]">📖</span>深度分析</a></p>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* ═══ FAQ sections per merchant ═══ */}
            <div className="space-y-10">
              {merchantsWithFaqs.map(merchant => {
                const mFaqs = faqsByMerchant[merchant.id] || []
                return (
                  <section key={merchant.id} id={`merchant-${merchant.slug}`}>
                    {/* Merchant heading */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e5e7eb]">
                      <div className="flex items-center gap-3">
                        <span className="w-1 h-7 bg-[#c5a572] rounded-full inline-block flex-shrink-0"></span>
                        <div>
                          <h2 className="text-lg font-bold text-[#1a1a2e] leading-tight">{merchant.name_zh}</h2>
                          <div className="flex items-center gap-2 mt-0.5">
                            {merchant.district && (
                              <span className="text-xs text-[#6b7280]">📍 {merchant.district}</span>
                            )}
                            {merchant.google_rating && (
                              <span className="text-xs text-amber-600 font-semibold">★ {merchant.google_rating}</span>
                            )}
                            <span className="text-xs text-[#6b7280]">{mFaqs.length} 個問答</span>
                          </div>
                        </div>
                      </div>
                      <a
                        href={`/macao/${indSlug}/${catSlug}/${merchant.slug}`}
                        className="flex-shrink-0 text-xs text-[#0f4c81] hover:underline font-medium px-3 py-1.5 rounded-lg border border-[#0f4c81]/20 hover:bg-[#e8f0fe] transition-colors"
                      >
                        查看商戶完整資訊 →
                      </a>
                    </div>

                    {/* FAQs */}
                    <div className="space-y-2.5">
                      {mFaqs.map((faq, idx) => (
                        <details
                          key={faq.id}
                          className="group bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow"
                          {...(idx === 0 ? { open: true } : {})}
                        >
                          <summary className="font-semibold cursor-pointer px-6 py-4 flex justify-between items-center hover:bg-[#fafbfc] transition-colors text-[#1a1a2e] text-sm md:text-base">
                            <span className="pr-4 leading-relaxed">{faq.question}</span>
                            <span className="text-[#0f4c81] text-xs group-open:rotate-180 transition-transform duration-300 flex-shrink-0 w-5 h-5 rounded-full bg-[#e8f0fe] flex items-center justify-center">
                              ▼
                            </span>
                          </summary>
                          <div className="px-6 pb-5 border-t border-[#e5e7eb]">
                            <p className="mt-4 text-[#6b7280] text-sm md:text-base" style={{ lineHeight: '1.85' }}>
                              {faq.answer}
                            </p>
                            {faq.related_insight_slug && (
                              <p className="mt-3">
                                <a
                                  href={`/macao/insights/${faq.related_insight_slug}`}
                                  className="inline-flex items-center gap-1.5 text-xs text-[#0f4c81] hover:underline font-medium"
                                >
                                  <span className="text-[#c5a572]">📖</span>
                                  深度分析：查看相關文章
                                </a>
                              </p>
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>

            {/* ═══ Back to category ═══ */}
            <div className="mt-12 pt-8 border-t border-[#e5e7eb] flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-[#6b7280]">
                共顯示 <span className="font-semibold text-[#1a1a2e]">{merchantsWithFaqs.length}</span> 家商戶、
                <span className="font-semibold text-[#1a1a2e]">{totalFaqs}</span> 個常見問答
              </p>
              <a
                href={`/macao/${indSlug}/${catSlug}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0f4c81] text-white text-sm font-semibold rounded-xl hover:bg-[#0d3f6d] hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all duration-300"
              >
                ← 返回{category.name_zh}商戶列表
              </a>
            </div>
          </>
        )}

        {/* ═══ Footer ═══ */}
        <footer className="border-t border-[#e5e7eb] pt-8 mt-12 text-sm text-[#6b7280]">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <p>由 <a href="https://cloudpipe-landing.vercel.app" className="text-[#0f4c81] hover:underline font-medium">CloudPipe AI</a> 自動生成並人工審核</p>
              <p className="mt-1 text-xs text-[#6b7280]/70">資料每小時更新</p>
            </div>
            <div className="md:text-right">
              <a href={`/macao/${indSlug}/${catSlug}`} className="text-[#0f4c81] hover:underline font-medium">← 返回{category.name_zh}</a>
              <p className="mt-1 text-xs text-[#6b7280]/70">&copy; 2026 CloudPipe &middot; CC BY 4.0</p>
            </div>
          </div>
          <div className="text-center text-xs text-[#6b7280]/50 mt-6 pt-4 border-t border-[#e5e7eb]/50">
            <a href="https://cloudpipe-landing.vercel.app" className="hover:text-[#0f4c81]">CloudPipe AI</a>
            <span className="mx-2">&middot;</span>
            <a href="https://cloudpipe-directory.vercel.app" className="hover:text-[#0f4c81]">企業目錄</a>
            <span className="mx-2">&middot;</span>
            <a href="https://inari-kira-isla.github.io/Openclaw/" className="hover:text-[#0f4c81]">AI 學習寶庫</a>
            <span className="mx-2">&middot;</span>
            <a href="https://inari-kira-isla.github.io/inari-global-foods/" className="hover:text-[#0f4c81]">稻荷環球食品</a>
          </div>
        </footer>
      </main>
    </>
  )
}
