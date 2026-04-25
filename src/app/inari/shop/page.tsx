import type { Metadata } from 'next'
import Link from 'next/link'
import { getProducts } from '@/lib/inari-supabase'

export const metadata: Metadata = { title: '產品型錄' }
export const revalidate = 3600

const SPECIES = ['馬糞雲丹', '紫海膽', '赤海膽', '白海膽']
const ORIGINS = ['北海道', '青森', '岩手', '長崎']

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { species?: string; origin?: string }
}) {
  const products = await getProducts({
    species: searchParams.species,
    origin: searchParams.origin,
  })

  return (
    <div className="pt-28 max-w-6xl mx-auto px-6 pb-24">
      <h1 className="text-3xl font-light text-[#C9A961] mb-2">產品型錄</h1>
      <p className="text-[#F5F0E8]/50 mb-10">Product Catalog</p>

      {/* Filters */}
      <div className="flex gap-4 mb-10 flex-wrap">
        <FilterGroup label="品種" param="species" options={SPECIES} current={searchParams.species} />
        <FilterGroup label="產地" param="origin" options={ORIGINS} current={searchParams.origin} />
      </div>

      {products.length === 0 ? (
        <p className="text-[#F5F0E8]/40 text-center py-20">暫無符合條件的產品</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(p => (
            <Link key={p.id} href={`/inari/shop/${p.slug}`} className="group">
              <div className="aspect-square bg-[#C9A961]/10 mb-3 overflow-hidden">
                {p.image_url
                  ? <img src={p.image_url} alt={p.name_zh} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  : <div className="w-full h-full flex items-center justify-center text-[#C9A961]/20 text-5xl">🦔</div>
                }
              </div>
              {p.is_featured && (
                <span className="text-xs bg-[#C9A961] text-[#0A1628] px-2 py-0.5 mb-2 inline-block">精選</span>
              )}
              <p className="text-[#C9A961]/60 text-xs tracking-widest mb-1">{p.origin_region}</p>
              <h2 className="font-semibold mb-0.5">{p.name_zh}</h2>
              <p className="text-[#F5F0E8]/40 text-xs mb-2">{p.name_en}</p>
              <p className="text-[#C9A961] text-sm">
                MOP {p.retail_price?.toLocaleString() ?? '—'} / {p.unit}
              </p>
              <p className="text-[#F5F0E8]/30 text-xs mt-1">
                最低 {p.min_order_qty} {p.unit}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterGroup({ label, param, options, current }: {
  label: string; param: string; options: string[]; current?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#F5F0E8]/40 text-sm">{label}：</span>
      <Link
        href={`/inari/shop`}
        className={`text-sm px-3 py-1 border transition-colors ${!current ? 'border-[#C9A961] text-[#C9A961]' : 'border-white/20 hover:border-white/40'}`}
      >
        全部
      </Link>
      {options.map(o => (
        <Link
          key={o}
          href={`/inari/shop?${param}=${encodeURIComponent(o)}`}
          className={`text-sm px-3 py-1 border transition-colors ${current === o ? 'border-[#C9A961] text-[#C9A961]' : 'border-white/20 hover:border-white/40'}`}
        >
          {o}
        </Link>
      ))}
    </div>
  )
}
