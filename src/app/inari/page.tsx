import Link from 'next/link'
import { getProducts } from '@/lib/inari-supabase'

export const revalidate = 3600

export default async function InariHomePage() {
  const featured = await getProducts({ featured: true, limit: 3 })

  return (
    <>
      {/* Hero */}
      <section className="pt-40 pb-24 px-6 text-center max-w-4xl mx-auto">
        <p className="text-[#C9A961] tracking-[0.3em] text-sm mb-6">INARI GLOBAL FOODS</p>
        <h1 className="text-5xl font-light leading-tight mb-6">
          北海道直送<br />
          <span className="text-[#C9A961]">頂級日本海膽</span>
        </h1>
        <p className="text-[#F5F0E8]/70 text-lg mb-10 max-w-xl mx-auto">
          澳門唯一同時供應四大產地海膽的批發商，專供米芝蓮及黑珍珠餐廳
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/inari/shop"
            className="px-8 py-3 bg-[#C9A961] text-[#0A1628] font-semibold hover:bg-[#C9A961]/90 transition-colors"
          >
            瀏覽產品
          </Link>
          <Link
            href="/inari/portal"
            className="px-8 py-3 border border-[#C9A961]/50 hover:border-[#C9A961] transition-colors"
          >
            批發登入
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <h2 className="text-2xl font-light text-[#C9A961] mb-10 text-center tracking-wider">本季精選</h2>
          <div className="grid grid-cols-3 gap-8">
            {featured.map(p => (
              <Link key={p.id} href={`/inari/shop/${p.slug}`} className="group">
                <div className="aspect-square bg-[#C9A961]/10 mb-4 overflow-hidden">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name_zh} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="w-full h-full flex items-center justify-center text-[#C9A961]/30 text-6xl">🦔</div>
                  }
                </div>
                <p className="text-[#C9A961]/60 text-xs tracking-widest mb-1">{p.species} · {p.origin_region}</p>
                <h3 className="text-lg mb-1">{p.name_zh}</h3>
                <p className="text-[#F5F0E8]/50 text-sm">{p.name_en}</p>
                {p.retail_price && (
                  <p className="text-[#C9A961] mt-2">MOP {p.retail_price.toLocaleString()} / {p.unit}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Certifications Strip */}
      <section className="border-t border-b border-[#C9A961]/20 py-12 px-6">
        <div className="max-w-4xl mx-auto flex justify-around items-center text-center">
          {[
            { label: '米芝蓮合作夥伴', en: 'Michelin Partner' },
            { label: '黑珍珠供應商', en: 'Black Pearl Supplier' },
            { label: '48小時冷鏈保障', en: 'Cold Chain Guarantee' },
            { label: '四大產地直送', en: '4 Origin Regions' },
          ].map(c => (
            <div key={c.label}>
              <p className="text-[#C9A961] font-semibold">{c.label}</p>
              <p className="text-[#F5F0E8]/40 text-xs mt-1">{c.en}</p>
            </div>
          ))}
        </div>
      </section>

      {/* B2B CTA */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-light mb-4">批發合作計劃</h2>
        <p className="text-[#F5F0E8]/60 mb-8">
          三級批發定價，米芝蓮及黑珍珠合作餐廳享受最高 25% 折扣。申請後由 Kira 人工核准。
        </p>
        <Link
          href="/inari/portal"
          className="inline-block px-10 py-3 border border-[#C9A961] text-[#C9A961] hover:bg-[#C9A961] hover:text-[#0A1628] transition-colors"
        >
          申請批發帳戶
        </Link>
      </section>
    </>
  )
}
