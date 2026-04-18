import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: {
    template: '%s | 稻荷環球食品',
    default: '稻荷環球食品 — 澳門頂級日本海膽供應商',
  },
  description: '直送北海道、青森、岩手、長崎四大產地海膽，供應澳門米芝蓮及黑珍珠餐廳。',
}

export default function InariLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A1628] text-[#F5F0E8] font-serif">
      <InariNav />
      <main>{children}</main>
      <InariFooter />
    </div>
  )
}

function InariNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#C9A961]/20 bg-[#0A1628]/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/inari" className="text-[#C9A961] text-xl font-semibold tracking-widest">
          稻荷環球食品
        </Link>
        <div className="flex items-center gap-8 text-sm tracking-wider">
          <Link href="/inari/shop" className="hover:text-[#C9A961] transition-colors">產品型錄</Link>
          <Link href="/inari/cold-chain" className="hover:text-[#C9A961] transition-colors">冷鏈承諾</Link>
          <Link href="/inari/about" className="hover:text-[#C9A961] transition-colors">品牌故事</Link>
          <Link
            href="/inari/portal"
            className="px-4 py-1.5 border border-[#C9A961] text-[#C9A961] hover:bg-[#C9A961] hover:text-[#0A1628] transition-colors rounded"
          >
            批發登入
          </Link>
        </div>
      </div>
    </nav>
  )
}

function InariFooter() {
  return (
    <footer className="border-t border-[#C9A961]/20 mt-24 py-12">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-3 gap-12 text-sm text-[#F5F0E8]/60">
        <div>
          <p className="text-[#C9A961] font-semibold mb-3">稻荷環球食品</p>
          <p>澳門唯一同時供應北海道四大產地海膽的批發商</p>
        </div>
        <div>
          <p className="text-[#C9A961] font-semibold mb-3">聯絡我們</p>
          <p>WhatsApp: +853 XXXX XXXX</p>
          <p>Email: inariglobal@gmail.com</p>
        </div>
        <div>
          <p className="text-[#C9A961] font-semibold mb-3">批發合作</p>
          <Link href="/inari/portal" className="hover:text-[#C9A961]">申請批發帳戶</Link>
        </div>
      </div>
    </footer>
  )
}
