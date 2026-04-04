'use client'

/**
 * Variant C: 按使用場景分組版本
 * 強調用戶身份而非功能層級，提升轉化
 */

const VariantC = () => {
  return (
    <div className="space-y-10">
      {/* Scenario 1: 內容創作者 & 遊客 */}
      <div>
        <h3 className="text-lg font-bold text-[#1a1a2e] mb-6 flex items-center gap-2">
          📝 內容創作者 & 遊客
        </h3>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="text-2xl font-bold text-[#1a1a2e] mb-2">FREE</h4>
              <p className="text-sm text-gray-600">
                準確的澳門商戶信息、沒有任何成本
              </p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-bold text-[#0f4c81]">$0</span>
              <span className="text-gray-600 block text-sm">/月</span>
            </div>
          </div>
          <button className="w-full py-3 px-4 rounded-lg font-semibold bg-gray-100 text-[#1a1a2e] hover:bg-gray-200 transition-all mb-6">
            立即開始
          </button>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              瀏覽全部 350+ 商戶
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              搜尋 20 大行業
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              閱讀深度 Insights
            </li>
          </ul>
        </div>
      </div>

      {/* Scenario 2: 澳門商戶 & 營銷團隊 */}
      <div>
        <h3 className="text-lg font-bold text-[#1a1a2e] mb-6 flex items-center gap-2">
          💼 澳門商戶 & 營銷團隊
        </h3>
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl border-2 border-[#0f4c81] shadow-xl p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="text-2xl font-bold text-[#1a1a2e] mb-2">PREMIUM</h4>
              <p className="text-sm text-gray-600">
                數據分析 + 競爭對標，優化你的業務
              </p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-bold text-[#0f4c81]">$29-99</span>
              <span className="text-gray-600 block text-sm">/月</span>
            </div>
          </div>
          <button className="w-full py-3 px-4 rounded-lg font-semibold bg-[#0f4c81] text-white hover:bg-[#0a3560] transition-all shadow-lg mb-6">
            升級 PREMIUM →
          </button>
          <ul className="space-y-2 text-sm text-gray-700 font-medium">
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              競爭對標表格 (3-5家對手)
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              評論趨勢分析 (12月歷史)
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              CSV 數據導出
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              實時排名監測
            </li>
          </ul>
        </div>
      </div>

      {/* Scenario 3: 企業 & 投資者 */}
      <div>
        <h3 className="text-lg font-bold text-[#1a1a2e] mb-6 flex items-center gap-2">
          🏛️ 企業 & 投資機構
        </h3>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="text-2xl font-bold text-[#1a1a2e] mb-2">ENTERPRISE</h4>
              <p className="text-sm text-gray-600">
                完整數據 + 戰略分析，做出明智決策
              </p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-bold text-[#0f4c81]">¥2,000+</span>
              <span className="text-gray-600 block text-sm">/月</span>
            </div>
          </div>
          <button className="w-full py-3 px-4 rounded-lg font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-all mb-6">
            聯繫銷售團隊
          </button>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              LLMC 爬蟲日誌 (實時)
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              LLMCF 轉化漏斗分析
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              行業洞察 + 戰略報告
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              自訂數據導出 + API
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              白標方案 + 集成服務
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default VariantC
