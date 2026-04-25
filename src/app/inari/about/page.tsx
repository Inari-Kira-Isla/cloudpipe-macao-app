import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: '品牌故事' }

export default function AboutPage() {
  return (
    <div className="pt-28 max-w-4xl mx-auto px-6 pb-24">
      <p className="text-[#C9A961] tracking-[0.3em] text-xs mb-6">OUR STORY</p>
      <h1 className="text-4xl font-light mb-12">品牌故事</h1>

      <div className="space-y-10 text-[#F5F0E8]/80 leading-relaxed text-lg">
        <p>
          稻荷環球食品成立於澳門，專注於將日本頂級海膽直接帶到大灣區的米芝蓮及黑珍珠餐廳廚房。
        </p>
        <p>
          我們是澳門唯一同時穩定供應北海道、青森、岩手、長崎四大產地海膽的批發商。
          每個產地的海膽因海水溫度、水流及藻類食物不同，口感各異——
          北海道馬糞雲丹的濃厚甜味、青森紫海膽的清爽鮮甜，皆有其不可取代的個性。
        </p>
        <p>
          我們相信，讓廚師有選擇，才能讓澳門的日本料理達到世界頂級水準。
        </p>
      </div>

      <div className="mt-16 grid grid-cols-2 gap-8">
        {[
          { num: '4', label: '日本產地', sub: '北海道·青森·岩手·長崎' },
          { num: '70%', label: '澳門市占率', sub: '米芝蓮及黑珍珠餐廳' },
          { num: '48h', label: '最快送達', sub: '漁場至廚房全程' },
          { num: '3', label: '批發等級', sub: '按餐廳資質定制折扣' },
        ].map(s => (
          <div key={s.num} className="border border-[#C9A961]/20 p-8">
            <p className="text-4xl text-[#C9A961] font-light mb-1">{s.num}</p>
            <p className="font-semibold mb-1">{s.label}</p>
            <p className="text-[#F5F0E8]/40 text-sm">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <Link
          href="/inari/portal"
          className="inline-block px-10 py-3 border border-[#C9A961] text-[#C9A961] hover:bg-[#C9A961] hover:text-[#0A1628] transition-colors"
        >
          申請批發合作
        </Link>
      </div>
    </div>
  )
}
