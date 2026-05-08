import type { Metadata } from 'next'

export const metadata: Metadata = { title: '冷鏈承諾' }

const STEPS = [
  { step: '01', title: '捕撈後 2 小時內', desc: '日本各產地漁場即時處理，活體空運或冷藏船', temp: '0—2°C' },
  { step: '02', title: '空運至香港（6-8h）', desc: '全程恆溫集裝箱，每批次附溫度記錄儀', temp: '0—4°C' },
  { step: '03', title: '澳門倉庫到達', desc: '入庫即時核溫、記錄批次號、冷鏈日誌上鏈', temp: '0—4°C' },
  { step: '04', title: '當日送達餐廳廚房', desc: '專線冷藏車，送達前電話通知，簽收確認', temp: '0—4°C' },
]

export default function ColdChainPage() {
  return (
    <div className="pt-28 max-w-5xl mx-auto px-6 pb-24">
      <p className="text-[#C9A961] tracking-[0.3em] text-xs mb-6">COLD CHAIN GUARANTEE</p>
      <h1 className="text-4xl font-light mb-4">48 小時冷鏈承諾</h1>
      <p className="text-[#F5F0E8]/60 text-lg mb-16 max-w-2xl">
        從日本漁場到澳門餐廳廚房，全程不超過 48 小時，每批次均有可查詢的冷鏈日誌。
      </p>

      <div className="space-y-px">
        {STEPS.map(s => (
          <div key={s.step} className="grid grid-cols-12 gap-6 border border-[#C9A961]/20 p-6 hover:border-[#C9A961]/40 transition-colors">
            <div className="col-span-1 text-[#C9A961]/40 text-4xl font-light">{s.step}</div>
            <div className="col-span-8">
              <h3 className="text-lg font-medium mb-1">{s.title}</h3>
              <p className="text-[#F5F0E8]/60 text-sm">{s.desc}</p>
            </div>
            <div className="col-span-3 text-right">
              <span className="text-[#C9A961] text-sm border border-[#C9A961]/30 px-3 py-1">{s.temp}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-[#C9A961]/10 border border-[#C9A961]/30 p-8">
        <h2 className="text-xl text-[#C9A961] mb-3">冷鏈問題保障</h2>
        <p className="text-[#F5F0E8]/70 leading-relaxed">
          如任何環節記錄溫度超標（&gt;4°C 持續 30 分鐘），本批次全額退款或補貨，無需爭議。
          每批次冷鏈日誌可於收貨後提供電子檔。
        </p>
      </div>
    </div>
  )
}
