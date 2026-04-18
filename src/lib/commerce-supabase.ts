// CloudPipe Commerce — Multi-brand Supabase helpers
import { createClient } from '@supabase/supabase-js'
import type { CommerceProduct } from '@/lib/cloudpipe-commerce'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── MC Readiness ──────────────────────────────────────────────

export interface McReadinessRow {
  slug: string
  name_zh: string
  retail_price: number
  stock_qty: number
  mc_status: string
  mc_exclude_reason: string | null
  img_check: string
  price_check: string
  desc_check: string
  name_en_check: string
  stock_check: string
  recommendation: string
}

/** Get Merchant Center readiness report for a brand */
export async function getMcReadiness(brandSlug: string): Promise<McReadinessRow[]> {
  const db = serviceClient()
  const { data } = await db
    .from('v_commerce_mc_readiness')
    .select('*')
    .eq('brand', brandSlug === 'inari-global-foods' ? '稻荷環球食品' : brandSlug)
  return (data ?? []) as McReadinessRow[]
}

/** Get only approved products for Merchant Center feed */
export async function getApprovedCommerceProducts(brandSlug: string): Promise<CommerceProduct[]> {
  const db = serviceClient()

  const { data: brand } = await db
    .from('commerce_brands')
    .select('id, name_zh, website_url, currency, country_code')
    .eq('slug', brandSlug)
    .single()

  if (!brand) return []

  const { data: products } = await db
    .from('commerce_products')
    .select('*')
    .eq('brand_id', brand.id)
    .eq('mc_status', 'approved')
    .order('sort_order')

  if (!products?.length) return []

  return products.map(p => ({
    id: p.id,
    slug: p.slug,
    name: p.name_zh,
    name_en: p.name_en,
    description: p.description_zh,
    price: p.retail_price,
    currency: p.currency || brand.currency,
    stock: p.stock_qty > 0 ? 'in_stock' : 'out_of_stock',
    image_url: p.image_url,
    image_urls: p.image_urls ?? [],
    category: p.google_category,
    brand: p.brand_label || brand.name_zh,
    country_of_origin: p.country_of_origin ?? undefined,
    shipping_price: p.shipping_price_override ?? 0,
    shipping_days_max: p.shipping_days_max ?? 1,
    certifications: p.certifications ?? [],
    attributes: p.attributes ?? {},
    url: `${brand.website_url}/shop/${p.slug}`,
  })) as CommerceProduct[]
}

// ── Product approval management ───────────────────────────────

export async function approveMcProduct(brandSlug: string, productSlug: string) {
  const db = serviceClient()
  const { data } = await db
    .rpc('approve_for_merchant_center', {
      p_brand_slug: brandSlug,
      p_product_slug: productSlug,
      p_approved_by: 'cloudpipe-admin',
    })
  return data as string
}

export async function excludeMcProduct(brandSlug: string, productSlug: string, reason: string) {
  const db = serviceClient()
  const { data } = await db
    .rpc('exclude_from_merchant_center', {
      p_brand_slug: brandSlug,
      p_product_slug: productSlug,
      p_reason: reason,
    })
  return data as string
}

export async function pauseMcProduct(brandSlug: string, productSlug: string, reason?: string) {
  const db = serviceClient()
  const { data } = await db
    .rpc('pause_merchant_center_listing', {
      p_brand_slug: brandSlug,
      p_product_slug: productSlug,
      p_reason: reason ?? '季節性暫停',
    })
  return data as string
}

/** Sync stock from inari_catalog → commerce_products */
export async function syncInariCatalogStock(): Promise<number> {
  const db = serviceClient()
  const { data } = await db.rpc('sync_inari_catalog_stock')
  return data as number
}
