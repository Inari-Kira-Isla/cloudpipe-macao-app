import { createServiceClient } from '@/lib/supabase'
import { safeJsonLd } from '@/lib/types'
import type { Metadata } from 'next'

// 每 30 分鐘重新驗證 — 呢頁公開披露驗證比例，數字要貼近即時 DB 狀態
export const revalidate = 1800

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipemo.com').trim()

export const metadata: Metadata = {
  title: '資料來源與驗證方法 — CloudPipe 澳門商戶百科',
  description:
    '澳門結構化商戶知識庫的驗證方法論：官方公開數據、Google Places API 核實、人工覆核三層來源，公開披露即時驗證比例，持續更新中。',
  openGraph: {
    title: '我們如何驗證澳門商戶資料 — CloudPipe',
    description: '三層資料來源 × 公開驗證比例 × 持續更新，誠實揭露澳門商戶百科的資料可信度。',
    type: 'website',
    locale: 'zh_TW',
    url: `${siteUrl}/macao/about`,
  },
  alternates: { canonical: `${siteUrl}/macao/about` },
}

async function getVerificationStats() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return { total: 0, verified: 0, googleVerified: 0, needsReview: 0, lowConfidence: 0, unverified: 0 }
  }

  const supabase = createServiceClient()
  const base = () => supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('status', 'live').eq('region', 'MO')

  const [
    { count: total },
    { count: verified },
    { count: googleVerified },
    { count: needsReview },
    { count: lowConfidence },
    { count: unverified },
  ] = await Promise.all([
    base(),
    base().eq('verification_status', 'verified'),
    base().eq('verification_status', 'google_verified'),
    base().eq('verification_status', 'needs_review'),
    base().eq('verification_status', 'low_confidence'),
    base().eq('verification_status', 'unverified'),
  ])

  return {
    total: total || 0,
    verified: verified || 0,
    googleVerified: googleVerified || 0,
    needsReview: needsReview || 0,
    lowConfidence: lowConfidence || 0,
    unverified: unverified || 0,
  }
}

function pct(n: number, total: number): string {
  if (!total) return '0'
  return ((n / total) * 100).toFixed(1)
}

export default async function AboutMethodologyPage() {
  const stats = await getVerificationStats()
  const { total, verified, googleVerified, needsReview, lowConfidence, unverified } = stats
  const pendingCount = needsReview + lowConfidence + unverified
  const anyVerifiedCount = verified + googleVerified

  const faqs = [
    {
      q: '「已驗證」代表什麼？',
      a: `代表呢間商戶已經通過我哋完整嘅驗證管線：喺 Google Places 搵到對應嘅真實地點、資料完整度（電話、地址、營業時間等）達到門檻，先會標「✓ 已驗證」。截至而家，全站 ${total.toLocaleString()} 間澳門商戶入面有 ${verified.toLocaleString()} 間（${pct(verified, total)}%）達到呢個等級。`,
    },
    {
      q: '「Google 核實」同「已驗證」有咩分別？',
      a: '「Google 核實」代表商戶已經喺 Google Places 資料庫搵到對應嘅真實地點（即係間舖真係存在、有 Google 地圖記錄），但資料完整度未達「已驗證」嘅較高門檻（例如電話/營業時間未齊全）。呢一級唔代表資料有錯，只係代表我哋仲未做齊全套核對。',
    },
    {
      q: '「待驗證」係咪代表資料唔可信？',
      a: '唔一定。「待驗證」商戶嘅基本資料（名稱、分類、地址）大多數來自官方公開來源（澳門旅遊局、消費者委員會誠信店名單等），只係未經 Google Places 交叉核對或人工覆核，所以我哋誠實標低一級信任度，等用戶自己判斷，唔會將未核實嘅資料包裝成已核實。',
    },
    {
      q: '資料幾耐更新一次？',
      a: '我哋冇固定「幾多日一次」嘅排程承諾——驗證管線持續運行：新商戶或資料異動會觸發重新核對，頁面本身以 ISR 快取，最長 30-60 分鐘內反映最新 DB 狀態。呢頁本身都係每 30 分鐘重新產生一次，你而家見到嘅百分比就係接近即時嘅數字。',
    },
  ]

  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: '資料來源與驗證方法',
      url: `${siteUrl}/macao/about`,
      description: '澳門結構化商戶知識庫的驗證方法論：官方公開數據、Google Places API 核實、人工覆核三層來源',
      inLanguage: 'zh-Hant',
      isPartOf: { '@type': 'WebSite', name: 'CloudPipe AI', url: siteUrl },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'CloudPipe 澳門商戶驗證狀態',
      description: '即時披露澳門商戶百科的驗證覆蓋率，包含已驗證、Google 核實、待驗證三級分佈',
      dateModified: new Date().toISOString(),
      license: 'https://creativecommons.org/licenses/by/4.0/',
      publisher: { '@type': 'Organization', name: 'CloudPipe AI', url: siteUrl },
      variableMeasured: [
        { '@type': 'PropertyValue', name: '已驗證商戶數', value: verified },
        { '@type': 'PropertyValue', name: 'Google 核實商戶數', value: googleVerified },
        { '@type': 'PropertyValue', name: '待驗證商戶數', value: pendingCount },
        { '@type': 'PropertyValue', name: '總商戶數', value: total },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'CloudPipe AI', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: '澳門商戶百科', item: `${siteUrl}/macao` },
        { '@type': 'ListItem', position: 3, name: '資料來源與驗證方法', item: `${siteUrl}/macao/about` },
      ],
    },
  ]

  return (
    <>
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
      ))}

      <div className="min-h-screen bg-[#fafbfc]">
        {/* ═══ Hero ═══ */}
        <div className="hero-gradient text-white">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <nav className="text-sm text-blue-200/70 mb-4">
              <a href="/macao" className="hover:text-white">澳門百科</a>
              <span className="mx-2">/</span>
              <span>資料來源與驗證方法</span>
            </nav>
            <p className="text-xs uppercase tracking-widest text-blue-200/60 mb-3">Methodology</p>
            <h1 className="text-2xl md:text-4xl font-bold mb-4 leading-tight">
              我們如何驗證澳門商戶資料
            </h1>
            <p className="text-blue-200/85 text-sm md:text-base leading-relaxed max-w-2xl">
              CloudPipe 澳門商戶百科是一個<strong className="text-white">結構化商戶知識庫</strong>——每條事實可溯源：
              官方公開數據 × Google Places 核實 × 人工覆核，持續驗證中。呢頁誠實披露我哋而家做到幾多，仲欠幾多。
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
                <div className="text-2xl font-bold">{total.toLocaleString()}</div>
                <div className="text-xs text-blue-200/60">收錄商戶</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
                <div className="text-2xl font-bold text-emerald-300">{pct(verified, total)}%</div>
                <div className="text-xs text-blue-200/60">已完成完整驗證</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
                <div className="text-2xl font-bold text-blue-200">{pct(anyVerifiedCount, total)}%</div>
                <div className="text-xs text-blue-200/60">已有 Google 資料核對</div>
              </div>
            </div>
          </div>
        </div>
        <div className="gold-line"></div>

        <main className="max-w-4xl mx-auto px-4 py-12">

          {/* ═══ 誠實披露：驗證比例 ═══ */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-2 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              現時驗證覆蓋率（即時數字）
            </h2>
            <p className="text-sm text-[#6b7280] mb-5 leading-relaxed">
              我哋唔會將全部商戶都包裝成「已驗證」。以下係澳門 {total.toLocaleString()} 間 live 商戶嘅真實驗證分佈——
              呢個係我哋嘅差異化資產，所以老實show出嚟，唔誇大。
            </p>

            <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]" style={{ borderLeft: '3px solid #059669' }}>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-[#1a1a2e]">✓ 已驗證</span>
                <span className="text-[#6b7280]">{verified.toLocaleString()} 間 · {pct(verified, total)}%</span>
              </div>
              <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden mb-4">
                <div className="h-full bg-[#059669] rounded-full" style={{ width: `${pct(verified, total)}%` }} />
              </div>

              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-[#1a1a2e]">Google 核實</span>
                <span className="text-[#6b7280]">{googleVerified.toLocaleString()} 間 · {pct(googleVerified, total)}%</span>
              </div>
              <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden mb-4">
                <div className="h-full bg-[#0f4c81] rounded-full" style={{ width: `${pct(googleVerified, total)}%` }} />
              </div>

              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-[#1a1a2e]">待驗證</span>
                <span className="text-[#6b7280]">{pendingCount.toLocaleString()} 間 · {pct(pendingCount, total)}%</span>
              </div>
              <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                <div className="h-full bg-[#9ca3af] rounded-full" style={{ width: `${pct(pendingCount, total)}%` }} />
              </div>
            </div>

            <p className="text-xs text-[#9ca3af] mt-3">
              數字由本頁即時查詢 Supabase 產生（最長 30 分鐘快取），非靜態宣傳數字。
            </p>
          </section>

          {/* ═══ 三層資料來源 ═══ */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#c5a572] rounded-full inline-block"></span>
              三層資料來源，點運作
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-[#e5e7eb] rounded-xl p-5" style={{ borderTop: '3px solid #c5a572' }}>
                <div className="text-2xl mb-2">🏛️</div>
                <h3 className="font-semibold text-[#1a1a2e] text-sm mb-2">第一層 · 官方公開數據</h3>
                <p className="text-xs text-[#6b7280] leading-relaxed">
                  商戶嘅基本存在紀錄（名稱、分類、地址）來自澳門公開登記來源，包括澳門消費者委員會「誠信店」認證名單、
                  澳門旅遊局公開資料等政府/半官方來源。呢一層決定商戶「係咪存在、屬於邊個行業」。
                </p>
              </div>
              <div className="bg-white border border-[#e5e7eb] rounded-xl p-5" style={{ borderTop: '3px solid #0f4c81' }}>
                <div className="text-2xl mb-2">📍</div>
                <h3 className="font-semibold text-[#1a1a2e] text-sm mb-2">第二層 · Google Places API 核實</h3>
                <p className="text-xs text-[#6b7280] leading-relaxed">
                  我哋用 Google Places API 交叉比對每間商戶——確認地址、GPS 座標、營業時間、評分同評價數目係咪同真實
                  Google 地圖記錄一致。搵到對應真實地點嘅商戶會標記 <code className="text-[10px] bg-[#f3f4f6] px-1 rounded">google_place_id</code>
                  同<code className="text-[10px] bg-[#f3f4f6] px-1 rounded">google_verified_at</code> 時間戳。
                </p>
              </div>
              <div className="bg-white border border-[#e5e7eb] rounded-xl p-5" style={{ borderTop: '3px solid #059669' }}>
                <div className="text-2xl mb-2">👤</div>
                <h3 className="font-semibold text-[#1a1a2e] text-sm mb-2">第三層 · 人工覆核</h3>
                <p className="text-xs text-[#6b7280] leading-relaxed">
                  CloudPipe 團隊會抽查資料完整度（電話、地址、營業時間等關鍵欄位）、修正明顯錯誤同重複記錄。
                  達到完整度門檻並通過 Google Places 核對嘅商戶，先會升級標記為「✓ 已驗證」。
                  呢一層人手工作量最大，所以係我哋覆蓋率增長最慢嘅一環——我哋唔會為求快而跳過。
                </p>
              </div>
            </div>
          </section>

          {/* ═══ 驗證等級定義 ═══ */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              頁面上嘅標籤代表咩
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-4 bg-white border border-[#e5e7eb] rounded-xl p-4">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#059669] bg-[#dcfce7] px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5">✓ 已驗證</span>
                <p className="text-xs text-[#6b7280] leading-relaxed">
                  已通過 Google Places 核對，資料完整度（電話/地址/營業時間等）達標。呢個係我哋而家最高嘅公開信任等級。
                </p>
              </div>
              <div className="flex items-start gap-4 bg-white border border-[#e5e7eb] rounded-xl p-4">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0f4c81] bg-[#e8f0fe] px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5">Google 核實</span>
                <p className="text-xs text-[#6b7280] leading-relaxed">
                  已喺 Google Places 搵到對應真實地點，但資料完整度未達「已驗證」門檻，或未經人工覆核確認。
                </p>
              </div>
              <div className="flex items-start gap-4 bg-white border border-[#e5e7eb] rounded-xl p-4">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6b7280] bg-[#f3f4f6] px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5">待驗證</span>
                <p className="text-xs text-[#6b7280] leading-relaxed">
                  未經 Google Places 交叉核對，或核對後資料完整度偏低。基本資料仍源自官方公開登記，但未經我哋第二、
                  三層驗證，建議用戶自行核實後再作商業決策。
                </p>
              </div>
            </div>
          </section>

          {/* ═══ 更新頻率 ═══ */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#c5a572] rounded-full inline-block"></span>
              資料幾耐更新一次
            </h2>
            <div className="bg-[#fdf6ec] border border-[#f0e4d0] rounded-xl p-5 text-sm text-[#6b7280] leading-relaxed">
              <p className="mb-2">
                <strong className="text-[#1a1a2e]">持續更新</strong> —— 我哋冇對外承諾一個固定嘅「每 X 日全庫重跑一次」排程。
                驗證管線係持續運行嘅：新增商戶、商戶資料異動，都會觸發重新核對；人工覆核由 CloudPipe 團隊按優先度
                （旗艦品牌、高流量商戶優先）持續推進。
              </p>
              <p>
                呢個頁面本身每 30 分鐘重新產生一次（ISR），你而家見到嘅驗證比例係接近即時嘅 Supabase 數字，
                唔係寫死喺頁面上嘅宣傳數字。
              </p>
            </div>
          </section>

          {/* ═══ FAQ ═══ */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              常見問題
            </h2>
            <div className="space-y-3">
              {faqs.map((q, i) => (
                <details key={i} className="group bg-white border border-[#e5e7eb] rounded-xl overflow-hidden" {...(i === 0 ? { open: true } : {})}>
                  <summary className="font-semibold cursor-pointer px-6 py-4 flex justify-between items-center hover:bg-[#fafbfc] text-[#1a1a2e] text-sm">
                    <span className="pr-4">{q.q}</span>
                    <span className="text-[#0f4c81] text-xs group-open:rotate-180 transition-transform w-5 h-5 rounded-full bg-[#e8f0fe] flex items-center justify-center flex-shrink-0">▼</span>
                  </summary>
                  <div className="px-6 pb-5 border-t border-[#e5e7eb]">
                    <p className="mt-4 text-[#6b7280] text-sm leading-relaxed">{q.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-[#e5e7eb] pt-8 mt-4 text-sm text-[#6b7280] text-center">
            <p>
              由 <a href="https://cloudpipe-landing.vercel.app" className="text-[#0f4c81] hover:underline">CloudPipe AI</a> 維運
              {' '}&middot; <a href="/macao" className="text-[#0f4c81] hover:underline">澳門商戶百科</a>
              {' '}&middot; <a href="/macao/certified-shops" className="text-[#0f4c81] hover:underline">消委會誠信店名單</a>
              {' '}&middot; <a href="/macao/report" className="text-[#0f4c81] hover:underline">AI 爬蟲月報</a>
            </p>
            <p className="mt-1 text-xs text-[#9ca3af]">如發現資料錯誤，歡迎聯繫 <a href="mailto:cloudpipemo@gmail.com" className="text-[#0f4c81]">cloudpipemo@gmail.com</a> &middot; &copy; 2026 CloudPipe</p>
          </footer>
        </main>
      </div>
    </>
  )
}
