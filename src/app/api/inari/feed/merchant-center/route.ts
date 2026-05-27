// Google Merchant Center XML Feed — Gemini AI Shopping compatible
// Primary: commerce_products WHERE mc_status = 'approved'
// Fallback: inari_catalog (when no approved products yet)
import { getProducts } from '@/lib/inari-supabase'
import { getApprovedCommerceProducts } from '@/lib/commerce-supabase'
import { buildMerchantCenterFeed, type CommerceProduct, type CommerceBrand } from '@/lib/cloudpipe-commerce'
import type { InariProduct } from '@/types/inari'

export const dynamic = 'force-dynamic'

const BRAND: CommerceBrand = {
  slug: 'inari-global-foods',
  name: '稻荷環球食品',
  url: 'https://cloudpipe.io/inari',
  contact_email: 'inariglobal@gmail.com',
  shipping_country: 'MO',
  currency: 'MOP',
}

function inariToCommerce(p: InariProduct): CommerceProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name_zh,
    name_en: p.name_en,
    description: p.description_zh ?? `${p.origin_region ?? ''}${p.name_zh}，${p.unit_weight_g ?? ''}g/${p.unit ?? ''}`,
    price: p.retail_price ?? 0,
    currency: 'MOP',
    stock: (p.stock_qty ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
    image_url: p.image_url,
    image_urls: p.image_urls ?? [],
    category: 'Food, Beverages & Tobacco > Food Items > Seafood',
    brand: '稻荷環球食品',
    country_of_origin: 'Japan',
    shipping_price: 0,
    shipping_days_max: 1,
    certifications: p.certifications ?? [],
    attributes: {
      ...(p.species       ? { species: p.species }             : {}),
      ...(p.origin_region ? { origin_region: p.origin_region } : {}),
      ...(p.origin_detail ? { origin_detail: p.origin_detail } : {}),
      ...(p.unit_weight_g ? { unit_weight_g: p.unit_weight_g } : {}),
    },
    url: `https://cloudpipe.io/inari/shop/${p.slug}`,
  }
}

export async function GET() {
  // Primary: approved products from commerce layer
  const approved = await getApprovedCommerceProducts('inari-global-foods')

  let items: CommerceProduct[]
  if (approved.length > 0) {
    items = approved
  } else {
    // Fallback: map inari_catalog products (continuity before any are approved)
    const legacy = await getProducts({ limit: 200 })
    items = legacy.map(inariToCommerce)
  }

  const xml = buildMerchantCenterFeed(items, BRAND)

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=7200',
    },
  })
}
