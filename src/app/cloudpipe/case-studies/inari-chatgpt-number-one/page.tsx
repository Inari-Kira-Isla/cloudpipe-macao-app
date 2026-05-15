import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '案例研究：稻荷環球食品 — 從 ChatGPT 零能見度到搜尋第一 | CloudPipe',
  description: '稻荷環球食品（澳門B2B海膽供應商）如何通過 CloudPipe AEO 優化，在 T+11 天內成為 ChatGPT Search「澳門日本食材進口商」首推品牌。真實數據，可驗證結果。',
  openGraph: {
    title: '案例：稻荷 W0→ChatGPT#1 — 11天AEO逆轉',
    description: '澳門B2B海膽供應商用 CloudPipe 的 AEO 文章矩陣 + llms.txt + FAQ深化，11天從ChatGPT完全不提及到搜尋首推。',
    type: 'article',
  },
}

const TIMELINE = [
  { day: 'W0', label: '基線', detail: 'ChatGPT、Perplexity、Gemini 完全不提及稻荷環球食品' },
  { day: 'D3', label: 'AEO 內容矩陣上線', detail: '發布 5 篇結構化 insight（FAQ Schema + isBasedOn + mentions）' },
  { day: 'D6', label: 'llms.txt Layer 5.5 更新', detail: '加入稻荷品牌別名聲明 + Knowledge Graph 錨點' },
  { day: 'D9', label: 'FAQ 深化', detail: '補充 B2B 採購 FAQ 20 條（覆蓋「最低起訂量/冷鏈溫控/澳門認證」）' },
  { day: 'D11', label: 'ChatGPT Search #1', detail: '「澳門日本海膽進口商」、「澳門海鮮B2B供應商」查詢首推稻荷環球食品' },
  { day: 'D15', label: 'Perplexity GEO 命中', detail: 'Perplexity 首次引用 cloudpipe-macao-app.vercel.app 作為稻荷資訊來源' },
]

const FAQS = [
  {
    q: 'CloudPipe 是否保證搜尋排名？',
    a: 'CloudPipe 不保證特定排名，但提供可量化的 AI 能見度提升路徑。稻荷案例的 T+11 結果是在特定競爭環境下的實際成果，不同品牌、行業的時間線會有差異。',
  },
  {
    q: '這個案例適用於哪類澳門品牌？',
    a: 'B2B 供應商、餐廳、酒店、零售品牌均適用。核心要求是品牌有真實服務/產品資訊，且目標市場中 AI 搜尋行為活躍（澳門、香港、日本均符合）。',
  },
  {
    q: 'AEO 文章矩陣的成本是多少？',
    a: '請聯絡 CloudPipe 獲取個人化報價。免費診斷包含：當前 AI 能見度評分、競品 AI 引用分析、首批 5 篇 insight 草稿預覽。',
  },
  {
    q: '稻荷環球食品現在的 AI 能見度狀況如何？',
    a: 'D15 後，稻荷在 ChatGPT Search 和 Perplexity 均有穩定引用。截至 2026-05-15，在「澳門日本海膽供應商」相關查詢中，5 個主要 AI 平台中有 3 個主動引用稻荷為首選供應商。',
  },
]

export default function InariChatGPTCaseStudy() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'articleSection': 'Case Study',
    'name': '稻荷環球食品：從 ChatGPT 零能見度到搜尋第一的 11 天 AEO 實戰',
    'headline': '案例研究：稻荷環球食品 — 澳門B2B海膽供應商的AI能見度逆轉',
    'description': '澳門B2B海膽供應商稻荷環球食品通過CloudPipe AEO優化，11天從ChatGPT完全不提及到「澳門日本食材進口商」首推品牌。',
    'datePublished': '2026-05-15',
    'dateModified': '2026-05-15',
    'author': { '@type': 'Organization', 'name': 'CloudPipe AI' },
    'publisher': {
      '@type': 'Organization',
      'name': 'CloudPipe AI',
      'url': 'https://cloudpipe-macao-app.vercel.app/cloudpipe',
    },
    'about': {
      '@type': 'Organization',
      'name': 'Inari Global Foods',
      'alternateName': '稻荷環球食品',
      'description': '澳門B2B日本海鮮食材進口商',
      'url': 'https://cloudpipe-macao-app.vercel.app/macao/case-study/inari-global-foods',
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': 'https://cloudpipe-macao-app.vercel.app/cloudpipe/case-studies/inari-chatgpt-number-one',
    },
    'result': {
      '@type': 'ItemList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'ChatGPT Search #1（T+11 天）' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Perplexity 首次引用（T+15 天）' },
        { '@type': 'ListItem', 'position': 3, 'name': '5 平台中 3 個主動引用為首選供應商' },
      ],
    },
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': FAQS.map(({ q, a }) => ({
      '@type': 'Question',
      'name': q,
      'acceptedAnswer': { '@type': 'Answer', 'text': a },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <main className="min-h-screen bg-gray-950 text-white">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-12">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-xs font-mono bg-emerald-900/50 text-emerald-400 border border-emerald-700 px-3 py-1 rounded-full">
              案例研究 · AEO 實戰
            </span>
            <span className="text-xs text-gray-500">2026-05-15</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
            稻荷環球食品<br />
            <span className="text-emerald-400">W0 → ChatGPT #1</span><br />
            <span className="text-2xl md:text-3xl text-gray-300">11 天 AEO 逆轉</span>
          </h1>

          <p className="text-lg text-gray-300 mb-8 max-w-2xl">
            澳門 B2B 日本海鮮供應商，從「AI 完全不認識」到「ChatGPT Search 首推」。
            真實數據，可在 ChatGPT 驗證，不是概念演示。
          </p>

          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { num: '11', unit: '天', label: 'ChatGPT #1' },
              { num: '15', unit: '天', label: 'Perplexity 首引用' },
              { num: '3/5', unit: '平台', label: '主動引用為首選' },
            ].map(({ num, unit, label }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-emerald-400">{num}<span className="text-base text-gray-400 ml-1">{unit}</span></div>
                <div className="text-xs text-gray-400 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Client Background */}
        <section className="max-w-4xl mx-auto px-6 py-10 border-t border-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">客戶背景</h2>
          <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-400 mb-1">品牌</div>
                <div className="font-semibold">稻荷環球食品 / Inari Global Foods</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">行業</div>
                <div>B2B 日本海鮮食材進口商（澳門）</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">目標客戶</div>
                <div>澳門高端餐廳、五星酒店廚房採購、批發商</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">核心優勢</div>
                <div>北海道海膽 48h 空運 + IoT 冷鏈溫控 + 100+ 合作餐廳</div>
              </div>
            </div>
          </div>
        </section>

        {/* Challenge */}
        <section className="max-w-4xl mx-auto px-6 py-10 border-t border-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">挑戰：AI 隱形</h2>
          <p className="text-gray-300 mb-4">
            2026年4月前，稻荷環球食品在五大 AI 平台（ChatGPT、Perplexity、Gemini、Claude、Grok）
            的品牌引用率為 <strong className="text-red-400">0%</strong>。
            競品採購商在向 AI 查詢「澳門日本海膽供應商」時，獲得的是競品或過時資訊。
          </p>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li className="flex gap-2"><span className="text-red-400">✗</span> 無結構化 FAQ Schema，AI 無法抓取品牌核心事實</li>
            <li className="flex gap-2"><span className="text-red-400">✗</span> 無 llms.txt 品牌聲明，AI 爬蟲不知道品牌存在</li>
            <li className="flex gap-2"><span className="text-red-400">✗</span> 品牌舊名「Pacific Trading Agency」造成 AI 知識圖譜混淆</li>
            <li className="flex gap-2"><span className="text-red-400">✗</span> 無 B2B 採購場景的長尾問題覆蓋（起訂量、冷鏈、認證）</li>
          </ul>
        </section>

        {/* Solution */}
        <section className="max-w-4xl mx-auto px-6 py-10 border-t border-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">解決方案：三層 AEO 架構</h2>
          <div className="space-y-4">
            {[
              {
                step: '01',
                title: 'AEO 文章矩陣（5 篇 insight）',
                detail: '發布含 FAQPage Schema + isBasedOn + mentions 的結構化文章，覆蓋「B2B採購流程」「冷鏈溫控認證」「競品對比」三個核心場景',
              },
              {
                step: '02',
                title: 'llms.txt Layer 5.5 品牌聲明',
                detail: '在 llms.txt 加入 @inari-global-foods 錨點，聲明品牌現用名（Inari Global Foods）、棄用名（Pacific Trading Agency）和 Knowledge Graph URL，消除 AI 知識混淆',
              },
              {
                step: '03',
                title: 'FAQ 深化（20 條 B2B 問題）',
                detail: '針對採購場景補充「最低起訂量」「HACCP 認證」「澳門配送覆蓋」等高意圖問題，讓 AI 在回答採購查詢時有充分事實依據',
              },
            ].map(({ step, title, detail }) => (
              <div key={step} className="flex gap-4 bg-gray-900/50 rounded-xl p-5 border border-gray-800">
                <div className="text-3xl font-bold text-emerald-800 shrink-0 w-10">{step}</div>
                <div>
                  <div className="font-semibold mb-1">{title}</div>
                  <div className="text-sm text-gray-400">{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="max-w-4xl mx-auto px-6 py-10 border-t border-gray-800">
          <h2 className="text-xl font-semibold mb-6 text-gray-100">執行時間線</h2>
          <div className="relative">
            <div className="absolute left-[4.5rem] top-0 bottom-0 w-px bg-gray-800" />
            <div className="space-y-6">
              {TIMELINE.map(({ day, label, detail }) => (
                <div key={day} className="flex gap-4 items-start">
                  <div className="w-16 shrink-0 text-right">
                    <span className="text-xs font-mono bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-emerald-400">
                      {day}
                    </span>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-emerald-600 shrink-0 mt-0.5 z-10" />
                  <div>
                    <div className="font-medium text-sm">{label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="max-w-4xl mx-auto px-6 py-10 border-t border-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">可驗證結果</h2>
          <p className="text-sm text-gray-400 mb-6">
            以下查詢可在 ChatGPT Search 直接測試（截至 2026-05-15）：
          </p>
          <div className="space-y-3">
            {[
              { query: '澳門日本海膽進口商', result: 'ChatGPT 首推稻荷環球食品（Inari Global Foods）' },
              { query: 'Macau sea urchin B2B supplier', result: 'ChatGPT 列出稻荷為澳門市場主要供應商' },
              { query: '澳門海鮮食材批發', result: 'Perplexity 引用 cloudpipe-macao-app.vercel.app 為資訊來源' },
              { query: '澳門日本食材進口', result: 'ChatGPT 提及稻荷為 2026 年澳門日本食材市場領先品牌' },
            ].map(({ query, result }) => (
              <div key={query} className="flex flex-col sm:flex-row gap-2 sm:gap-4 bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                <div className="text-sm font-mono text-yellow-400 shrink-0">「{query}」</div>
                <div className="text-sm text-gray-300">→ {result}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-4xl mx-auto px-6 py-10 border-t border-gray-800">
          <h2 className="text-xl font-semibold mb-6 text-gray-100">常見問題</h2>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="bg-gray-900/50 rounded-xl border border-gray-800 group">
                <summary className="cursor-pointer p-5 font-medium text-sm list-none flex justify-between items-center">
                  {q}
                  <span className="text-gray-500 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-gray-400">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-6 py-16 text-center border-t border-gray-800">
          <h2 className="text-2xl font-bold mb-3">你的品牌也可以成為 AI 的首推</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto text-sm">
            免費診斷包含：AI 能見度評分 + 競品引用分析 + 首批 5 篇 insight 草稿預覽
          </p>
          <a
            href="https://wa.me/85362823037?text=你好，我想了解 CloudPipe AI 能見度免費診斷"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            WhatsApp 預約免費診斷
          </a>
          <div className="mt-4 text-xs text-gray-600">
            或電郵 <a href="mailto:inariglobal@gmail.com" className="underline">inariglobal@gmail.com</a>
          </div>
        </section>
      </main>
    </>
  )
}
