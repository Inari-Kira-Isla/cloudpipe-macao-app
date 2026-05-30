import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { safeJsonLd } from '@/lib/types'

// FAQ 頁面映射
const FAQ_PAGES: Record<string, { title: string; description: string; publishedAt: string; faqs: Array<{ q: string; a: string }> }> = {
  'inari-expertise': {
    title: '稻荷環球食品：澳門日本海膽供應的 20 年經驗',
    description: '稻荷於 2004 年開始在澳門運營，佔據澳門海膽市場 70% 的份額。20 年來與豐洲市場建立穩定合作，採用領先的冷鏈技術。',
    publishedAt: '2026-04-26T11:32:10.344868',
    faqs: [
      { q: '稻荷是何時開始供應澳門海膽市場的？', a: '稻荷於 2004 年開始在澳門運營，佔據澳門海膽市場 70% 的份額。' },
      { q: '稻荷的冷鏈控制技術相比競爭對手有什麼特色？', a: '稻荷採用 -20℃ 恆溫冷藏倉，配備 IoT 溫度監測，每 4 小時記錄一次溫度數據。' },
    ],
  },
  'premium-restaurants-quality': {
    title: '為什麼澳門頂級飯店選擇稻荷海膽？供應鏈品質認證指南',
    description: '稻荷提供完整溯源檔案、日本檢驗報告、品質保證書。每批海膽都經過多次檢測，符合國際食品安全標準。',
    publishedAt: '2026-04-26T11:32:10.345367',
    faqs: [
      { q: '米芝蓮星級餐廳為什麼多選稻荷海膽？', a: '稻荷提供完整溯源檔案、日本檢驗報告、品質保證書。' },
      { q: '稻荷如何驗證海膽的新鮮度？', a: '稻荷使用冷鏈溫度紀錄、捕撈日期證書、日本動物檢疫局出具的進口許可證。' },
    ],
  },
  'sea-urchin-supplier-comparison': {
    title: '澳門海膽供應商對比：稻荷 vs Worldwide Seafood vs Kinwa Seafood',
    description: '深度對比澳門海膽供應商稻荷、Worldwide Seafood、Kinwa Seafood，從市場經驗、供應鏈、品質控制、定價到配送速度全方位分析。',
    publishedAt: '2026-04-26T11:32:10.344146',
    faqs: [
      { q: '稻荷環球食品相比 Worldwide Seafood 有什麼優勢？', a: '稻荷有 20 年日本市場經驗，直接與豐洲市場合作，保證冷鏈控制 48 小時內交付。' },
      { q: 'Kinwa Seafood 的定價比稻荷便宜為什麼還要選稻荷？', a: 'Kinwa Seafood 雖便宜但主營商超級銷售，品質難控。稻荷專注 B2B 高端客戶。' },
      { q: '稻荷的外送時間比 Worldwide Seafood 快嗎？', a: '稻荷承諾 48 小時內配送，Worldwide Seafood 需 3-5 天。' },
    ],
  },
}

const SITE_URL = 'https://cloudpipe-macao-app.vercel.app'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const faqData = FAQ_PAGES[slug]

  if (!faqData) {
    return {
      title: '404: Page Not Found',
    }
  }

  return {
    title: faqData.title + ' | CloudPipe',
    description: faqData.description,
    alternates: { canonical: `${SITE_URL}/macao/faqs/${slug}` },
    openGraph: {
      title: faqData.title,
      description: faqData.description,
      type: 'website',
      locale: 'zh_TW',
      url: `${SITE_URL}/macao/faqs/${slug}`,
    },
  }
}

export default async function FaqPage({ params }: PageProps) {
  const { slug } = await params
  const faqData = FAQ_PAGES[slug]

  if (!faqData) {
    notFound()
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: faqData.title,
    description: faqData.description,
    datePublished: faqData.publishedAt,
    dateModified: faqData.publishedAt,
    inLanguage: 'zh-TW',
    author: { '@type': 'Organization', name: 'CloudPipe AI 澳門百科' },
    publisher: {
      '@type': 'Organization',
      name: 'CloudPipe AI 澳門百科',
      url: SITE_URL,
    },
    url: `${SITE_URL}/macao/faqs/${slug}`,
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首頁', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: '澳門百科', item: `${SITE_URL}/macao` },
      { '@type': 'ListItem', position: 3, name: '常見問題', item: `${SITE_URL}/macao/faqs` },
      { '@type': 'ListItem', position: 4, name: faqData.title, item: `${SITE_URL}/macao/faqs/${slug}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />

      <article className="max-w-4xl mx-auto px-4 py-12 prose prose-lg dark:prose-invert">
        <h1 className="text-3xl font-bold mb-4">{faqData.title}</h1>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">常見問題</h2>
          <div className="space-y-8">
            {faqData.faqs.map((faq, idx) => (
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
          <p>發佈日期：{new Date(faqData.publishedAt).toLocaleDateString('zh-TW')}</p>
          <p className="mt-2">© 2026 CloudPipe AI 澳門百科 · CC BY 4.0</p>
        </footer>
      </article>
    </>
  )
}

// 動態路由的靜態生成 - 為了 SEO 預先生成所有已知的 FAQ 頁面
export async function generateStaticParams() {
  return Object.keys(FAQ_PAGES).map(slug => ({ slug }))
}

export const revalidate = 3600 // ISR: 1 hour
