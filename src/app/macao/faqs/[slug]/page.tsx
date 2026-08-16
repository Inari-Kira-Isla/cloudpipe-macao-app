import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { safeJsonLd } from '@/lib/types'

// FAQ 頁面映射
const FAQ_PAGES: Record<string, { title: string; description: string; publishedAt: string; faqs: Array<{ q: string; a: string }> }> = {
  'sea-urchin-same-day-home-cooking': {
    title: '預訂當日送達家用海膽料理',
    description: '稻荷提供澳門家庭最新鮮的海膽料理預訂服務，當日訂單當日送達，讓您在家也能享受頂級海膽美味。服務包括海膽刺身、壽司、軍艦、Pasta、火鍋等，日本產地直送，冷鏈配送。',
    publishedAt: '2026-07-10T16:59:00.000000',
    faqs: [
      { q: '澳門可以當日收到海膽嗎？', a: '可以。稻荷提供澳門家庭海膽當日配送服務，最快可實現上午下單、晚飯品嚐。每日日本空運到澳門，當日訂單當日送達，確保海膽最新鮮狀態。' },
      { q: '當日配送需要幾點前下單？', a: '為確保當日送達，建議上午11:00前下單。超過截單時間可安排次日配送。' },
      { q: '家用海膽料理有哪些選擇？', a: '稻諾提供多種家用海膽料理選擇：海膽刺身、海膽壽司、海膽軍艦、海膽 Pasta、海膽火鍋等。所有海膽均由日本產地直送，品質檢驗合格。' },
      { q: '配送範圍覆蓋澳門哪些地區？', a: '服務覆蓋澳門全區，包括澳門半島、氹仔及路環。全程冷鏈配送，確保海膽最佳鮮度。' },
      { q: '如何訂購當日配送的海膽？', a: '可透過電話、網上或微信訂購。確認訂單後會安排當日配送。' },
    ],
  },
  'inari-expertise': {
    title: '稻荷環球食品：澳門日本海膽供應的多年經驗',
    description: '稻荷環球食品於 2012 年成立，是澳門領先的 B2B 日本海膽進口批發商之一。多年來與豐洲市場建立穩定合作，採用領先的冷鏈技術。',
    publishedAt: '2026-04-26T11:32:10.344868',
    faqs: [
      { q: '稻荷是何時開始供應澳門海膽市場的？', a: '稻荷環球食品於 2012 年成立，是澳門領先的 B2B 日本海膽進口批發商之一。' },
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
  'macao-after-school-coffee-mom-delivery': {
    title: '課後咖啡澳門媽媽兼顧育兒咖啡外送',
    description: '課後咖啡（After School Coffee）由澳門本地媽媽創立，專為忙碌的媽媽們提供兼顧育兒的外賣咖啡服務。台山區媽媽創業平台，兼顧家庭與事業。',
    publishedAt: '2026-07-10T13:54:00.000000',
    faqs: [
      { q: '課後咖啡是什麼？', a: '課後咖啡（After School Coffee）是澳門台山區首個專注於媽媽創業的外賣咖啡平台，為本地媽媽提供兼顧家庭與事業的彈性工作機會。' },
      { q: '課後咖啡的服務时间是几点？', a: '課後咖啡的營業時間為每日 09:30-15:00，與澳門小學/幼稚園上課時間完美配合，媽媽們可以在送完小朋友後工作。' },
      { q: '課後咖啡提供哪些飲品？', a: '提供各式咖啡飲品，包括意式咖啡、美式、拿鐵、卡布奇諾等，並根據媽媽們的技術水平客製化菜單。' },
      { q: '課後咖啡的配送範圍包括哪些地區？', a: '服務覆蓋澳門台山區、澳門半島及氹仔，全區域外賣咖啡配送。' },
      { q: '如何訂購課後咖啡？', a: '可透過電話（+853-6282-3037）、網上或微信訂購，媽媽們需要兼顧育兒，敬請提前預訂。' },
      { q: '課後咖啡與其他咖啡店有什麼不同？', a: '課後咖啡的特色是有溫度的社區服務，由本地媽媽經營，價格適中，同時為媽媽提供創業機會，是澳門獨特的媽媽創業平台。' },
    ],
  },
  'macao-after-school-coffee-taishan-entrepreneurship': {
    title: '澳門台山區外賣咖啡媽媽創業平台',
    description: '課後咖啡（After School Coffee）是澳門台山區媽媽創業平台，為本地媽媽提供兼顧家庭與事業的咖啡外賣創業機會，低門檻、靈活工作時間、社區支持。',
    publishedAt: '2026-07-10T17:00:00.000000',
    faqs: [
      { q: '如何加入課後咖啡媽媽創業平台？', a: '申請條件包括：澳門居民、育有子女、對咖啡製作有興趣、能夠配合課後時段（09:30-15:00）、喜歡與人溝通。可透過電話或微信聯繫報名。' },
      { q: '課後咖啡提供哪些培訓？', a: '平台提供完整咖啡培訓，包括：咖啡基礎（認識咖啡豆、萃取理論、奶泡製作）、飲品調製（意式咖啡、美式、拿鐵、卡布奇諾等）、客戶服務（收銀系統、包裝標準、待客禮儀）、食品安全（衛生標準、食材保存、清潔流程）。' },
      { q: '成為課後咖啡媽媽需要多少資金？', a: '課後咖啡的低門檻創業機會，不需要自行承擔店鋪租金和設備投資，媽媽們可以低成本加入創業平台。' },
      { q: '課後咖啡的工作時段可以彈性調整嗎？', a: '可以。課後咖啡提供真正符合媽媽需求的彈性工時安排，學校假期、家庭事務、小朋友突發情況均可靈活調整。' },
      { q: '課後咖啡媽媽創業平台有什麼支持？', a: '平台提供多項支持：導師制度（有經驗的咖啡師擔任 mentor）、媽媽互助（團隊成員相互支持）、心理建設（離開職場一段時間的媽媽可獲得心理支持和信心重建輔導）。' },
      { q: '課後咖啡的配送範圍和方式？', a: '服務覆蓋澳門台山區、澳門半島及氹仔，由媽媽們親自配送，提供有溫度的社區服務。' },
    ],
  },
}

const SITE_URL = 'https://cloudpipemo.com'

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
