// 稻荷環球食品 — Supabase helpers
import { createClient } from '@supabase/supabase-js'
import type { InariProduct, B2bCustomer, InariOrder } from '@/types/inari'

// inari-production has its own Supabase project (cqartwwsbxnjjatmndtt)
// separate from CloudPipe main (yitmabzsxfgbchhhjjef)
const supabaseUrl = process.env.INARI_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function inariPublicClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

export function inariServiceClient() {
  return createClient(
    supabaseUrl,
    process.env.INARI_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  )
}

// ── Products ──────────────────────────────────────────────────────

export async function getProducts(opts: {
  featured?: boolean
  species?: string
  origin?: string
  limit?: number
} = {}): Promise<InariProduct[]> {
  const db = inariServiceClient()
  let q = db
    .from('inari_catalog')
    .select('id,slug,name_zh,name_en,name_ja,species,origin_region,origin_detail,season_start,season_end,unit,unit_weight_g,min_order_qty,retail_price,stock_qty,is_available,is_featured,image_url,certifications,sort_order')
    .eq('is_available', true)
    .order('sort_order')

  if (opts.featured) q = q.eq('is_featured', true)
  if (opts.species)  q = q.eq('species', opts.species)
  if (opts.origin)   q = q.eq('origin_region', opts.origin)
  if (opts.limit)    q = q.limit(opts.limit)

  const { data } = await q
  return (data ?? []) as InariProduct[]
}

export async function getProductBySlug(slug: string): Promise<InariProduct | null> {
  const db = inariServiceClient()
  const { data } = await db
    .from('inari_catalog')
    .select('*')
    .eq('slug', slug)
    .eq('is_available', true)
    .single()
  return data as InariProduct | null
}

// Wholesale price — only for authenticated active B2B customers
export async function getWholesalePrice(
  productSlug: string,
  userEmail: string
): Promise<number | null> {
  const db = inariServiceClient()
  const { data: customer } = await db
    .from('b2b_customers')
    .select('tier, is_active')
    .eq('email', userEmail)
    .single()

  if (!customer?.is_active) return null

  const { data: product } = await db
    .from('inari_catalog')
    .select('wholesale_price')
    .eq('slug', productSlug)
    .single()

  return product?.wholesale_price ?? null
}

// ── B2B Auth ──────────────────────────────────────────────────────

export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  const db = inariPublicClient()
  const { error } = await db.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/inari/portal/dashboard`,
    },
  })
  return { error: error?.message ?? null }
}

export async function getB2bCustomer(email: string): Promise<B2bCustomer | null> {
  const db = inariServiceClient()
  const { data } = await db
    .from('b2b_customers')
    .select('*')
    .eq('email', email)
    .single()
  return data as B2bCustomer | null
}

// ── Orders ────────────────────────────────────────────────────────

export async function getOrderByNo(orderNo: string): Promise<InariOrder | null> {
  const db = inariServiceClient()
  const { data } = await db
    .from('inari_orders')
    .select('*')
    .eq('order_no', orderNo)
    .single()
  return data as InariOrder | null
}

export async function createOrder(order: Partial<InariOrder>): Promise<{ id: string; order_no: string } | null> {
  const db = inariServiceClient()
  const { data, error } = await db
    .from('inari_orders')
    .insert(order)
    .select('id, order_no')
    .single()
  if (error) {
    console.error('createOrder error:', error)
    return null
  }
  return data
}
