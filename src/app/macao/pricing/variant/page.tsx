import { Metadata } from 'next'
import { Suspense } from 'react'
import VariantA from '@/components/PricingVariantA'
import VariantB from '@/components/PricingVariantB'
import VariantC from '@/components/PricingVariantC'

export const metadata: Metadata = {
  title: '定價方案 — CloudPipe 澳門商業知識圖譜',
  description: '三層定價模型：FREE、PREMIUM、ENTERPRISE。選擇最適合你的方案。',
  robots: 'noindex, nofollow', // A/B測試版本不索引
}

interface PricingVariantPageProps {
  searchParams: {
    variant?: string
  }
}

export default function PricingVariantPage({ searchParams }: PricingVariantPageProps) {
  const variant = (searchParams.variant || 'a').toLowerCase()
  const isValidVariant = ['a', 'b', 'c'].includes(variant)

  if (!isValidVariant) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">無效的測試變體</h1>
          <p className="text-gray-600 mb-8">
            請使用以下URL進行A/B測試：
          </p>
          <ul className="space-y-2 text-left bg-gray-100 p-6 rounded-lg max-w-md mx-auto">
            <li>
              <code className="text-sm text-[#0f4c81]">/macao/pricing/variant?variant=a</code>
              <p className="text-xs text-gray-600">PREMIUM 高亮版本</p>
            </li>
            <li>
              <code className="text-sm text-[#0f4c81]">/macao/pricing/variant?variant=b</code>
              <p className="text-xs text-gray-600">ENTERPRISE 突出版本</p>
            </li>
            <li>
              <code className="text-sm text-[#0f4c81]">/macao/pricing/variant?variant=c</code>
              <p className="text-xs text-gray-600">按場景分組版本</p>
            </li>
          </ul>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* 測試標籤 */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-center text-sm text-yellow-800">
        🧪 A/B 測試版本 (Variant {variant.toUpperCase()}) — 轉化數據自動追蹤
      </div>

      {/* Hero */}
      <section className="px-4 md:px-8 pt-12 md:pt-16 pb-8 md:pb-12">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] mb-4">
            選擇最適合的方案
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {variant === 'a' && '澳門商戶、投資者、內容創作者都能找到最適合的方案。'}
            {variant === 'b' && '從初創到企業，我們有完整的解決方案。'}
            {variant === 'c' && '根據你的身份，找到最適合的功能和價格。'}
          </p>
        </div>
      </section>

      {/* 變體內容 */}
      <section className="px-4 md:px-8 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={<div>載入中...</div>}>
            {variant === 'a' && <VariantA />}
            {variant === 'b' && <VariantB />}
            {variant === 'c' && <VariantC />}
          </Suspense>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 md:px-8 py-12 md:py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-8 text-center">
            定價常見問題
          </h2>

          <div className="space-y-4">
            {[
              {
                q: '可以隨時升級或降級方案嗎？',
                a: '完全可以。你可以隨時升級到 PREMIUM 或 ENTERPRISE，或降級到 FREE。升級立即生效，降級在本月結束時生效。',
              },
              {
                q: 'ENTERPRISE 方案是否可以自訂？',
                a: '完全可以。ENTERPRISE 是完全可自訂的，價格取決於你需要的功能、數據量和支持等級。與我們團隊聯繫詳細討論。',
              },
              {
                q: '數據會不會在升級時丟失？',
                a: '不會。無論升級、降級還是切換方案，你的所有數據和查詢記錄都會完全保留。',
              },
            ].map((faq, i) => (
              <details key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden group">
                <summary className="font-semibold cursor-pointer p-4 flex justify-between items-center hover:bg-gray-50 transition-colors text-[#1a1a2e]">
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

      {/* CTA */}
      <section className="px-4 md:px-8 py-12 md:py-16 bg-gradient-to-r from-[#0f4c81] to-[#1a7eb8] text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            準備好開始了嗎？
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            無論選擇哪個方案，你都能立即訪問澳門商業知識圖譜。
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
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all"
            >
              聯繫我們升級
            </a>
          </div>
        </div>
      </section>

      {/* 測試追蹤腳本 */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // LLMR 點擊追蹤
            document.querySelectorAll('a[href*="cloudpipe-landing"], button').forEach(el => {
              el.addEventListener('click', () => {
                if (window.gtag) {
                  gtag('event', 'pricing_cta_click', {
                    variant: '${variant.toUpperCase()}',
                    cta_type: el.textContent.includes('聯繫') ? 'contact' : 'start_free',
                    timestamp: new Date().toISOString()
                  });
                }
              });
            });

            // 頁面視圖追蹤
            if (window.gtag) {
              gtag('event', 'pricing_variant_view', {
                variant: '${variant.toUpperCase()}',
                timestamp: new Date().toISOString()
              });
            }
          `,
        }}
      />
    </main>
  )
}
