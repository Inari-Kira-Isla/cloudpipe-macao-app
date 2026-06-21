import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProductBySlug } from '@/lib/inari-supabase'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getProductBySlug(params.slug)
  if (!p) return { title: '產品未找到' }
  return {
    title: p.name_zh,
    description: p.description_zh ?? `${p.origin_region}${p.name_zh}，${p.species}，每${p.unit}${p.unit_weight_g}g`,
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const p = await getProductBySlug(params.slug)
  if (!p) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name_zh,
    alternateName: [p.name_en, p.name_ja].filter(Boolean),
    description: p.description_zh ?? undefined,
    image: p.image_url ?? undefined,
    offers: p.retail_price ? {
      '@type': 'Offer',
      price: p.retail_price,
      priceCurrency: 'MOP',
      availability: p.stock_qty > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    } : undefined,
    additionalProperty: [
      { '@type': 'PropertyValue', name: '產地', value: p.origin_region },
      { '@type': 'PropertyValue', name: '品種', value: p.species },
      ...(p.season_start ? [{ '@type': 'PropertyValue', name: '季節', value: `${p.season_start}月—${p.season_end}月` }] : []),
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="pt-28 max-w-6xl mx-auto px-6 pb-24">
        <Link href="/inari/shop" className="text-[#C9A961]/60 text-sm hover:text-[#C9A961] mb-8 inline-block">
          ← 返回型錄
        </Link>

        <div className="grid grid-cols-2 gap-16">
          {/* Image */}
          <div className="aspect-square bg-[#C9A961]/10">
            {p.image_url
              ? <img src={p.image_url} alt={p.name_zh} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-[#C9A961]/20 text-8xl">🦔</div>
            }
          </div>

          {/* Info */}
          <div>
            <p className="text-[#C9A961]/60 text-xs tracking-[0.3em] mb-3">{p.species} · {p.origin_region}</p>
            <h1 className="text-4xl font-light mb-1">{p.name_zh}</h1>
            <p className="text-[#F5F0E8]/40 mb-2">{p.name_en}</p>
            {p.name_ja && <p className="text-[#F5F0E8]/30 text-sm mb-6">{p.name_ja}</p>}

            {p.description_zh && (
              <p className="text-[#F5F0E8]/70 leading-relaxed mb-8">{p.description_zh}</p>
            )}

            {/* Specs */}
            <div className="border border-[#C9A961]/20 p-6 mb-8 space-y-3 text-sm">
              {[
                ['產地', `${p.origin_region}${p.origin_detail ? ` · ${p.origin_detail}` : ''}`],
                ['品種', p.species],
                ['規格', `${p.unit_weight_g}g / ${p.unit}`],
                ['最低訂量', `${p.min_order_qty} ${p.unit}`],
                ['產季', p.season_start ? `${p.season_start}月 — ${p.season_end}月` : '—'],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string} className="flex justify-between">
                  <span className="text-[#F5F0E8]/40">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>

            {/* Price */}
            {p.retail_price && (
              <div className="mb-6">
                <p className="text-[#F5F0E8]/40 text-xs mb-1">零售價（B2C）</p>
                <p className="text-2xl text-[#C9A961]">MOP {p.retail_price.toLocaleString()} / {p.unit}</p>
              </div>
            )}

            {/* Stock */}
            <p className={`text-sm mb-8 ${p.stock_qty > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {p.stock_qty > 0 ? `庫存 ${p.stock_qty} ${p.unit}` : '暫時缺貨'}
            </p>

            {/* CTAs */}
            <div className="flex gap-4">
              {p.stock_qty > 0 && (
                <Link
                  href={`/inari/portal?product=${p.slug}`}
                  className="flex-1 py-3 bg-[#C9A961] text-[#0A1628] font-semibold text-center hover:bg-[#C9A961]/90 transition-colors"
                >
                  批發下單
                </Link>
              )}
              <a
                href={`https://wa.me/853XXXXXXXX?text=查詢：${p.name_zh}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 border border-[#C9A961]/50 text-center hover:border-[#C9A961] transition-colors"
              >
                WhatsApp 查詢
              </a>
            </div>
          </div>
        </div>

        {/* B2B Wholesale Banner */}
        <div className="mt-16 border border-[#C9A961]/20 p-8 text-center">
          <p className="text-[#C9A961] mb-2">批發客戶享受更優惠價格</p>
          <p className="text-[#F5F0E8]/50 text-sm mb-4">高端及合作餐廳最高享 25% 折扣，請登入批發專區查看批發價</p>
          <Link href="/inari/portal" className="text-[#C9A961] border border-[#C9A961]/50 px-6 py-2 text-sm hover:bg-[#C9A961] hover:text-[#0A1628] transition-colors">
            批發專區登入
          </Link>
        </div>
      </div>
    </>
  )
}
