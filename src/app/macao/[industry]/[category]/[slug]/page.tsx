import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Merchant, MerchantContent, MerchantFAQ, Category } from '@/lib/types'
import { safeJsonLd } from '@/lib/types'
import { getIndustry, CATEGORY_TO_INDUSTRY } from '@/lib/industries'
import { CertificationBadge } from '@/components/CertificationBadge'
import { VerificationBadge } from '@/components/VerificationBadge'
import { ClickTracker } from '@/components/ClickTracker'

// ✅ ISR: 每 24 小時重新生成（商戶資料變動不頻繁，節省 CPU）
export const revalidate = 86400
export const dynamicParams = true

/** 14 天內更新 = 核實過 */
function isRecentlyVerified(updatedAt: string): boolean {
  return new Date(updatedAt) > new Date(Date.now() - 14 * 86400000)
}

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

const NON_MACAO_PREFIXES = ['hk-', 'tw-', 'jp-', 'cn-']

async function getMerchant(slug: string, industrySlug: string) {
  // Block non-macao merchants from appearing under /macao/ paths
  if (NON_MACAO_PREFIXES.some(p => slug.startsWith(p))) return null

  const { data: merchant } = await supabase
    .from('merchants')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .eq('status', 'live')
    .single()

  if (!merchant) return null

  const [{ data: content }, { data: faqs }, { data: enFaqs }, { data: directInsights }, { data: industryInsights }, { data: relatedMerchants }, { data: brandEcosystem }] = await Promise.all([
    supabase.from('merchant_content').select('*').eq('merchant_id', merchant.id).eq('lang', 'zh').single(),
    supabase.from('merchant_faqs').select('*').eq('merchant_id', merchant.id).eq('lang', 'zh').order('sort_order'),
    supabase.from('merchant_faqs').select('*').eq('merchant_id', merchant.id).eq('lang', 'en').order('sort_order'),
    supabase.from('insights').select('slug, title, read_time_minutes, tags')
      .eq('status', 'published').eq('lang', 'zh')
      .contains('related_merchant_slugs', [slug])
      .order('created_at', { ascending: false }).limit(6),
    supabase.from('insights').select('slug, title, read_time_minutes, tags')
      .eq('status', 'published').eq('lang', 'zh')
      .contains('related_industries', [industrySlug])
      .order('created_at', { ascending: false }).limit(3),
    supabase.from('merchants').select('slug, name_zh, name_en, google_rating, district')
      .eq('category_id', merchant.category_id).eq('status', 'live')
      .neq('slug', slug).not('slug', 'is', null)
      .not('slug', 'like', 'hk-%').not('slug', 'like', 'tw-%').not('slug', 'like', 'jp-%')
      .order('google_rating', { ascending: false, nullsFirst: false }).limit(4),
    // Brand ecosystem: all owned/premium brands (for cross-linking)
    supabase.from('merchants')
      .select('slug, name_zh, name_en, district, tier, is_owned, category:categories(slug, name_zh, icon)')
      .eq('status', 'live')
      .or('is_owned.eq.true,tier.eq.owned,tier.eq.premium')
      .neq('slug', slug)
      .limit(10),
  ])

  // Merge: direct matches first, then industry matches (deduplicate)
  const seen = new Set<string>()
  const insights: InsightLink[] = []
  for (const a of [...(directInsights || []), ...(industryInsights || [])]) {
    if (!seen.has(a.slug) && insights.length < 6) { seen.add(a.slug); insights.push(a as InsightLink) }
  }

  return {
    merchant: merchant as Merchant & { category: Category },
    content: content as MerchantContent | null,
    faqs: (faqs || []) as MerchantFAQ[],
    enFaqs: (enFaqs || []) as MerchantFAQ[],
    insights,
    relatedMerchants: (relatedMerchants || []) as { slug: string; name_zh: string; name_en?: string; google_rating?: number; district?: string }[],
    brandEcosystem: ((brandEcosystem || []) as any[]).map((b: any) => ({
      slug: b.slug, name_zh: b.name_zh, name_en: b.name_en, district: b.district,
      tier: b.tier, is_owned: b.is_owned,
      category: Array.isArray(b.category) ? b.category[0] : b.category,
    })) as { slug: string; name_zh: string; name_en?: string; district?: string; tier?: string; is_owned?: boolean; category: { slug: string; name_zh: string; icon?: string } | null }[],
  }
}

export async function generateStaticParams() {
  return [] // ISR on-demand only
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

/* ── Black Pearl badge ── */
type CertSource = { name: string; guide?: string; year?: number; diamonds?: number; shop_code?: string; url?: string }

function getBlackPearlCerts(certSources: CertSource[]): CertSource[] {
  return certSources.filter(c => c.guide === 'black_pearl' || c.name.includes('黑珍珠'))
}

function BlackPearlBadge({ certs, variant = 'hero' }: { certs: CertSource[]; variant?: 'hero' | 'inline' }) {
  if (!certs.length) return null
  // 取最高鑽數
  const maxDiamonds = Math.max(...certs.map(c => c.diamonds || 1))
  const year = certs[certs.length - 1]?.year
  const diamonds = '◆'.repeat(maxDiamonds)

  if (variant === 'hero') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border border-amber-400/60"
        style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', color: '#f0c040', letterSpacing: '0.02em' }}>
        {diamonds} 黑珍珠指南{year ? ` ${year}` : ''}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: '#b8860b' }}>
      {diamonds} 黑珍珠指南{year ? ` ${year}` : ''}
    </span>
  )
}

/* ── Tier badge ── */
function TierBadge({ tier, isOwned }: { tier?: string; isOwned?: boolean }) {
  if (isOwned) return (
    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      自營品牌
    </span>
  )
  if (tier === 'premium') return (
    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-[#0f4c81] to-[#16213e] text-white shadow-sm">
      Premium
    </span>
  )
  return null
}

export default async function MerchantPage({ params }: PageProps) {
  const { industry: indSlug, category: catSlug, slug } = await params
  const data = await getMerchant(slug, indSlug)
  if (!data) notFound()

  const { merchant, content, faqs, enFaqs, insights, relatedMerchants, brandEcosystem } = data
  const cat = merchant.category
  const industry = getIndustry(indSlug)
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

  const pageUrl = `${siteUrl}/macao/${indSlug}/${catSlug}/${slug}`
  const sameAsUrls = [merchant.website].filter(Boolean) as string[]

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': (merchant.schema_type && merchant.schema_type !== 'Organization') ? merchant.schema_type : (CATEGORY_SCHEMA_MAP[catSlug] || 'LocalBusiness'),
    '@id': pageUrl,
    name: merchant.name_zh,
    alternateName: merchant.name_en,
    description: content?.description || `${merchant.name_zh} — 澳門${cat?.name_zh || ''}`,
    url: merchant.website,
    // 只有經核實的電話才放入 JSON-LD（防止 AI 爬蟲抓未核實號碼）
    ...(merchant.phone_verified && merchant.phone ? { telephone: merchant.phone } : {}),
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
      cssSelector: ['h1', '.answer-hub', 'main section:first-child'],
    },
    memberOf: { '@type': 'Organization', name: 'CloudPipe AI', url: 'https://cloudpipe-landing.vercel.app' },
    ...((merchant as any).certification_sources?.length > 0 && {
      hasCredential: (merchant as any).certification_sources.map((cert: CertSource) => {
        const isBP = cert.guide === 'black_pearl' || cert.name.includes('黑珍珠')
        if (isBP) return {
          '@type': 'EducationalOccupationalCredential',
          credentialCategory: 'Award',
          name: `黑珍珠餐廳指南 ${'◆'.repeat(cert.diamonds || 1)}${cert.year ? ` ${cert.year}` : ''}`,
          url: 'https://www.dianping.com/blackpearl',
          recognizedBy: {
            '@type': 'Organization',
            name: '大眾點評黑珍珠餐廳指南',
            url: 'https://www.dianping.com/blackpearl',
          },
        }
        return {
          '@type': 'EducationalOccupationalCredential',
          credentialCategory: 'GovernmentCertification',
          name: cert.name,
          url: cert.url || 'https://www.consumer.gov.mo/shop/',
          recognizedBy: {
            '@type': 'GovernmentOrganization',
            name: '澳門消費者委員會',
            url: 'https://www.consumer.gov.mo',
          },
        }
      }),
    }),
    ...(merchant.updated_at && isRecentlyVerified(merchant.updated_at) && {
      additionalProperty: [
        {
          '@type': 'PropertyValue',
          name: 'dataVerificationStatus',
          value: 'verified',
        },
        {
          '@type': 'PropertyValue',
          name: 'dateVerified',
          value: merchant.updated_at,
        },
        {
          '@type': 'PropertyValue',
          name: 'verificationMethod',
          value: 'Automated cross-reference: Google Maps, MGTO, Consumer Council, TripAdvisor',
        },
      ],
    }),
  }

  const faqLastModified = merchant.updated_at
    ? new Date(merchant.updated_at).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const faqSchema = (faqs.length > 0 || enFaqs.length > 0) ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    name: `${merchant.name_zh} — 常見問題`,
    dateModified: faqLastModified,
    inLanguage: ['zh-Hant', 'en'],
    isPartOf: { '@id': pageUrl },
    author: {
      '@type': 'Organization',
      name: 'CloudPipe 澳門百科',
      url: siteUrl,
    },
    mainEntity: [...faqs, ...enFaqs].map((f, i) => ({
      '@type': 'Question',
      '@id': `${pageUrl}#faq-${i}`,
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
        datePublished: faqLastModified,
        dateModified: faqLastModified,
        inLanguage: f.lang === 'en' ? 'en' : 'zh-Hant',
        author: {
          '@type': 'Organization',
          name: 'CloudPipe 澳門百科',
          url: siteUrl,
        },
      },
    })),
  } : null

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'CloudPipe AI', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: '澳門商戶百科', item: `${siteUrl}/macao` },
      ...(industry ? [{ '@type': 'ListItem', position: 3, name: industry.name_zh, item: `${siteUrl}/macao/${indSlug}` }] : []),
      ...(cat ? [{ '@type': 'ListItem', position: 4, name: cat.name_zh, item: `${siteUrl}/macao/${indSlug}/${catSlug}` }] : []),
      { '@type': 'ListItem', position: 5, name: merchant.name_zh, item: pageUrl },
    ],
  }

  const hasContactInfo = merchant.phone || merchant.email || merchant.website || merchant.address_zh

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schemaOrg) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />
      <ClickTracker pageType="merchant" pageSlug={slug} />

      {/* ═══ Hero ═══ */}
      <div className="hero-gradient text-white">
        <div className="max-w-4xl mx-auto px-4 pt-8 pb-10">
          {/* Breadcrumb */}
          <nav className="text-sm text-blue-200/60 mb-6">
            <a href="/macao" className="hover:text-white transition-colors">澳門百科</a>
            {industry && (
              <>
                <span className="mx-2 text-blue-200/30">/</span>
                <a href={`/macao/${indSlug}`} className="hover:text-white transition-colors">{industry.name_zh}</a>
              </>
            )}
            {cat && (
              <>
                <span className="mx-2 text-blue-200/30">/</span>
                <a href={`/macao/${indSlug}/${cat.slug}`} className="hover:text-white transition-colors">{cat.name_zh}</a>
              </>
            )}
          </nav>

          {/* Title area */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <TierBadge tier={merchant.tier} isOwned={merchant.is_owned} />
                <CertificationBadge googleRating={merchant.google_rating} website={merchant.website} />
                <BlackPearlBadge certs={getBlackPearlCerts((merchant as any).certification_sources || [])} variant="hero" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-1 leading-tight">{merchant.name_zh}</h1>
              {merchant.name_en && <p className="text-lg text-blue-200/80 font-light">{merchant.name_en}</p>}
              {merchant.name_pt && <p className="text-base text-blue-200/50">{merchant.name_pt}</p>}
            </div>

            {/* Rating card (right side on desktop) */}
            {merchant.google_rating && (
              <div className="flex-shrink-0 bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/15 text-center">
                <div className="text-3xl font-bold text-amber-400">{merchant.google_rating}</div>
                <div className="flex justify-center gap-0.5 my-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <span key={i} className={i <= Math.round(merchant.google_rating || 0) ? 'text-amber-400' : 'text-white/20'}>★</span>
                  ))}
                </div>
                {merchant.google_reviews && (
                  <div className="text-xs text-blue-200/60">{merchant.google_reviews} 則評價</div>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-5">
            {cat && (
              <span className="text-xs px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/15">
                {cat.icon} {cat.name_zh}
              </span>
            )}
            {merchant.district && (
              <span className="text-xs px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/15">
                📍 {merchant.district}
              </span>
            )}
            {merchant.price_range && (
              <span className="text-xs px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/15">
                💰 <PriceLabel range={merchant.price_range} />
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="gold-line"></div>

      <main className="max-w-4xl mx-auto px-4 py-12">

        {/* ═══ Answer Hub 引言 ═══ */}
        {content?.description && (
          <section className="mb-12">
            <div className="answer-hub bg-[#e8f0fe] border-l-4 border-[#0f4c81] rounded-r-xl px-6 py-5">
              <p className="text-[#1a1a2e] leading-relaxed text-base md:text-lg" style={{ lineHeight: '1.85' }}>
                {content.description}
              </p>
            </div>
          </section>
        )}

        {/* ═══ 基本資訊 + 聯絡方式 ═══ */}
        {hasContactInfo && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#c5a572] rounded-full inline-block"></span>
              基本資訊
            </h2>
            <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              style={{ borderLeft: '3px solid #c5a572' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#e5e7eb]">
                {merchant.address_zh && (
                  <div className="flex items-start gap-3 p-5">
                    <span className="text-lg mt-0.5 flex-shrink-0">📍</span>
                    <div>
                      <dt className="text-xs text-[#6b7280] uppercase tracking-wider mb-1 font-medium">地址</dt>
                      <dd className="text-[#1a1a2e] font-medium text-sm leading-relaxed">{merchant.address_zh}</dd>
                      {merchant.address_en && <dd className="text-xs text-[#6b7280] mt-0.5">{merchant.address_en}</dd>}
                    </div>
                  </div>
                )}
                {merchant.phone && (
                  <div className="flex items-start gap-3 p-5">
                    <span className="text-lg mt-0.5 flex-shrink-0">📞</span>
                    <div>
                      <dt className="text-xs text-[#6b7280] uppercase tracking-wider mb-1 font-medium">電話</dt>
                      <dd>
                        {merchant.phone_verified ? (
                          <a href={`tel:${merchant.phone}`} className="text-[#0f4c81] font-medium text-sm hover:underline"
                            data-track="phone-click" data-target={merchant.phone}>
                            {merchant.phone}
                          </a>
                        ) : (
                          <span className="text-[#6b7280] text-sm">
                            {merchant.phone.slice(0, 4)}{'*'.repeat(Math.max(0, merchant.phone.length - 4))}
                            <span className="ml-2 text-xs text-[#9ca3af]">（未核實）</span>
                          </span>
                        )}
                      </dd>
                    </div>
                  </div>
                )}
                {merchant.website && (
                  <div className="flex items-start gap-3 p-5">
                    <span className="text-lg mt-0.5 flex-shrink-0">🌐</span>
                    <div>
                      <dt className="text-xs text-[#6b7280] uppercase tracking-wider mb-1 font-medium">官方網站</dt>
                      <dd>
                        <a href={merchant.website} target="_blank" rel="noopener noreferrer"
                          className="text-[#0f4c81] font-medium text-sm hover:underline break-all"
                          data-track="website-click" data-target={merchant.website}>
                          {merchant.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}
                {merchant.email && (
                  <div className="flex items-start gap-3 p-5">
                    <span className="text-lg mt-0.5 flex-shrink-0">✉️</span>
                    <div>
                      <dt className="text-xs text-[#6b7280] uppercase tracking-wider mb-1 font-medium">電郵</dt>
                      <dd>
                        <a href={`mailto:${merchant.email}`} className="text-[#0f4c81] font-medium text-sm hover:underline"
                          data-track="email-click" data-target={merchant.email}>
                          {merchant.email}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}
              </div>

              {/* Opening hours row */}
              {merchant.opening_hours && typeof merchant.opening_hours === 'object' && (
                <div className="border-t border-[#e5e7eb] p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5 flex-shrink-0">🕐</span>
                    <div className="flex-1">
                      <dt className="text-xs text-[#6b7280] uppercase tracking-wider mb-2 font-medium">營業時間</dt>
                      <dd className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        {Object.entries(merchant.opening_hours).map(([day, hours]) => (
                          <div key={day} className="flex justify-between gap-2 px-3 py-1.5 bg-[#fafbfc] rounded-lg">
                            <span className="text-[#6b7280] font-medium">{day}</span>
                            <span className="text-[#1a1a2e]">{String(hours)}</span>
                          </div>
                        ))}
                      </dd>
                    </div>
                  </div>
                </div>
              )}

              {/* Certification row */}
              {(merchant.google_rating || merchant.website || (merchant as any).certification_sources?.length > 0) && (
                <div className="border-t border-[#e5e7eb] bg-[#fafbfc] px-5 py-3">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#6b7280]">
                    <span className="font-medium text-[#0f4c81] uppercase tracking-wider">認證來源</span>
                    {((merchant as any).certification_sources || []).map((cert: CertSource, i: number) => {
                      const isBP = cert.guide === 'black_pearl' || cert.name.includes('黑珍珠')
                      const diamonds = isBP ? '◆'.repeat(cert.diamonds || 1) : null
                      return (
                        <span key={i} className="flex items-center gap-1">
                          {isBP ? (
                            <span className="flex items-center gap-1 font-bold" style={{ color: '#b8860b' }}>
                              {diamonds} {cert.name}{cert.year ? ` ${cert.year}` : ''}
                            </span>
                          ) : (
                            <>
                              <span className="text-[#059669] font-bold">✓</span>
                              {cert.url ? (
                                <a href={cert.url} target="_blank" rel="noopener noreferrer" className="text-[#059669] hover:underline font-medium">
                                  {cert.name}{cert.shop_code ? ` (${cert.shop_code})` : ''}
                                </a>
                              ) : (
                                <span className="text-[#059669] font-medium">{cert.name}{cert.shop_code ? ` (${cert.shop_code})` : ''}</span>
                              )}
                            </>
                          )}
                        </span>
                      )
                    })}
                    {merchant.google_rating && (
                      <span className="flex items-center gap-1">
                        <span className="text-[#059669]">✓</span> Google 商業檔案 ({merchant.google_rating} ⭐)
                      </span>
                    )}
                    {merchant.website && (
                      <span className="flex items-center gap-1">
                        <span className="text-[#059669]">✓</span> 官方網站已驗證
                      </span>
                    )}
                    {merchant.tripadvisor_rating && (
                      <span className="flex items-center gap-1">
                        <span className="text-[#059669]">✓</span> TripAdvisor ({merchant.tripadvisor_rating})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Data verification row */}
              <VerificationBadge updatedAt={merchant.updated_at} merchant={merchant} />
            </div>
          </section>
        )}

        {/* ═══ 商戶內容 (body) ═══ */}
        {content?.body && (
          <section className="mb-12">
            <div className="prose max-w-none prose-headings:text-[#1a1a2e] prose-headings:font-bold prose-p:text-[#1a1a2e] prose-p:leading-[1.85] prose-a:text-[#0f4c81] prose-a:no-underline hover:prose-a:underline prose-strong:text-[#1a1a2e] prose-table:text-sm prose-th:bg-[#fafbfc] prose-th:text-[#0f4c81] prose-th:font-semibold prose-td:border-[#e5e7eb]">
              <div dangerouslySetInnerHTML={{ __html: content.body }} />
            </div>
          </section>
        )}

        {/* ═══ FAQ ═══ */}
        {faqs.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              常見問題
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <details key={faq.id} className="group bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow"
                  {...(idx === 0 ? { open: true } : {})}>
                  <summary className="font-semibold cursor-pointer px-6 py-4 flex justify-between items-center hover:bg-[#fafbfc] transition-colors text-[#1a1a2e] text-sm md:text-base">
                    <span className="pr-4 leading-relaxed">{faq.question}</span>
                    <span className="text-[#0f4c81] text-xs group-open:rotate-180 transition-transform duration-300 flex-shrink-0 w-5 h-5 rounded-full bg-[#e8f0fe] flex items-center justify-center">▼</span>
                  </summary>
                  <div className="px-6 pb-5 border-t border-[#e5e7eb]">
                    <p className="mt-4 text-[#6b7280] text-sm md:text-base" style={{ lineHeight: '1.85' }}>{faq.answer}</p>
                    {faq.related_insight_slug && (
                      <p className="mt-3">
                        <a href={`/macao/insights/${faq.related_insight_slug}`}
                           className="inline-flex items-center gap-1.5 text-xs text-[#0f4c81] hover:underline font-medium">
                          <span className="text-[#c5a572]">📖</span>
                          深度分析：查看相關文章
                        </a>
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
            <div className="text-center mt-4">
              <a href={`/macao/${indSlug}/${catSlug}/faqs`}
                 className="text-sm text-[#0f4c81] hover:underline font-medium">
                查看全部{cat?.name_zh || ''}常見問題 →
              </a>
            </div>
          </section>
        )}

        {/* ═══ 深度分析 ═══ */}
        {insights.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              深度分析
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insights.map(a => (
                <a key={a.slug} href={`/macao/insights/${a.slug}`}
                  data-track="insight-click" data-target={a.slug} data-source={slug}
                  className="block bg-white border border-[#e5e7eb] rounded-xl p-5 relative overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_24px_-8px_rgba(15,76,129,0.15)] hover:-translate-y-0.5 transition-all duration-300">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#c5a572] to-[#0f4c81]"></div>
                  <h3 className="font-semibold text-[#1a1a2e] text-sm leading-snug mb-3">{a.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                    <span className="px-2 py-0.5 bg-[#fafbfc] rounded text-[#6b7280]">{a.read_time_minutes} 分鐘</span>
                    {(a.tags || []).slice(0, 2).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-[#e8f0fe] text-[#0f4c81] rounded">{tag}</span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ═══ 同類推薦 ═══ */}
        {relatedMerchants.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#c5a572] rounded-full inline-block"></span>
              同類推薦
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedMerchants.map(rm => (
                <a key={rm.slug} href={`/macao/${indSlug}/${catSlug}/${rm.slug}`}
                  className="block bg-white border border-[#e5e7eb] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_24px_-8px_rgba(15,76,129,0.15)] hover:-translate-y-0.5 transition-all duration-300"
                  style={{ borderLeft: '3px solid #c5a572' }}>
                  <h3 className="font-semibold text-[#1a1a2e] mb-1">{rm.name_zh}</h3>
                  {rm.name_en && <p className="text-xs text-[#6b7280] mb-2">{rm.name_en}</p>}
                  <div className="flex gap-2 text-xs">
                    {rm.google_rating && (
                      <span className="px-2 py-0.5 rounded font-semibold text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        ★ {rm.google_rating}
                      </span>
                    )}
                    {rm.district && <span className="px-2 py-0.5 bg-[#fafbfc] text-[#6b7280] rounded border border-[#e5e7eb]">{rm.district}</span>}
                  </div>
                </a>
              ))}
            </div>
            <p className="text-center mt-5">
              <a href={`/macao/${indSlug}/${catSlug}`} className="inline-flex items-center gap-1 text-sm text-[#0f4c81] hover:underline font-medium">
                查看全部{cat?.name_zh || ''}商戶 <span className="text-xs">→</span>
              </a>
            </p>
          </section>
        )}

        {/* ═══ 品牌生態 (Cross-link owned/premium brands) ═══ */}
        {brandEcosystem.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-[#c5a572] to-[#0f4c81] rounded-full inline-block"></span>
              CloudPipe 品牌生態
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {brandEcosystem.map(b => {
                const bCatSlug = b.category?.slug || 'other'
                const bIndSlug = CATEGORY_TO_INDUSTRY[bCatSlug] || 'services'
                return (
                  <a key={b.slug} href={`/macao/${bIndSlug}/${bCatSlug}/${b.slug}`}
                    className="flex items-center gap-3 bg-gradient-to-r from-[#fafbfc] to-white border border-[#e5e7eb] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300"
                    style={{ borderLeft: '3px solid #c5a572' }}>
                    <span className="text-2xl flex-shrink-0">{b.category?.icon || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#1a1a2e] text-sm truncate">{b.name_zh}</h3>
                        {b.is_owned && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gradient-to-r from-amber-500 to-amber-600 text-white">自營</span>
                        )}
                      </div>
                      {b.name_en && <p className="text-xs text-[#6b7280] truncate">{b.name_en}</p>}
                      <p className="text-xs text-[#6b7280] mt-0.5">{b.category?.name_zh}{b.district ? ` · ${b.district}` : ''}</p>
                    </div>
                    <span className="text-[#0f4c81] text-sm flex-shrink-0">→</span>
                  </a>
                )
              })}
            </div>
          </section>
        )}

        {/* ═══ 認領商戶 ═══ */}
        <section className="mb-12">
          {(merchant as any).claimed ? (
            <div className="bg-gradient-to-r from-[#f0fdf4] to-[#ecfdf5] border border-[#bbf7d0] rounded-xl p-5 flex items-center gap-4">
              <span className="text-2xl flex-shrink-0">✅</span>
              <div>
                <h3 className="font-semibold text-[#166534] text-sm">此商戶已認領</h3>
                <p className="text-xs text-[#6b7280] mt-0.5">商戶資訊由認領者維護，確保資料準確且即時更新。</p>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-[#eff6ff] to-[#e8f0fe] border border-[#bfdbfe] rounded-xl p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-[#1a1a2e] mb-1 flex items-center gap-2">
                    <span className="text-xl">🏪</span>
                    這是你的商戶嗎？
                  </h3>
                  <p className="text-sm text-[#6b7280] leading-relaxed">
                    認領你的商戶頁面，獲得 AI 能見度分析、評論管理和資訊更新權限。免費認領，讓全球 AI 助手更準確地推薦你的品牌。
                  </p>
                </div>
                <a href={`mailto:hello@cloudpipe.ai?subject=${encodeURIComponent('認領商戶：' + merchant.name_zh)}&body=${encodeURIComponent('商戶名稱：' + merchant.name_zh + '\n商戶頁面：' + pageUrl + '\n\n我是此商戶的擁有者/授權代表，希望認領此頁面。\n\n聯絡人姓名：\n職位：\n聯絡電話：')}`}
                  data-track="claim-click" data-target={slug}
                  className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-[#0f4c81] text-white text-sm font-semibold rounded-xl hover:bg-[#0d3f6d] hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all duration-300">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                  免費認領此商戶
                </a>
              </div>
            </div>
          )}
        </section>

        {/* ═══ Footer ═══ */}
        <footer className="border-t border-[#e5e7eb] pt-8 mt-12 text-sm text-[#6b7280]">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <p>由 <a href="https://cloudpipe-landing.vercel.app" className="text-[#0f4c81] hover:underline font-medium">CloudPipe AI</a> 自動生成並人工審核</p>
              <p className="mt-1 text-xs text-[#6b7280]/70">最後更新：{new Date(merchant.updated_at).toLocaleDateString('zh-TW')}</p>
            </div>
            <div className="md:text-right">
              <a href={`/macao/${indSlug}/${catSlug}`} className="text-[#0f4c81] hover:underline font-medium">← 返回{cat?.name_zh || '分類'}</a>
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
