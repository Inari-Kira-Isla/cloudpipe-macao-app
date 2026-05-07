'use client'
import Link from 'next/link'

export default function AscLandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(135deg, #1a0a00 0%, #3d1a00 50%, #1a0a00 100%)' }}>

      {/* Logo / Brand */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">☕</div>
        <h1 className="text-3xl font-bold text-amber-300 tracking-wide">After School Coffee</h1>
        <p className="text-amber-100/70 text-sm mt-1">氹仔 · 親子咖啡廳</p>
      </div>

      {/* Hero Card */}
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center shadow-xl border border-amber-400/20 mb-6">
        <h2 className="text-xl font-semibold text-amber-200 mb-2">
          分享你的故事 ✨
        </h2>
        <p className="text-amber-100/80 text-sm leading-relaxed mb-5">
          上傳相片或告訴我們你的心情，<br />
          AI 為你生成專屬品牌圖文，<br />
          一鍵發佈到 Facebook &amp; Instagram！
        </p>

        <Link
          href="/afterschool-coffee/create"
          className="block w-full py-3 rounded-xl font-bold text-base text-white transition-all"
          style={{ background: 'linear-gradient(90deg, #c47c1a, #e6a22e)' }}
        >
          立即開始 →
        </Link>
      </div>

      {/* Steps */}
      <div className="w-full max-w-sm space-y-3">
        {[
          { icon: '📸', title: '上傳相片', desc: '拍下你的咖啡、早餐或親子時光' },
          { icon: '🤖', title: 'AI 生成圖文', desc: '幾秒內自動生成品牌風格圖片及文案' },
          { icon: '🚀', title: '發佈社媒', desc: '管理員審核後即時發佈到各平台' },
        ].map(s => (
          <div key={s.title} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-amber-400/10">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className="text-amber-200 font-medium text-sm">{s.title}</div>
              <div className="text-amber-100/60 text-xs">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-amber-100/30 text-xs mt-8">© 2026 After School Coffee · Taipa, Macau</p>
    </main>
  )
}
