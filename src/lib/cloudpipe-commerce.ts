// CloudPipe Commerce Module
// Generates UCP-compatible Schema.org + Merchant Center feeds for any brand
// Powers Gemini AI Shopping discovery for CloudPipe Commerce tier clients

export interface CommerceProduct {
  id: string
  slug: string
  name: string
  name_en?: string | null
  description?: string | null
  price: number
  currency: string
  stock: 'in_stock' | 'out_of_stock' | 'preorder'
  image_url?: string | null
  image_urls?: string[]
  category: string            // e.g. "Food > Seafood"
  brand: string
  country_of_origin?: string
  shipping_price?: number
  shipping_days_max?: number
  certifications?: string[]
  attributes?: Record<string, string | number>
  url: string
}

export interface CommerceBrand {
  slug: string
  name: string
  url: string
  contact_email?: string
  shipping_country: string   // ISO 3166 e.g. 'MO', 'HK'
  currency: string
}

/** Build Schema.org Product JSON-LD (UCP-compatible, Gemini Shopping signals) */
export function buildProductJsonLd(product: CommerceProduct, brand: CommerceBrand) {
  const inStock = product.stock === 'in_stock'
  const avail = inStock
    ? 'https://schema.org/InStock'
    : product.stock === 'preorder'
    ? 'https://schema.org/PreOrder'
    : 'https://schema.org/OutOfStock'

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': product.url,
    url: product.url,
    name: product.name,
    alternateName: product.name_en ? [product.name_en] : undefined,
    description: product.description ?? undefined,
    image: product.image_urls?.length
      ? [product.image_url, ...product.image_urls].filter(Boolean)
      : product.image_url ?? undefined,
    brand: { '@type': 'Brand', name: brand.name },
    category: product.category,
    countryOfOrigin: product.country_of_origin
      ? { '@type': 'Country', name: product.country_of_origin }
      : undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability: avail,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: brand.name, url: brand.url },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: product.shipping_price ?? 0,
          currency: product.currency,
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: product.shipping_days_max ?? 2,
            unitCode: 'DAY',
          },
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: brand.shipping_country,
        },
      },
    },
    additionalProperty: [
      ...Object.entries(product.attributes ?? {}).map(([name, value]) => ({
        '@type': 'PropertyValue',
        name,
        value,
      })),
      ...(product.certifications ?? []).map(c => ({
        '@type': 'PropertyValue',
        name: 'certification',
        value: c,
      })),
    ],
  }
}

/** Build Google Merchant Center XML feed item for a product */
export function buildMerchantCenterItem(
  product: CommerceProduct,
  brand: CommerceBrand
): string {
  const esc = (s: string | null | undefined) =>
    (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const avail = product.stock === 'in_stock'
    ? 'in stock'
    : product.stock === 'preorder'
    ? 'preorder'
    : 'out of stock'

  return `
  <item>
    <g:id>${esc(product.slug)}</g:id>
    <g:title>${esc(product.name)}${product.name_en ? ` (${esc(product.name_en)})` : ''}</g:title>
    <g:description>${esc(product.description ?? product.name)}</g:description>
    <g:link>${esc(product.url)}</g:link>
    ${product.image_url ? `<g:image_link>${esc(product.image_url)}</g:image_link>` : ''}
    <g:availability>${avail}</g:availability>
    <g:price>${product.price} ${product.currency}</g:price>
    <g:brand>${esc(brand.name)}</g:brand>
    <g:condition>new</g:condition>
    <g:google_product_category>${esc(product.category)}</g:google_product_category>
    <g:shipping>
      <g:country>${brand.shipping_country}</g:country>
      <g:price>${product.shipping_price ?? 0} ${product.currency}</g:price>
    </g:shipping>
    ${(product.certifications ?? []).map(c =>
      `<g:certification><g:certification_authority>${esc(brand.name)}</g:certification_authority><g:certification_name>${esc(c)}</g:certification_name></g:certification>`
    ).join('\n    ')}
    ${Object.entries(product.attributes ?? {}).slice(0, 5).map(([k, v], i) =>
      `<g:custom_label_${i}>${esc(String(v))}</g:custom_label_${i}>`
    ).join('\n    ')}
  </item>`
}

/** Wrap items into full Merchant Center RSS feed */
export function buildMerchantCenterFeed(
  products: CommerceProduct[],
  brand: CommerceBrand
): string {
  const items = products.map(p => buildMerchantCenterItem(p, brand)).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${brand.name} — Product Feed</title>
    <link>${brand.url}</link>
    <description>${brand.name} product catalog for Google Merchant Center</description>
    ${items}
  </channel>
</rss>`
}
