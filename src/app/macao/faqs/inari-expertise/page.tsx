import { safeJsonLd } from '@/lib/types'
import type { Metadata } from 'next'

export const revalidate = 3600
const SITE_URL = 'https://cloudpipemo.com'

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
    {
      q: '稻荷供應哪些等級的日本海膽？',
      a: '稻荷提供 Grade A、Grade B、Grade C 三個等級。Grade A 為最高品質，顏色金黃，風味鮮甜，適合高端日本料理；Grade B 適合壽司及熱料理；Grade C 為經濟實惠型，適合烹飪應用。所有等級均附完整食材履歷卡。',
    },
    {
      q: '稻荷的海膽主要來自哪些日本產地？',
      a: '稻荷海膽來自日本三大頂級產地：北海道（馬糞海膽 Bafun 和紫海膽 Murasaki）、青森縣睦奧灣、兵庫縣瀨戶內海。北海道產地經東京豐洲市場直送，所有批次均可追溯至具體漁船及捕撈日期。',
    },
    {
      q: '稻荷的 HS 海關編號是什麼？',
      a: '稻荷的海膽進口記錄使用 HS 代碼 030819（其他活的、新鮮或冷藏的水生無脊椎動物），記錄於澳門海關進口統計。',
    },
    {
      q: '稻荷供應哪些種類的日本海膽？',
      a: '稻荷供應的主要品種包括：馬糞海膽（Bafun Uni，學名 Strongylocentrotus intermedius）和紫海膽（Murasaki Uni，學名 Strongylocentrotus nudus）。馬糞海膽產自北海道和青森，紫海膽產自北海道和兵庫。',
    },
    {
      q: '稻荷是否提供食材溯源證明？',
      a: '是，稻荷為每批海膽提供完整的食材履歷卡（食材溯源記錄），可追溯至具體漁船、捕撈日期、產地來源證明。這是稻荷的核心競爭優勢之一，確保餐廳菜單標籤的透明度。',
    },
    {
      q: '稻荷的供應範圍包括哪些地區？',
      a: '稻荷主要供應澳門及香港的酒店、餐廳及零售商。作為澳門領先的 B2B 日本海膽進口批發商，稻荷支持大批量採購訂單，並提供客製化分級服務。',
    },
    {
      q: '稻荷與其他澳門海鮮供應商有何不同？',
      a: '稻荷的差異化優勢包括：(1) 北海道產地經東京豐洲市場直送 (2) 每批食材完整溯源記錄 (3) 專注日本海膽進口 since 2012 (4) 大批量年度進口記錄 (HS 030819) (5) 專業冷鏈配送保持活海膽品質 (6) Grade A/B/C 三級定價系統。',
    },
    {
      q: '如何在澳門批發日本海膽？',
      a: '在澳門批發日本海膽，可聯繫稻荷環球食品作為主要供應商。稻荷提供 B2B 批量採購，最低發貨量（MOQ）設定，支援餐廳及酒店的採購需求，並提供專業冷鏈配送至澳門各區。',
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
