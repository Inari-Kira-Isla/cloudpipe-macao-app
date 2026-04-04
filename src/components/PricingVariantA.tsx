'use client'

/**
 * Variant A: PREMIUM 高亮版本 (Current Baseline)
 * 突出最受歡迎方案，驅動中型商戶訂閱
 */

const VariantA = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* FREE */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden hover:shadow-lg transition-all">
        <div className="p-8">
          <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">FREE</h3>
          <p className="text-sm text-gray-600 mb-6">適合內容創作者、遊客和媒體</p>
          <div className="mb-6">
            <span className="text-4xl font-bold text-[#0f4c81]">$0</span>
            <span className="text-gray-600">/月</span>
          </div>
          <button className="w-full py-3 px-4 rounded-lg font-semibold bg-gray-100 text-[#1a1a2e] hover:bg-gray-200 transition-all">
            開始使用
          </button>
        </div>
        <div className="px-8 pb-8 space-y-3">
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800">100 API 調用/天</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800">24 小時數據延遲</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800">商戶基本信息</span>
          </div>
        </div>
      </div>

      {/* PREMIUM - HIGHLIGHTED */}
      <div className="rounded-2xl border-2 border-[#0f4c81] bg-gradient-to-b from-white to-blue-50 shadow-xl overflow-hidden md:scale-105 relative">
        <div className="absolute -top-3 left-4 bg-[#0f4c81] text-white text-xs font-bold px-3 py-1 rounded">
          🎯 最受歡迎
        </div>
        <div className="p-8 pt-10">
          <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">PREMIUM</h3>
          <p className="text-sm text-gray-600 mb-6">適合澳門商戶、營銷團隊、設計師</p>
          <div className="mb-6">
            <span className="text-4xl font-bold text-[#0f4c81]">$29-99</span>
            <span className="text-gray-600">/月</span>
          </div>
          <button className="w-full py-3 px-4 rounded-lg font-semibold bg-[#0f4c81] text-white hover:bg-[#0a3560] transition-all shadow-lg">
            升級 PREMIUM →
          </button>
        </div>
        <div className="px-8 pb-8 space-y-3">
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800 font-medium">10,000 API 調用/月</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800 font-medium">6 小時數據延遲</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800 font-medium">競爭對標分析</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800 font-medium">CSV 數據導出</span>
          </div>
        </div>
      </div>

      {/* ENTERPRISE */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden hover:shadow-lg transition-all">
        <div className="p-8">
          <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">ENTERPRISE</h3>
          <p className="text-sm text-gray-600 mb-6">適合企業、投資機構、大規模商業決策</p>
          <div className="mb-6">
            <span className="text-4xl font-bold text-[#0f4c81]">¥2,000+</span>
            <span className="text-gray-600">/月</span>
          </div>
          <button className="w-full py-3 px-4 rounded-lg font-semibold bg-gray-100 text-[#1a1a2e] hover:bg-gray-200 transition-all">
            洽詢 ENTERPRISE →
          </button>
        </div>
        <div className="px-8 pb-8 space-y-3">
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800">無限 API 調用</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800">實時數據</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800">爬蟲訪問日誌</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800">白標方案</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VariantA
