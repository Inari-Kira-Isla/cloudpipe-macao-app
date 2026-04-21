// 稻荷環球食品 — TypeScript Types

export interface InariProduct {
  id: string
  slug: string
  name_zh: string
  name_en: string | null
  name_ja: string | null
  description_zh: string | null
  description_en: string | null
  species: string | null
  origin_region: string | null
  origin_detail: string | null
  season_start: number | null
  season_end: number | null
  unit: string
  unit_weight_g: number | null
  min_order_qty: number
  retail_price: number | null
  wholesale_price: number | null   // only loaded for authenticated B2B
  stock_qty: number
  is_available: boolean
  is_featured: boolean
  image_url: string | null
  image_urls: string[] | null
  certifications: string[] | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type CustomerTier = 'tier1' | 'tier2' | 'tier3'

export interface B2bCustomer {
  id: string
  user_id: string
  company_name: string
  contact_name: string | null
  email: string
  phone: string | null
  address: string | null
  region: string
  tier: CustomerTier
  credit_limit: number
  payment_terms: string
  is_active: boolean
  approved_at: string | null
  created_at: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

export interface OrderItem {
  product_id: string
  slug: string
  name_zh: string
  qty: number
  unit_price: number
  subtotal: number
}

export interface ColdChainLog {
  timestamp: string
  location: string
  temperature_c: number
  status: string
}

export interface InariOrder {
  id: string
  order_no: string
  customer_id: string | null
  customer_email: string
  order_type: 'b2b' | 'b2c'
  status: OrderStatus
  items: OrderItem[]
  subtotal: number | null
  shipping_fee: number
  total: number | null
  currency: string
  shipping_addr: string | null
  delivery_date: string | null
  cold_chain_log: ColdChainLog[]
  payment_method: string | null
  payment_status: PaymentStatus
  notes: string | null
  created_at: string
  updated_at: string
}

// Tier pricing config
export const TIER_DISCOUNT: Record<CustomerTier, number> = {
  tier1: 0.75,  // 25% off retail
  tier2: 0.82,  // 18% off retail
  tier3: 0.90,  // 10% off retail
}

export const TIER_LABEL: Record<CustomerTier, string> = {
  tier1: '米芝蓮/黑珍珠合作夥伴',
  tier2: '高端餐廳',
  tier3: '一般批發客戶',
}
