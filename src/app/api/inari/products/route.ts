// UCP-compatible Product catalog API
// Powers Gemini AI Shopping discovery via Schema.org Shopping Graph signals
import { NextResponse } from 'next/server'
import { getProducts } from '@/lib/inari-supabase'

export const revalidate = 3600

const SITE = 'https://cloudpipe.io'
const SELLER = {
  '@type': 'Organization',
  name: '稻荷環球食品',
  url: `${SITE}/inari`,
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: ['Chinese', 'Japanese', 'English'],
  },
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const products = await getProducts({
    featured: searchParams.get('featured') === 'true',
    species: searchParams.get('species') ?? undefined,
    origin: searchParams.get('origin') ?? undefined,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
  })

  const graph = products.map(p => {
    const trustSignals = []
    if ((p.certifications ?? []).includes('michelin_partner')) {
      trustSignals.push({ '@type': 'PropertyValue', name: 'certification', value: 'Michelin Partner Supplier' })
    }
    if ((p.certifications ?? []).includes('black_pearl_supplier')) {
      trustSignals.push({ '@type': 'PropertyValue', name: 'certification', value: 'Black Pearl Restaurant Supplier' })
    }

    return {
      '@type': 'Product',
      '@id': `${SITE}/inari/shop/${p.slug}`,
      url: `${SITE}/inari/shop/${p.slug}`,
      name: p.name_zh,
      alternateName: [p.name_en, p.name_ja].filter(Boolean),
      description: p.description_zh ?? `${p.origin_region}${p.name_zh}，${p.species}，${p.unit_weight_g}g/${p.unit}`,
      image: p.image_url ? [p.image_url, ...(p.image_urls ?? [])] : undefined,
      brand: { '@type': 'Brand', name: '稻荷環球食品' },
      category: '海鮮 > 海膽',
      countryOfOrigin: { '@type': 'Country', name: 'Japan' },
      offers: p.retail_price ? {
        '@type': 'Offer',
        price: p.retail_price,
        priceCurrency: 'MOP',
        availability: p.stock_qty > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: SELLER,
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'MOP' },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
            transitTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
          },
          shippingDestination: {
            '@type': 'DefinedRegion',
            addressCountry: 'MO',
          },
        },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
          // Perishable goods — cold chain failure exception handled separately
        },
      } : undefined,
      additionalProperty: [
        p.species && { '@type': 'PropertyValue', name: 'species', value: p.species },
        p.origin_region && { '@type': 'PropertyValue', name: 'origin_region', value: p.origin_region },
        p.origin_detail && { '@type': 'PropertyValue', name: 'origin_detail', value: p.origin_detail },
        p.unit_weight_g && { '@type': 'PropertyValue', name: 'unit_weight', unitCode: 'GRM', value: p.unit_weight_g },
        p.season_start && { '@type': 'PropertyValue', name: 'season', value: `${p.season_start}月—${p.season_end}月` },
        p.min_order_qty && { '@type': 'PropertyValue', name: 'min_order_qty', value: p.min_order_qty },
        ...trustSignals,
      ].filter(Boolean),
    }
  })

  return NextResponse.json(
    {
      '@context': 'https://schema.org',
      '@graph': graph,
    },
    {
      headers: {
        'Content-Type': 'application/ld+json',
        'Cache-Control': 'public, s-maxage=3600',
        'Link': `<${SITE}/api/inari/products>; rel="self"`,
      },
    }
  )
}
