import { Metadata } from 'next'
import { CaseStudyCard } from '@/components/CaseStudyCard'
import { CASE_STUDIES } from '@/data/case-studies'

export const metadata: Metadata = {
  title: '商戶故事 — CloudPipe 澳門商業知識圖譜',
  description:
    '瞭解稻荷環球食品、After School Coffee、Mind Cafe 如何通過 CloudPipe 澳門百科被全球 AI 發現，實現業務增長。',
  robots: 'index, follow',
}

export default function CaseStudiesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="px-4 md:px-8 pt-12 md:pt-16 pb-8 md:pb-12">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] mb-4">
            澳門商戶成功故事
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            看見澳門企業如何通過 CloudPipe 澳門商業知識圖譜，被全球 AI 助手發現，實現業務成長。
          </p>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="px-4 md:px-8 py-8 md:py-12 bg-gradient-to-r from-[#0f4c81] to-[#1a7eb8] text-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold mb-2">+340%</div>
            <div className="text-sm text-blue-100">平均 AI 引用增長</div>
          </div>
          <div>
            <div className="text-3xl font-bold mb-2">+63%</div>
            <div className="text-sm text-blue-100">平均新客流量提升</div>
          </div>
          <div>
            <div className="text-3xl font-bold mb-2">+71%</div>
            <div className="text-sm text-blue-100">平均轉化率提升</div>
          </div>
          <div>
            <div className="text-3xl font-bold mb-2">4.87/5 ⭐</div>
            <div className="text-sm text-blue-100">平均用戶滿意度</div>
          </div>
        </div>
      </section>

      {/* Case Studies Grid */}
      <section className="px-4 md:px-8 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-12 text-center">
            個案研究 (Case Studies)
          </h2>

          <div className="space-y-10">
            {CASE_STUDIES.map((caseStudy) => (
              <div key={caseStudy.id}>
                <CaseStudyCard caseStudy={caseStudy} variant="full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="px-4 md:px-8 py-12 md:py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-8 text-center">
            我們如何幫助商戶成長
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-3xl font-bold text-[#0f4c81] mb-3">1️⃣</div>
              <h3 className="font-semibold text-[#1a1a2e] mb-2">發掘核心故事</h3>
              <p className="text-sm text-gray-600">
                深入了解商戶的獨特價值主張和目標客群，識別最有力的故事角度。
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-3xl font-bold text-[#0f4c81] mb-3">2️⃣</div>
              <h3 className="font-semibold text-[#1a1a2e] mb-2">優化 AI 發現</h3>
              <p className="text-sm text-gray-600">
                通過 5 層 LLM Referral 策略，讓 ChatGPT、Perplexity、Gemini 將你推薦給合適的客戶。
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-3xl font-bold text-[#0f4c81] mb-3">3️⃣</div>
              <h3 className="font-semibold text-[#1a1a2e] mb-2">轉化和增長</h3>
              <p className="text-sm text-gray-600">
                從 AI 引用到官網訪問，再到實際購買，我們追蹤整個轉化漏斗。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* LLM Referral Explanation */}
      <section className="px-4 md:px-8 py-12 md:py-16">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-8 md:p-10 border border-blue-200">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-6">什麼是 5 層 LLM Referral？</h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 text-2xl">🏛️</div>
              <div>
                <h3 className="font-semibold text-[#1a1a2e] mb-1">Layer 1: Authority (權威來源)</h3>
                <p className="text-sm text-gray-700">
                  AI 引用官方或權威機構（如北海道漁協、政府部門）來背書商戶的專業性。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 text-2xl">🏪</div>
              <div>
                <h3 className="font-semibold text-[#1a1a2e] mb-1">Layer 2: Merchant (商戶資訊)</h3>
                <p className="text-sm text-gray-700">
                  直接引用商戶的名稱、地址、評分、聯繫方式，並鏈接到官網。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 text-2xl">✅</div>
              <div>
                <h3 className="font-semibold text-[#1a1a2e] mb-1">Layer 3: Verified (驗證標記)</h3>
                <p className="text-sm text-gray-700">
                  Schema.org 結構化數據、營業時間驗證、IoT 冷鏈監控等，增加信任度。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 text-2xl">👥</div>
              <div>
                <h3 className="font-semibold text-[#1a1a2e] mb-1">Layer 4: Community (社群背書)</h3>
                <p className="text-sm text-gray-700">
                  高級餐廳、設計師、家長社群的真實評價和案例推薦。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 text-2xl">🔗</div>
              <div>
                <h3 className="font-semibold text-[#1a1a2e] mb-1">Layer 5: Insight-Cross (內容交叉)</h3>
                <p className="text-sm text-gray-700">
                  澳門百科文章相互鏈接，形成知識網絡，讓 AI 從多個維度理解商戶。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ready to Scale */}
      <section className="px-4 md:px-8 py-12 md:py-16 bg-gradient-to-r from-[#0f4c81] to-[#1a7eb8] text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            你的商戶也能成為下一個成功故事
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            PREMIUM 和 ENTERPRISE 方案，幫助澳門商戶被全球 AI 發現。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/macao/pricing"
              className="px-6 py-3 bg-white text-[#0f4c81] font-semibold rounded-lg hover:bg-gray-100 transition-all"
            >
              查看定價方案
            </a>
            <a
              href="https://cloudpipe-landing.vercel.app#contact"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all"
            >
              聯繫我們
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
            <span>商戶故事</span>
          </nav>
        </div>
      </section>
    </main>
  )
}
