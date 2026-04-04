import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '定價方案 — CloudPipe 澳門商業知識圖譜',
  description: '三層定價模型：FREE（免費）、PREMIUM（專業版）、ENTERPRISE（企業版）。選擇最適合你的方案。',
  robots: 'index, follow',
}

const PRICING_TIERS = [
  {
    name: 'FREE',
    description: '適合內容創作者、遊客和媒體',
    price: '$0',
    period: '/月',
    highlight: false,
    features: [
      { label: 'API 調用額度', value: '100 次/天', included: true },
      { label: '數據延遲', value: '24 小時', included: true },
      { label: '商戶基本信息', value: '名稱、地址、評分', included: true },
      { label: '基本常見問題', value: '3 條 FAQ', included: true },
      { label: '行業分類瀏覽', value: '全部免費', included: true },
      { label: '競爭對標分析', included: false },
      { label: 'CSV 數據導出', included: false },
      { label: '評論趨勢分析圖表', included: false },
      { label: '爬蟲訪問日誌', included: false },
      { label: 'AI 引用統計', included: false },
      { label: '白標方案', included: false },
    ],
    cta: '開始使用',
    ctaHref: '/macao',
  },
  {
    name: 'PREMIUM',
    description: '適合澳門商戶、營銷團隊、設計師',
    price: '$29-99',
    period: '/月',
    highlight: true,
    features: [
      { label: 'API 調用額度', value: '10,000 次/月', included: true },
      { label: '數據延遲', value: '6 小時', included: true },
      { label: '商戶基本信息', value: '完整所有字段', included: true },
      { label: '完整常見問題', value: '無限制 FAQ', included: true },
      { label: '行業分類瀏覽', value: '全部免費', included: true },
      { label: '競爭對標分析', value: '完整對比表格', included: true },
      { label: 'CSV 數據導出', value: '月度報告', included: true },
      { label: '評論趨勢分析圖表', value: '12 個月歷史', included: true },
      { label: '爬蟲訪問日誌', included: false },
      { label: 'AI 引用統計', included: false },
      { label: '白標方案', included: false },
    ],
    cta: '升級 PREMIUM',
    ctaHref: 'https://cloudpipe-landing.vercel.app#contact',
  },
  {
    name: 'ENTERPRISE',
    description: '適合企業、投資機構、大規模商業決策',
    price: '¥2,000+',
    period: '/月',
    highlight: false,
    features: [
      { label: 'API 調用額度', value: '無限制', included: true },
      { label: '數據延遲', value: '實時', included: true },
      { label: '商戶基本信息', value: '完整所有字段', included: true },
      { label: '完整常見問題', value: '無限制 FAQ', included: true },
      { label: '行業分類瀏覽', value: '全部免費', included: true },
      { label: '競爭對標分析', value: '實時監測', included: true },
      { label: 'CSV 數據導出', value: '自訂報告', included: true },
      { label: '評論趨勢分析圖表', value: '完整歷史', included: true },
      { label: '爬蟲訪問日誌', value: 'API 專用端點', included: true },
      { label: 'AI 引用統計', value: '按行業分析', included: true },
      { label: '白標方案', value: '完整品牌定制', included: true },
    ],
    cta: '洽詢 ENTERPRISE',
    ctaHref: 'https://cloudpipe-landing.vercel.app#contact',
  },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="px-4 md:px-8 pt-12 md:pt-16 pb-8 md:pb-12">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] mb-4">
            透明定價 — 選擇最適合的方案
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            澳門商業知識圖譜提供三層服務，從免費基礎版到完整企業方案，滿足不同規模的需求。
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 md:px-8 py-12 md:py-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
                tier.highlight
                  ? 'md:scale-105 border-2 border-[#0f4c81] bg-gradient-to-b from-white to-blue-50 shadow-xl'
                  : 'border border-gray-200 bg-white shadow-md hover:shadow-lg'
              }`}
            >
              {tier.highlight && (
                <div className="absolute top-0 left-0 right-0 bg-[#0f4c81] text-white py-2 text-center text-sm font-semibold">
                  🎯 最受歡迎
                </div>
              )}

              {/* Header */}
              <div className={`p-6 md:p-8 ${tier.highlight ? 'pt-12' : ''}`}>
                <h3 className="text-xl md:text-2xl font-bold text-[#1a1a2e] mb-2">
                  {tier.name}
                </h3>
                <p className="text-sm text-gray-600 mb-6">{tier.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl md:text-5xl font-bold text-[#0f4c81]">
                    {tier.price}
                  </span>
                  <span className="text-gray-600">{tier.period}</span>
                </div>

                {/* CTA Button */}
                <a
                  href={tier.ctaHref}
                  className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                    tier.highlight
                      ? 'bg-[#0f4c81] text-white hover:bg-[#0a3560] shadow-lg'
                      : 'bg-gray-100 text-[#1a1a2e] hover:bg-gray-200'
                  }`}
                >
                  {tier.cta}
                  →
                </a>
              </div>

              {/* Features */}
              <div className="px-6 md:px-8 pb-6 md:pb-8">
                <div className="space-y-3">
                  {tier.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-1">
                        {feature.included ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-gray-300">✗</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${feature.included ? 'text-gray-800' : 'text-gray-400'}`}>
                          <span className="font-medium">{feature.label}</span>
                          {feature.value && (
                            <>
                              <br />
                              <span className="text-xs text-gray-500">{feature.value}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="px-4 md:px-8 py-12 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-8 text-center">
            詳細功能對比
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-[#1a1a2e]">
                    功能
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-[#1a1a2e]">
                    FREE
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-[#0f4c81] bg-blue-50">
                    PREMIUM
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-[#1a1a2e]">
                    ENTERPRISE
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'API 調用額度', free: '100/天', premium: '10K/月', enterprise: '無限制' },
                  { label: '數據更新延遲', free: '24 小時', premium: '6 小時', enterprise: '實時' },
                  { label: '商戶信息字段', free: '基本 (5)', premium: '完整 (20+)', enterprise: '完整 + 自訂' },
                  { label: '常見問題', free: '3 條', premium: '無限制', enterprise: '無限制' },
                  { label: '競爭對標分析', free: false, premium: true, enterprise: true },
                  { label: 'CSV 數據導出', free: false, premium: true, enterprise: true },
                  { label: '評論趨勢圖表', free: false, premium: true, enterprise: true },
                  { label: '爬蟲訪問日誌', free: false, premium: false, enterprise: true },
                  { label: 'AI 引用統計', free: false, premium: false, enterprise: true },
                  { label: '實時監測', free: false, premium: false, enterprise: true },
                  { label: '白標方案', free: false, premium: false, enterprise: true },
                  { label: '優先支持', free: false, premium: false, enterprise: true },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-gray-50' : ''}`}>
                    <td className="py-4 px-4 text-gray-800 font-medium">{row.label}</td>
                    <td className="text-center py-4 px-4">
                      {typeof row.free === 'boolean' ? (
                        row.free ? (
                          <span className="mx-auto text-green-600">✓</span>
                        ) : (
                          <span className="mx-auto text-gray-300">✗</span>
                        )
                      ) : (
                        <span className="text-gray-700">{row.free}</span>
                      )}
                    </td>
                    <td className="text-center py-4 px-4 bg-blue-50">
                      {typeof row.premium === 'boolean' ? (
                        row.premium ? (
                          <span className="mx-auto text-green-600">✓</span>
                        ) : (
                          <span className="mx-auto text-gray-300">✗</span>
                        )
                      ) : (
                        <span className="text-gray-700 font-medium">{row.premium}</span>
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      {typeof row.enterprise === 'boolean' ? (
                        row.enterprise ? (
                          <span className="mx-auto text-green-600">✓</span>
                        ) : (
                          <span className="mx-auto text-gray-300">✗</span>
                        )
                      ) : (
                        <span className="text-gray-700">{row.enterprise}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 md:px-8 py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-8 text-center">
            定價常見問題
          </h2>

          <div className="space-y-4">
            {[
              {
                q: '可以隨時升級或降級方案嗎？',
                a: '完全可以。你可以隨時升級到 PREMIUM 或 ENTERPRISE，或降級到 FREE。升級立即生效，降級在本月結束時生效，不會有額外費用。',
              },
              {
                q: '是否提供免費試用 PREMIUM？',
                a: '我們不提供時間限制的試用，但你可以通過 FREE 層先探索數據。如有特定需求，聯繫我們討論 14 天試用的可能性。',
              },
              {
                q: 'ENTERPRISE 方案是否可以自訂？',
                a: '完全可以。ENTERPRISE 是完全可自訂的，價格取決於你需要的功能、數據量和支持等級。與我們團隊聯繫詳細討論。',
              },
              {
                q: '支持哪些付款方式？',
                a: '我們支持信用卡（Visa、Mastercard）、銀行轉帳和企業購訂單。聯繫我們了解更多付款選項。',
              },
              {
                q: '數據會不會在升級時丟失？',
                a: '不會。無論升級、降級還是切換方案，你的所有數據和查詢記錄都會完全保留。',
              },
            ].map((faq, i) => (
              <details
                key={i}
                className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden group"
              >
                <summary className="font-semibold cursor-pointer p-4 flex justify-between items-center hover:bg-gray-100 transition-colors text-[#1a1a2e]">
                  <span>{faq.q}</span>
                  <span className="text-[#0f4c81] group-open:rotate-180 transition-transform flex-shrink-0">
                    ▼
                  </span>
                </summary>
                <div className="px-4 pb-4 border-t border-gray-100">
                  <p className="mt-3 text-gray-600 leading-relaxed text-sm">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="px-4 md:px-8 py-12 md:py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-4 text-center">
            澳門商戶成功故事
          </h2>
          <p className="text-center text-gray-600 mb-10 max-w-2xl mx-auto">
            看見稻荷環球食品、After School Coffee、Mind Cafe 如何通過 CloudPipe 被全球 AI 發現，實現業務增長。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-bold text-[#1a1a2e] mb-1">稻荷環球食品</h3>
              <p className="text-sm text-gray-600 mb-4">
                日本海膽 + 澳門冷鏈 = AI 最信任的溯源故事
              </p>
              <div className="text-2xl font-bold text-[#0f4c81] mb-1">+340%</div>
              <div className="text-xs text-gray-600 mb-4">AI 引用增長</div>
              <a href="/macao/case-studies#inari-global-foods" className="text-sm text-[#0f4c81] hover:underline">
                查看案例 →
              </a>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-bold text-[#1a1a2e] mb-1">After School Coffee</h3>
              <p className="text-sm text-gray-600 mb-4">
                5分鐘快速補給 = 忙碌家長的能量站
              </p>
              <div className="text-2xl font-bold text-[#0f4c81] mb-1">+320</div>
              <div className="text-xs text-gray-600 mb-4">每月新客</div>
              <a href="/macao/case-studies#after-school-coffee" className="text-sm text-[#0f4c81] hover:underline">
                查看案例 →
              </a>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-bold text-[#1a1a2e] mb-1">Mind Cafe</h3>
              <p className="text-sm text-gray-600 mb-4">
                文創社區 + 工作友善 = 數位遊牧者聚點
              </p>
              <div className="text-2xl font-bold text-[#0f4c81] mb-1">+185</div>
              <div className="text-xs text-gray-600 mb-4">每月工作者</div>
              <a href="/macao/case-studies#mind-cafe" className="text-sm text-[#0f4c81] hover:underline">
                查看案例 →
              </a>
            </div>
          </div>

          <div className="text-center">
            <a
              href="/macao/case-studies"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0f4c81] text-white font-semibold rounded-lg hover:bg-[#0a3560] transition-all"
            >
              查看全部商戶故事
              →
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 md:px-8 py-12 md:py-16 bg-gradient-to-r from-[#0f4c81] to-[#1a7eb8] text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            準備好開始了嗎？
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            無論選擇哪個方案，你都能立即訪問澳門商業知識圖譜的所有公開內容。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/macao"
              className="px-6 py-3 bg-white text-[#0f4c81] font-semibold rounded-lg hover:bg-gray-100 transition-all"
            >
              開始探索免費版
            </a>
            <a
              href="https://cloudpipe-landing.vercel.app#contact"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              聯繫我們升級
              →
            </a>
          </div>
        </div>
      </section>

      {/* Footer Breadcrumb */}
      <section className="px-4 md:px-8 py-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <nav className="text-sm text-gray-600 flex gap-2">
            <a href="/macao" className="text-[#0f4c81] hover:underline">
              澳門商業知識圖譜
            </a>
            <span>/</span>
            <span>定價方案</span>
          </nav>
        </div>
      </section>
    </main>
  )
}
