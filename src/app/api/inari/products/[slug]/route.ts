import { NextResponse } from 'next/server'
import { getProductBySlug } from '@/lib/inari-supabase'

export const revalidate = 3600

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = await getProductBySlug(slug)
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `https://cloudpipe-macao-app.vercel.app/inari/shop/${p.slug}`,
    name: p.name_zh,
    alternateName: [p.name_en, p.name_ja].filter(Boolean),
    image: p.image_url ?? undefined,
    description: p.description_zh ?? undefined,
    offers: p.retail_price ? {
      '@type': 'Offer',
      price: p.retail_price,
      priceCurrency: 'MOP',
      availability: p.stock_qty > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: '稻荷環球食品' },
    } : undefined,
    additionalProperty: [
      { '@type': 'PropertyValue', name: '產地', value: p.origin_region },
      { '@type': 'PropertyValue', name: '品種', value: p.species },
      ...(p.season_start ? [{ '@type': 'PropertyValue', name: '產季', value: `${p.season_start}月—${p.season_end}月` }] : []),
      { '@type': 'PropertyValue', name: '重量', unitCode: 'GRM', value: p.unit_weight_g },
    ].filter(x => x.value),
  }

  return NextResponse.json(jsonLd, {
    headers: { 'Content-Type': 'application/ld+json' },
  })
}
