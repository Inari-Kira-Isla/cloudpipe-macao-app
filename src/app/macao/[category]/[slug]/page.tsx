import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Merchant, MerchantContent, MerchantFAQ, Category } from '@/lib/types'

interface PageProps {
  params: Promise<{ category: string; slug: string }>
}

async function getMerchant(slug: string) {
  const { data: merchant } = await supabase
    .from('merchants')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .eq('status', 'live')
    .single()

  if (!merchant) return null

  const [{ data: content }, { data: faqs }] = await Promise.all([
    supabase
      .from('merchant_content')
      .select('*')
      .eq('merchant_id', merchant.id)
      .eq('lang', 'zh')
      .single(),
    supabase
      .from('merchant_faqs')
      .select('*')
      .eq('merchant_id', merchant.id)
      .eq('lang', 'zh')
      .order('sort_order'),
  ])

  return { merchant: merchant as Merchant & { category: Category }, content: content as MerchantContent | null, faqs: (faqs || []) as MerchantFAQ[] }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getMerchant(slug)
  if (!data) return { title: '找不到商戶' }

  const { merchant, content } = data
  const title = content?.og_title || `${merchant.name_zh} — 澳門百科 | CloudPipe`
  const description = content?.og_description || content?.description || `${merchant.name_zh} 的完整資訊、評價、FAQ`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'zh_TW',
      images: content?.og_image ? [content.og_image] : undefined,
    },
    other: {
      'llms-txt': '/macao/llms-txt',
    },
  }
}

export default async function MerchantPage({ params }: PageProps) {
  const { slug } = await params
  const data = await getMerchant(slug)
  if (!data) notFound()

  const { merchant, content, faqs } = data
  const cat = merchant.category

  // Schema.org JSON-LD
  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': merchant.schema_type || 'Organization',
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
      geo: {
        '@type': 'GeoCoordinates',
        latitude: merchant.latitude,
        longitude: merchant.longitude,
      },
    }),
    ...(merchant.google_rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: merchant.google_rating,
        reviewCount: merchant.google_reviews,
        bestRating: 5,
      },
    }),
    ...(merchant.opening_hours && {
      openingHoursSpecification: Object.entries(merchant.opening_hours).map(
        ([day, hours]) => ({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: day,
          opens: (hours as string).split('-')[0],
          closes: (hours as string).split('-')[1],
        })
      ),
    }),
    memberOf: {
      '@type': 'Organization',
      name: 'CloudPipe AI',
      url: 'https://inari-kira-isla.github.io/cloudpipe-landing/',
    },
  }

  const faqSchema = faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  } : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <a href="/macao" className="hover:text-blue-600">澳門百科</a>
          <span className="mx-2">/</span>
          {cat && (
            <>
              <a href={`/macao/${cat.slug}`} className="hover:text-blue-600">{cat.name_zh}</a>
              <span className="mx-2">/</span>
            </>
          )}
          <span className="text-gray-900">{merchant.name_zh}</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{merchant.name_zh}</h1>
          {merchant.name_en && (
            <p className="text-xl text-gray-500">{merchant.name_en}</p>
          )}
          {merchant.name_pt && (
            <p className="text-lg text-gray-400">{merchant.name_pt}</p>
          )}

          <div className="flex flex-wrap gap-3 mt-4 text-sm">
            {cat && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                {cat.icon} {cat.name_zh}
              </span>
            )}
            {merchant.district && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
                📍 {merchant.district}
              </span>
            )}
            {merchant.price_range && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                {merchant.price_range}
              </span>
            )}
            {merchant.google_rating && (
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full">
                ⭐ {merchant.google_rating} ({merchant.google_reviews} 則評論)
              </span>
            )}
          </div>
        </header>

        {/* Contact Info */}
        <section className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">基本資訊</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {merchant.address_zh && (
              <div>
                <dt className="text-gray-500">地址</dt>
                <dd className="font-medium">{merchant.address_zh}</dd>
              </div>
            )}
            {merchant.phone && (
              <div>
                <dt className="text-gray-500">電話</dt>
                <dd className="font-medium">
                  <a href={`tel:${merchant.phone}`} className="text-blue-600">{merchant.phone}</a>
                </dd>
              </div>
            )}
            {merchant.website && (
              <div>
                <dt className="text-gray-500">網站</dt>
                <dd className="font-medium">
                  <a href={merchant.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {merchant.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                </dd>
              </div>
            )}
            {merchant.email && (
              <div>
                <dt className="text-gray-500">電郵</dt>
                <dd className="font-medium">
                  <a href={`mailto:${merchant.email}`} className="text-blue-600">{merchant.email}</a>
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* Main Content */}
        {content?.body && (
          <section className="prose prose-lg max-w-none mb-8">
            <div dangerouslySetInnerHTML={{ __html: content.body }} />
          </section>
        )}

        {/* FAQ */}
        {faqs.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-6">常見問題</h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <details key={faq.id} className="border rounded-lg p-4 group">
                  <summary className="font-semibold cursor-pointer list-none flex justify-between items-center">
                    {faq.question}
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="mt-3 text-gray-600 leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="border-t pt-6 mt-8 text-sm text-gray-500">
          <p>本頁由 <a href="https://inari-kira-isla.github.io/cloudpipe-landing/" className="text-blue-600">CloudPipe AI</a> 自動生成並人工審核</p>
          <p className="mt-1">最後更新：{new Date(merchant.updated_at).toLocaleDateString('zh-TW')}</p>
          <p className="mt-1">© 2026 CloudPipe · CC BY 4.0</p>
        </footer>
      </main>
    </>
  )
}
