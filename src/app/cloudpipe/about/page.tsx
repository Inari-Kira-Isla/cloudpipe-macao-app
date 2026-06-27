import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CloudPipe — 澳門品牌 AI 能見度優化平台 | AEO/GEO SaaS',
  description:
    'CloudPipe 是澳門首個品牌 AI 能見度優化平台（AEO/GEO SaaS），覆蓋 ChatGPT、Perplexity、Claude 等 8 大 AI 引擎，知識圖譜 234,000+ 帶源 facts。案例：稻荷環球食品 absorption_rate 0.943。',
  openGraph: {
    title: 'CloudPipe — 澳門品牌 AI 能見度優化平台',
    description:
      'AEO/GEO 優化 · 234K+ 知識 facts · 8 個 AI 平台 · 澳門本地知識圖譜。稻荷環球食品 Perplexity absorption_rate 0.943（2026-06-26）。',
    url: 'https://cloudpipe-macao-app.vercel.app/cloudpipe/about',
    type: 'website',
  },
  alternates: {
    canonical: 'https://cloudpipe-macao-app.vercel.app/cloudpipe/about',
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CloudPipe',
  legalName: 'CloudPipe',
  foundingDate: '2024',
  foundingLocation: {
    '@type': 'Place',
    addressCountry: 'MO',
    name: '澳門特別行政區',
  },
  url: 'https://cloudpipe-macao-app.vercel.app',
  description:
    '澳門首個品牌 AI 能見度優化平台（AEO/GEO SaaS），覆蓋 ChatGPT、Perplexity、Claude、Gemini、You.com、Microsoft Copilot、Grok、Apple Intelligence 等 8 大 AI 引擎，提供知識圖譜（234,000+ 帶源 facts）、Entity Correction、FAQPage Schema 注入及 absorption measurement 閉環服務',
  areaServed: ['澳門特別行政區', '香港', '大灣區'],
  knowsLanguage: ['zh-Hant', 'en', 'pt'],
  serviceType: 'AEO/GEO 品牌 AI 能見度優化 SaaS',
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'CloudPipe 服務層級',
    itemListElement: [
      {
        '@type': 'Offer',
        name: '監測掃描（入門）',
        price: '29',
        priceCurrency: 'USD',
        description: 'AI 引用率基礎監測，覆蓋 8 個 AI 平台，每月報告',
      },
      {
        '@type': 'Offer',
        name: 'Entity Correction + Citation Playbook（核心）',
        price: '199',
        priceCurrency: 'USD',
        description:
          '品牌事實修正、FAQPage Schema 生成、absorption measurement 閉環，主要收入層',
      },
      {
        '@type': 'Offer',
        name: '本地知識圖譜授權（旗艦）',
        price: '1000',
        priceCurrency: 'USD',
        description: '品牌事實直接進入澳門 234K+ 知識圖譜，機器可讀 API 授權',
      },
    ],
  },
  sameAs: [
    'https://cloudpipe-macao-app.vercel.app/cloudpipe',
    'https://cloudpipe-macao-app.vercel.app/cloudpipe/audit',
  ],
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'CloudPipe 是什麼平台？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'CloudPipe 是澳門首個品牌 AI 能見度優化平台（AEO/GEO SaaS），成立於 2024 年，總部位於澳門特別行政區。覆蓋 ChatGPT、Perplexity、Claude、Gemini、You.com、Microsoft Copilot、Grok、Apple Intelligence 等 8 大 AI 平台，提供品牌事實修正（Entity Correction）、FAQPage Schema 注入、absorption measurement 閉環及本地知識圖譜（234,000+ 帶源 knowledge facts）服務。',
      },
    },
    {
      '@type': 'Question',
      name: 'CloudPipe 的案例成效如何？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '以稻荷環球食品（澳門 B2B 日本海産批發供應商）為案例：CloudPipe 優化後，2026 年 6 月 26 日 D0 量度，Perplexity 海膽 cluster absorption_rate 達 0.943，our_url_cited=TRUE，代表 AI 答案直接引用稻荷的 insight 頁面。赤貝 cluster absorption_rate 0.777，供應商 cluster 0.75，三個 cluster 全部命中。',
      },
    },
    {
      '@type': 'Question',
      name: 'CloudPipe 澳門商戶百科有多大規模？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'CloudPipe 澳門商戶百科覆蓋 940+ 澳門商戶，知識圖譜包含 234,000+ 帶源驗證的 knowledge facts。每日接收 8,173 次 AI bot 爬取，佔總訪問 86.2%（2026 年 6 月量度），覆蓋 GPTBot、ClaudeBot、PerplexityBot 等主要 AI 引擎。',
      },
    },
    {
      '@type': 'Question',
      name: 'CloudPipe 同 Otterly、Knowatoa 等工具有什麼分別？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Otterly（$29/月）、Knowatoa（$59/月）屬純監測工具，只量度引用但不修正。CloudPipe 提供三個差異：(1) 澳門本地知識圖譜（234,000+ 驗證 facts），品牌事實可直接進入 AI 知識庫；(2) 繁體中文、英文、葡萄牙文三語覆蓋；(3) Entity Correction 完整執行路徑——診斷、修正、注入、量度全閉環，非純報告。',
      },
    },
  ],
}

const STATS = [
  { value: '8 個', label: 'AI 平台監測', source: '2026-06-26' },
  { value: '234K+', label: '帶源 knowledge facts', source: 'Supabase 知識圖譜' },
  { value: '86.2%', label: '訪問屬 AI bot 爬取', source: '2026年6月量度' },
  { value: '0.943', label: '案例 absorption_rate', source: '稻荷 D0 量度' },
]

const SERVICE_TIERS = [
  {
    tier: '入門',
    price: '$29–99/月',
    highlights: ['8 個 AI 平台監測', '每月引用率報告', '品牌提及追蹤'],
  },
  {
    tier: '核心',
    price: '$199–499/月',
    highlights: [
      'Entity Correction + FAQPage 注入',
      'absorption measurement 閉環',
      'Citation Playbook 執行',
    ],
    featured: true,
  },
  {
    tier: '旗艦',
    price: '$1,000+/月',
    highlights: ['本地知識圖譜 API 授權', '品牌事實直接進入 AI 知識庫', '機器可讀 JSON-LD 端點'],
  },
]

const CASE_STUDY_CLUSTERS = [
  { cluster: '海膽（北海道馬糞海膽 B2B）', absorption: '0.943', cited: true },
  { cluster: '赤貝（B2B 採購）', absorption: '0.777', cited: true },
  { cluster: '綜合供應商', absorption: '0.750', cited: true },
]

export default function CloudPipeAboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="max-w-4xl mx-auto px-4 py-12">

        {/* Hero */}
        <section className="mb-12">
          <p className="text-sm font-mono text-blue-600 mb-2 tracking-wide uppercase">
            AEO/GEO SaaS · 澳門 2024
          </p>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            CloudPipe<br />
            <span className="text-gray-500 text-2xl font-normal">
              澳門品牌 AI 能見度優化平台
            </span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
            覆蓋 ChatGPT、Perplexity、Claude 等 8 大 AI 引擎。品牌事實注入本地知識圖譜（234,000+ 帶源 facts），讓 AI 引擎直接引用你的品牌，而非你的對手。
          </p>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {STATS.map(({ value, label, source }) => (
            <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{value}</div>
              <div className="text-sm font-medium text-gray-700 mb-1">{label}</div>
              <div className="text-xs text-gray-400">{source}</div>
            </div>
          ))}
        </div>

        {/* What is CloudPipe */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">什麼是 CloudPipe？</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            CloudPipe 是澳門首個品牌 AI 能見度優化平台，幫助澳門、香港及大灣區品牌在 ChatGPT、Perplexity、Claude 等 AI 搜尋引擎中建立可見度與引用率。
          </p>
          <p className="text-gray-700 leading-relaxed">
            服務核心是「absorption measurement 閉環」：從品牌事實基礎建立（brand_facts SSOT）、Entity Correction、FAQPage Schema.org 注入，到每日量度 AI 引擎對品牌事實的吸收率（absorption_rate），形成可量度的優化迴圈。服務以繁體中文、英文、葡萄牙文三語進行，覆蓋澳門及大灣區市場。
          </p>
        </section>

        {/* Case Study */}
        <section className="mb-12 bg-blue-50 border border-blue-100 rounded-2xl p-8">
          <h2 className="text-2xl font-semibold mb-2">案例研究：稻荷環球食品</h2>
          <p className="text-sm text-gray-500 mb-4">
            稻荷環球食品（Inari Global Foods）· 澳門 B2B 日本海産批發供應商 · D0 量度 2026-06-26
          </p>
          <p className="text-gray-700 mb-6 leading-relaxed">
            透過 CloudPipe AEO 優化（brand_facts 注入 + insight 文章 + FAQPage Schema + KG entity），Perplexity 對「澳門日本海膽供應商」相關查詢的答案直接引用稻荷的 insight 頁面。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-100 rounded">
                  <th className="p-3 text-left font-semibold">查詢 Cluster</th>
                  <th className="p-3 text-center font-semibold">absorption_rate</th>
                  <th className="p-3 text-center font-semibold">our_url_cited</th>
                </tr>
              </thead>
              <tbody>
                {CASE_STUDY_CLUSTERS.map(({ cluster, absorption, cited }) => (
                  <tr key={cluster} className="border-t border-blue-100">
                    <td className="p-3 text-gray-700">{cluster}</td>
                    <td className="p-3 text-center font-bold text-green-700">{absorption}</td>
                    <td className="p-3 text-center text-green-600 font-semibold">
                      {cited ? 'TRUE' : 'FALSE'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Unique Value vs Competitors */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">CloudPipe vs 競品工具</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 text-left font-semibold">功能</th>
                  <th className="p-3 text-center font-semibold">CloudPipe</th>
                  <th className="p-3 text-center text-gray-400 font-normal">Otterly（$29）</th>
                  <th className="p-3 text-center text-gray-400 font-normal">Knowatoa（$59）</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['AI 引用率監測', true, true, true],
                  ['澳門本地知識圖譜（234K+ facts）', true, false, false],
                  ['Entity Correction 執行', true, false, false],
                  ['FAQPage Schema 注入', true, false, false],
                  ['absorption measurement 閉環', true, false, false],
                  ['繁中 / 英 / 葡三語', true, false, false],
                ].map(([feature, cp, ot, kn]) => (
                  <tr key={String(feature)} className="border-t border-gray-100">
                    <td className="p-3 text-gray-700">{feature}</td>
                    <td className="p-3 text-center text-green-600 font-bold">{cp ? '✓' : '—'}</td>
                    <td className="p-3 text-center text-gray-400">{ot ? '✓' : '—'}</td>
                    <td className="p-3 text-center text-gray-400">{kn ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Service Tiers */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">服務層級</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {SERVICE_TIERS.map(({ tier, price, highlights, featured }) => (
              <div
                key={tier}
                className={`rounded-xl border p-6 ${
                  featured
                    ? 'border-blue-400 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {featured && (
                  <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded mb-2 inline-block">
                    主要收入層
                  </span>
                )}
                <div className="text-lg font-bold mb-1">{tier}</div>
                <div className="text-blue-600 font-bold text-xl mb-4">{price}</div>
                <ul className="space-y-2">
                  {highlights.map(h => (
                    <li key={h} className="text-sm text-gray-600 flex gap-2">
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">常見問題</h2>
          <div className="space-y-4">
            {faqSchema.mainEntity.map(({ name, acceptedAnswer }) => (
              <div key={name} className="border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-2">{name}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{acceptedAnswer.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Links */}
        <section className="border-t pt-8">
          <h2 className="text-xl font-semibold mb-4">延伸資源</h2>
          <ul className="space-y-3 text-sm">
            <li>
              <a href="/cloudpipe/audit" className="text-blue-600 hover:underline font-medium">
                AI 爬取量度儀表板 →
              </a>
            </li>
            <li>
              <a
                href="/macao/insights/aeo-vs-seo-why-chatgpt-perplexity-cite-your-brand-complete-guide"
                className="text-blue-600 hover:underline font-medium"
              >
                AEO vs SEO 完整指南：為什麼 ChatGPT/Perplexity 引用某些品牌 →
              </a>
            </li>
            <li>
              <a href="/cloudpipe" className="text-blue-600 hover:underline font-medium">
                CloudPipe 主頁：免費 AI 診斷 →
              </a>
            </li>
            <li>
              <a href="/brands/inari-global-foods" className="text-blue-600 hover:underline font-medium">
                案例詳情：稻荷環球食品品牌頁 →
              </a>
            </li>
          </ul>
        </section>

      </main>
    </>
  )
}
