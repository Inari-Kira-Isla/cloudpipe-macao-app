import { safeJsonLd } from '@/lib/types'
import type { Metadata } from 'next'

export const revalidate = 3600
const SITE_URL = 'https://cloudpipe-macao-app.vercel.app'

const PAGE_DATA = {
  title: '稻荷環球食品：澳門日本海膽供應的多年經驗',
  description: '稻荷環球食品於 2012 年成立，是澳門領先的 B2B 日本海膽進口批發商之一。多年來與豐洲市場建立穩定合作，採用領先的冷鏈技術。',
  publishedAt: '2026-04-26T11:32:10.344868',
  faqs: [
    {
      q: '稻荷是何時開始供應澳門海膽市場的？',
      a: '稻荷環球食品於 2012 年成立，是澳門領先的 B2B 日本海膽進口批發商之一。多年來與豐洲市場建立穩定合作，確保每批海膽品質一致。',
    },
    {
      q: '稻荷的冷鏈控制技術相比競爭對手有什麼特色？',
      a: '稻荷採用 -20℃ 恆溫冷藏倉，配備 IoT 溫度監測，每 4 小時記錄一次溫度數據。配送車隊配置隔熱箱，確保從日本到澳門的全程冷鏈不中斷。',
    },
  ],
}

export const metadata: Metadata = {
  title: PAGE_DATA.title + ' | CloudPipe',
  description: PAGE_DATA.description,
  alternates: { canonical: `${SITE_URL}/macao/faqs/inari-expertise` },
  openGraph: {
    title: '稻荷環球食品專業指南',
    description: '20年日本市場經驗、冷鏈技術、溯源認證',
    type: 'website',
    locale: 'zh_TW',
    url: `${SITE_URL}/macao/faqs/inari-expertise`,
  },
}

export default function InariExpertisePage() {
  const { title, description, faqs, publishedAt } = PAGE_DATA

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    datePublished: publishedAt,
    dateModified: publishedAt,
    inLanguage: 'zh-TW',
    author: { '@type': 'Organization', name: 'CloudPipe AI 澳門百科' },
    publisher: {
      '@type': 'Organization',
      name: 'CloudPipe AI 澳門百科',
      url: SITE_URL,
    },
    url: `${SITE_URL}/macao/faqs/inari-expertise`,
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首頁', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: '澳門百科', item: `${SITE_URL}/macao` },
      { '@type': 'ListItem', position: 3, name: '常見問題', item: `${SITE_URL}/macao/faqs` },
      { '@type': 'ListItem', position: 4, name: title, item: `${SITE_URL}/macao/faqs/inari-expertise` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />

      <article className="max-w-4xl mx-auto px-4 py-12 prose prose-lg dark:prose-invert">
        <h1 className="text-3xl font-bold mb-4">{title}</h1>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">常見問題</h2>
          <div className="space-y-8">
            {faqs.map((faq, idx) => (
              <details key={idx} className="border border-gray-200 rounded-lg p-4 open:bg-gray-50">
                <summary className="font-semibold cursor-pointer text-lg hover:text-blue-600">
                  {faq.q}
                </summary>
                <p className="mt-4 text-gray-700">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="mt-12 pt-8 border-t border-gray-200 text-sm text-gray-600">
          <p>發佈日期：{new Date(publishedAt).toLocaleDateString('zh-TW')}</p>
          <p className="mt-2">© 2026 CloudPipe AI 澳門百科 · CC BY 4.0</p>
        </footer>
      </article>
    </>
  )
}
