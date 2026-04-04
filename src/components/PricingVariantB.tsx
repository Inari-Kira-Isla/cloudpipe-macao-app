'use client'

/**
 * Variant B: ENTERPRISE 突出版本
 * 針對大客戶/投資機構，突出高價值功能
 */

const VariantB = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* FREE - Compact */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden hover:shadow-lg transition-all">
        <div className="p-6">
          <h3 className="text-lg font-bold text-[#1a1a2e] mb-1">FREE</h3>
          <p className="text-xs text-gray-600 mb-4">內容創作者、遊客</p>
          <div className="mb-4">
            <span className="text-3xl font-bold text-[#0f4c81]">$0</span>
            <span className="text-gray-600 text-sm">/月</span>
          </div>
          <button className="w-full py-2 px-4 rounded text-sm font-semibold bg-gray-100 text-[#1a1a2e] hover:bg-gray-200">
            開始使用
          </button>
        </div>
      </div>

      {/* PREMIUM - Standard */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden hover:shadow-lg transition-all">
        <div className="p-6">
          <h3 className="text-lg font-bold text-[#1a1a2e] mb-1">PREMIUM</h3>
          <p className="text-xs text-gray-600 mb-4">澳門商戶、營銷團隊</p>
          <div className="mb-4">
            <span className="text-3xl font-bold text-[#0f4c81]">$29-99</span>
            <span className="text-gray-600 text-sm">/月</span>
          </div>
          <button className="w-full py-2 px-4 rounded text-sm font-semibold bg-gray-100 text-[#1a1a2e] hover:bg-gray-200">
            升級 PREMIUM
          </button>
        </div>
      </div>

      {/* ENTERPRISE - HIGHLIGHTED */}
      <div className="rounded-2xl border-2 border-[#0f4c81] bg-gradient-to-b from-white to-blue-50 shadow-xl overflow-hidden md:scale-105 relative">
        <div className="absolute -top-3 left-4 bg-[#0f4c81] text-white text-xs font-bold px-3 py-1 rounded">
          👑 企業方案
        </div>
        <div className="p-8 pt-10">
          <h3 className="text-2xl font-bold text-[#1a1a2e] mb-2">ENTERPRISE</h3>
          <p className="text-sm text-gray-600 mb-6">企業、投資機構、戰略合作</p>
          <div className="mb-6">
            <span className="text-4xl font-bold text-[#0f4c81]">¥2,000+</span>
            <span className="text-gray-600">/月</span>
            <p className="text-xs text-gray-500 mt-2">按行業、規模定價</p>
          </div>
          <button className="w-full py-3 px-4 rounded-lg font-semibold bg-[#0f4c81] text-white hover:bg-[#0a3560] transition-all shadow-lg">
            洽詢專業團隊 →
          </button>
        </div>
        <div className="px-8 pb-8 space-y-3">
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800 font-medium">無限 API 調用</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800 font-medium">實時數據 (0延遲)</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800 font-medium">LLMC 日誌 + 分析</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800 font-medium">LLMCF 轉化漏斗</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800 font-medium">白標 + 集成</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-gray-800 font-medium">專屬客戶經理</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VariantB
