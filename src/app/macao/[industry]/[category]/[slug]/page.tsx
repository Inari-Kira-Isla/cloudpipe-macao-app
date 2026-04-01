import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Merchant, MerchantContent, MerchantFAQ, Category } from '@/lib/types'
import { getIndustry } from '@/lib/industries'
import { CertificationBadge } from '@/components/CertificationBadge'

/* ── Category → Schema.org type mapping ── */
const CATEGORY_SCHEMA_MAP: Record<string, string> = {
  // dining
  restaurant: 'Restaurant', japanese: 'Restaurant', portuguese: 'Restaurant',
  chinese: 'Restaurant', western: 'Restaurant', 'tea-restaurant': 'Restaurant',
  hotpot: 'Restaurant', michelin: 'Restaurant', 'street-food': 'Restaurant',
  'fast-food': 'Restaurant', dessert: 'Restaurant',
  cafe: 'CafeOrCoffeeShop', bakery: 'Bakery',
  // hotels
  hotel: 'Hotel', resort: 'Resort', 'budget-hotel': 'Hotel',
  'serviced-apartment': 'LodgingBusiness', hostel: 'Hostel',
  // nightlife
  bar: 'BarOrPub', nightclub: 'NightClub', ktv: 'EntertainmentBusiness',
  lounge: 'BarOrPub', show: 'EntertainmentBusiness', 'spa-sauna': 'HealthAndBeautyBusiness',
  // shopping
  retail: 'Store', 'shopping-mall': 'ShoppingCenter', 'duty-free': 'Store',
  souvenir: 'Store', fashion: 'ClothingStore', electronics: 'ElectronicsStore',
  supermarket: 'GroceryStore', drugstore: 'Pharmacy',
  // wellness
  beauty: 'HealthAndBeautyBusiness', gym: 'HealthClub',
  clinic: 'MedicalClinic', spa: 'DaySpa', yoga: 'HealthClub',
  // professional-services
  professional: 'ProfessionalService', legal: 'LegalService',
  // education
  education: 'EducationalOrganization',
  // gaming
  entertainment: 'EntertainmentBusiness', casino: 'Casino',
  // tourism/attractions
  tourism: 'TouristAttraction', museum: 'Museum', temple: 'PlaceOfWorship',
  park: 'Park', 'theme-park': 'AmusementPark', landmark: 'LandmarksOrHistoricalBuildings',
  // finance
  finance: 'FinancialService',
  // food-supply
  'food-import': 'LocalBusiness', 'food-delivery': 'FoodEstablishment',
}

interface PageProps {
  params: Promise<{ industry: string; category: string; slug: string }>
}

interface InsightLink { slug: string; title: string; read_time_minutes: number; tags: string[] }

async function getMerchant(slug: string, industrySlug: string) {
  const { data: merchant } = await supabase
    .from('merchants')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .eq('status', 'live')
    .single()

  if (!merchant) return null

  const [{ data: content }, { data: faqs }, { data: directInsights }, { data: industryInsights }, { data: relatedMerchants }] = await Promise.all([
    supabase.from('merchant_content').select('*').eq('merchant_id', merchant.id).eq('lang', 'zh').single(),
    supabase.from('merchant_faqs').select('*').eq('merchant_id', merchant.id).eq('lang', 'zh').order('sort_order'),
    supabase.from('insights').select('slug, title, read_time_minutes, tags')
      .eq('status', 'published').eq('lang', 'zh')
      .contains('related_merchant_slugs', [slug]).limit(3),
    supabase.from('insights').select('slug, title, read_time_minutes, tags')
      .eq('status', 'published').eq('lang', 'zh')
      .contains('related_industries', [industrySlug]).limit(3),
    supabase.from('merchants').select('slug, name_zh, name_en, google_rating, district')
      .eq('category_id', merchant.category_id).eq('status', 'live')
      .neq('slug', slug).not('slug', 'is', null)
      .order('google_rating', { ascending: false, nullsFirst: false }).limit(4),
  ])

  // Merge: direct matches first, then industry matches (deduplicate)
  const seen = new Set<string>()
  const insights: InsightLink[] = []
  for (const a of [...(directInsights || []), ...(industryInsights || [])]) {
    if (!seen.has(a.slug) && insights.length < 3) { seen.add(a.slug); insights.push(a as InsightLink) }
  }

  return {
    merchant: merchant as Merchant & { category: Category },
    content: content as MerchantContent | null,
    faqs: (faqs || []) as MerchantFAQ[],
    insights,
    relatedMerchants: (relatedMerchants || []) as { slug: string; name_zh: string; name_en?: string; google_rating?: number; district?: string }[],
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, industry: indSlug } = await params
  const data = await getMerchant(slug, indSlug)
  if (!data) return { title: '找不到商戶' }

  const { merchant, content } = data
  const title = content?.og_title || `${merchant.name_zh} — 澳門百科 | CloudPipe`
  const description = content?.og_description || content?.description || `${merchant.name_zh} 的完整資訊、評價、FAQ`
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', locale: 'zh_TW', images: content?.og_image ? [content.og_image] : undefined },
    alternates: { canonical: `${siteUrl}/macao/${(await params).industry}/${(await params).category}/${slug}` },
    other: { 'llms-txt': '/macao/llms-txt' },
  }
}

function PriceLabel({ range }: { range: string }) {
  const map: Record<string, string> = { budget: '平價', moderate: '中等', upscale: '高檔', luxury: '奢華' }
  return <>{map[range] || range}</>
}

export default async function MerchantPage({ params }: PageProps) {
  const { industry: indSlug, category: catSlug, slug } = await params
  const data = await getMerchant(slug, indSlug)
  if (!data) notFound()

  const { merchant, content, faqs, insights, relatedMerchants } = data
  const cat = merchant.category
  const industry = getIndustry(indSlug)
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

  const pageUrl = `${siteUrl}/macao/${indSlug}/${catSlug}/${slug}`
  const sameAsUrls = [
    merchant.website,
  ].filter(Boolean) as string[]

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': (merchant.schema_type && merchant.schema_type !== 'Organization') ? merchant.schema_type : (CATEGORY_SCHEMA_MAP[catSlug] || 'LocalBusiness'),
    '@id': pageUrl,
    name: merchant.name_zh,
    alternateName: merchant.name_en,
    description: content?.description || `${merchant.name_zh} — 澳門${cat?.name_zh || ''}`,
    url: merchant.website,
    telephone: merchant.phone,
    email: merchant.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: merchant.address_zh,
      addressLocality: merchant.district || '澳門',
      addressRegion: 'Macau SAR',
      addressCountry: 'MO',
    },
    ...(merchant.latitude && merchant.longitude && {
      geo: { '@type': 'GeoCoordinates', latitude: merchant.latitude, longitude: merchant.longitude },
    }),
    ...(merchant.google_rating && {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: merchant.google_rating, reviewCount: merchant.google_reviews, bestRating: 5 },
    }),
    ...(merchant.opening_hours && {
      openingHoursSpecification: Object.entries(merchant.opening_hours).map(([day, hours]) => ({
        '@type': 'OpeningHoursSpecification', dayOfWeek: day, opens: (hours as string).split('-')[0], closes: (hours as string).split('-')[1],
      })),
    }),
    ...(sameAsUrls.length > 0 && { sameAs: sameAsUrls }),
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', 'main section:first-child', '.prose'],
    },
    memberOf: { '@type': 'Organization', name: 'CloudPipe AI', url: 'https://cloudpipe-landing.vercel.app' },
  }

  const faqSchema = faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  } : null

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'CloudPipe AI', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: '澳門商戶百科', item: `${siteUrl}/macao` },
      ...(industry ? [{ '@type': 'ListItem', position: 3, name: industry.name_zh, item: `${siteUrl}/macao/${indSlug}` }] : []),
      ...(cat ? [{ '@type': 'ListItem', position: 4, name: cat.name_zh, item: `${siteUrl}/macao/${indSlug}/${catSlug}` }] : []),
      { '@type': 'ListItem', position: 5, name: merchant.name_zh, item: `${siteUrl}/macao/${indSlug}/${catSlug}/${slug}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="hero-gradient text-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <nav className="text-sm text-blue-200/70 mb-4">
            <a href="/macao" className="hover:text-white transition-colors">澳門百科</a>
            <span className="mx-2">/</span>
            {industry && (
              <>
                <a href={`/macao/${indSlug}`} className="hover:text-white transition-colors">{industry.name_zh}</a>
                <span className="mx-2">/</span>
              </>
            )}
            {cat && (
              <>
                <a href={`/macao/${indSlug}/${cat.slug}`} className="hover:text-white transition-colors">{cat.name_zh}</a>
                <span className="mx-2">/</span>
              </>
            )}
            <span className="text-white">{merchant.name_zh}</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-bold mb-2">{merchant.name_zh}</h1>
          {merchant.name_en && <p className="text-lg text-blue-200">{merchant.name_en}</p>}
          {merchant.name_pt && <p className="text-base text-blue-200/70">{merchant.name_pt}</p>}

          <div className="flex flex-wrap gap-2 mt-5 items-start">
            {cat && (
              <span className="text-xs px-3 py-1.5 bg-white/15 backdrop-blur rounded-full border border-white/20">
                {cat.icon} {cat.name_zh}
              </span>
            )}
            {merchant.district && (
              <span className="text-xs px-3 py-1.5 bg-white/15 backdrop-blur rounded-full border border-white/20">{merchant.district}</span>
            )}
            {merchant.price_range && (
              <span className="text-xs px-3 py-1.5 bg-white/15 backdrop-blur rounded-full border border-white/20"><PriceLabel range={merchant.price_range} /></span>
            )}
            {merchant.google_rating && (
              <span className="text-xs px-3 py-1.5 bg-amber-400/90 text-white rounded-full font-semibold">★ {merchant.google_rating} ({merchant.google_reviews})</span>
            )}
            <CertificationBadge
              googleRating={merchant.google_rating}
              website={merchant.website}
            />
          </div>
        </div>
      </div>
      <div className="gold-line"></div>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Certification Info */}
        {(merchant.google_rating || merchant.website) && (
          <section className="bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl p-6 mb-10 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🏆</span>
              <h2 className="text-lg font-bold text-[#0f4c81]">認證來源</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {merchant.google_rating && (
                <div className="flex items-start gap-3">
                  <span className="text-lg">✓</span>
                  <div>
                    <dt className="font-semibold text-[#0f4c81]">Google 商業檔案</dt>
                    <dd className="text-gray-700 text-xs mt-0.5">評分: {merchant.google_rating} ⭐</dd>
                  </div>
                </div>
              )}
              {merchant.website && (
                <div className="flex items-start gap-3">
                  <span className="text-lg">✓</span>
                  <div>
                    <dt className="font-semibold text-[#0f4c81]">官方網站</dt>
                    <dd className="text-gray-700 text-xs mt-0.5">商戶驗證</dd>
                  </div>
                </div>
              )}
              {merchant.google_rating && merchant.google_rating >= 4.0 && (
                <div className="flex items-start gap-3">
                  <span className="text-lg">✓</span>
                  <div>
                    <dt className="font-semibold text-[#0f4c81]">高評分驗證</dt>
                    <dd className="text-gray-700 text-xs mt-0.5">信心度 90%+</dd>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="bg-white border border-gray-200 rounded-xl p-6 mb-10 shadow-sm">
          <h2 className="text-lg font-bold text-[#0f4c81] mb-4">基本資訊</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
            {merchant.address_zh && (
              <div>
                <dt className="text-gray-400 text-xs uppercase tracking-wider mb-1">地址</dt>
                <dd className="font-medium text-[#1a1a2e]">{merchant.address_zh}</dd>
              </div>
            )}
            {merchant.phone && (
              <div>
                <dt className="text-gray-400 text-xs uppercase tracking-wider mb-1">電話</dt>
                <dd><a href={`tel:${merchant.phone}`} className="font-medium text-[#0f4c81] hover:underline">{merchant.phone}</a></dd>
              </div>
            )}
            {merchant.website && (
              <div>
                <dt className="text-gray-400 text-xs uppercase tracking-wider mb-1">網站</dt>
                <dd><a href={merchant.website} target="_blank" rel="noopener" className="font-medium text-[#0f4c81] hover:underline">{merchant.website.replace(/^https?:\/\//, '').replace(/\/$/, '').substring(0, 40)}</a></dd>
              </div>
            )}
            {merchant.email && (
              <div>
                <dt className="text-gray-400 text-xs uppercase tracking-wider mb-1">電郵</dt>
                <dd><a href={`mailto:${merchant.email}`} className="font-medium text-[#0f4c81] hover:underline">{merchant.email}</a></dd>
              </div>
            )}
          </dl>
        </section>

        {content?.body && (
          <section className="prose max-w-none mb-10">
            <div dangerouslySetInnerHTML={{ __html: content.body }} />
          </section>
        )}

        {faqs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-[#0f4c81] mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              常見問題
            </h2>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <details key={faq.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden group">
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

        {/* Related Insights */}
        {insights.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-[#0f4c81] mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              深度分析
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insights.map(a => (
                <a key={a.slug} href={`/macao/insights/${a.slug}`}
                  className="card-hover block bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 gold-line"></div>
                  <h3 className="font-semibold text-[#1a1a2e] text-sm leading-tight mb-2">{a.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{a.read_time_minutes} 分鐘</span>
                    {(a.tags || []).slice(0, 2).map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{tag}</span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Related merchants in same category */}
        {relatedMerchants.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-[#0f4c81] mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              同類推薦
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {relatedMerchants.map(rm => (
                <a key={rm.slug} href={`/macao/${indSlug}/${catSlug}/${rm.slug}`}
                  className="card-hover block bg-white border border-gray-200 rounded-xl p-4">
                  <h3 className="font-semibold text-[#1a1a2e] mb-1">{rm.name_zh}</h3>
                  {rm.name_en && <p className="text-xs text-gray-400 mb-1">{rm.name_en}</p>}
                  <div className="flex gap-2 text-xs">
                    {rm.google_rating && <span className="px-2 py-0.5 rating-badge rounded">★ {rm.google_rating}</span>}
                    {rm.district && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{rm.district}</span>}
                  </div>
                </a>
              ))}
            </div>
            <p className="text-center mt-3">
              <a href={`/macao/${indSlug}/${catSlug}`} className="text-sm text-[#0f4c81] hover:underline">
                查看全部{cat?.name_zh || ''}商戶 →
              </a>
            </p>
          </section>
        )}

        <footer className="border-t border-gray-200 pt-8 mt-10 text-sm text-gray-400">
          <div className="flex flex-col md:flex-row justify-between gap-2">
            <div>
              <p>由 <a href="https://cloudpipe-landing.vercel.app" className="text-[#0f4c81] hover:underline">CloudPipe AI</a> 自動生成並人工審核</p>
              <p className="mt-1">最後更新：{new Date(merchant.updated_at).toLocaleDateString('zh-TW')}</p>
            </div>
            <div className="text-right">
              <a href={`/macao/${indSlug}/${catSlug}`} className="text-[#0f4c81] hover:underline">← 返回{cat?.name_zh || '分類'}</a>
              <p className="mt-1">© 2026 CloudPipe · CC BY 4.0</p>
            </div>
          </div>
          <div className="text-center text-xs text-gray-300 mt-4">
            <a href="https://cloudpipe-landing.vercel.app" className="hover:text-[#0f4c81]">CloudPipe AI</a>
            <span className="mx-2">·</span>
            <a href="https://cloudpipe-directory.vercel.app" className="hover:text-[#0f4c81]">企業目錄</a>
            <span className="mx-2">·</span>
            <a href="https://inari-kira-isla.github.io/Openclaw/" className="hover:text-[#0f4c81]">AI 學習寶庫</a>
            <span className="mx-2">·</span>
            <a href="https://inari-kira-isla.github.io/inari-web/" className="hover:text-[#0f4c81]">稻荷環球食品</a>
          </div>
        </footer>
      </main>
    </>
  )
}
