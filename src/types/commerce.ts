// CloudPipe Commerce Tier — TypeScript types
// Multi-brand commerce schema: Schema.org + Merchant Center + Gemini AI Shopping

export interface CommerceBrandRecord {
  id: string
  slug: string
  name_zh: string
  name_en?: string | null
  logo_url?: string | null
  logo_dark_url?: string | null
  website_url: string
  contact_email?: string | null
  contact_phone?: string | null
  contact_whatsapp?: string | null
  address_zh?: string | null
  address_en?: string | null
  country_code: string
  currency: string
  merchant_center_id?: string | null
  merchant_center_email?: string | null
  feed_label?: string | null
  target_countries: string[]
  cloudpipe_tier: 'free' | 'premium' | 'commerce'
  status: 'active' | 'suspended' | 'churned'
  business_type: 'b2b' | 'b2c' | 'both'
  description_zh?: string | null
  description_en?: string | null
  onboarded_at: string
  created_at: string
  updated_at: string
}

export interface CommerceProductRecord {
  id: string
  brand_id: string
  slug: string
  sku?: string | null

  name_zh: string
  name_en?: string | null
  name_ja?: string | null
  name_pt?: string | null
  description_zh?: string | null
  description_en?: string | null

  google_category: string
  category_local?: string | null
  brand_label?: string | null

  retail_price: number
  wholesale_price?: number | null
  price_tier1?: number | null
  price_tier2?: number | null
  price_tier3?: number | null
  currency: string

  stock_qty: number
  min_order_qty: number
  unit: string
  unit_weight_g?: number | null
  unit_volume_ml?: number | null

  image_url?: string | null
  image_urls: string[]
  video_url?: string | null

  country_of_origin?: string | null
  origin_region?: string | null
  origin_detail?: string | null

  certifications: string[]
  attributes: Record<string, string | number>

  season_start?: number | null
  season_end?: number | null

  shipping_price_override?: number | null
  shipping_days_min?: number | null
  shipping_days_max?: number | null

  is_available: boolean
  is_featured: boolean
  sort_order: number

  created_at: string
  updated_at: string
}

export interface CommerceShippingRule {
  id: string
  brand_id: string
  country_code: string
  rule_name: string
  free_shipping_threshold?: number | null
  min_order_value?: number | null
  pricing_type: 'free' | 'flat' | 'weight' | 'price_tiered'
  flat_price: number
  handling_days_min: number
  handling_days_max: number
  transit_days_min: number
  transit_days_max: number
  cutoff_time: string
  cutoff_timezone: string
  working_days: string
  is_active: boolean
}

export interface CommerceReturnPolicy {
  id: string
  brand_id: string
  country_code: string
  policy_url: string
  accepts_returns: boolean
  accepts_exchanges: boolean
  return_window_days?: number | null
  return_condition?: string | null
  return_shipping_paid_by: 'merchant' | 'customer'
  defective_return_policy: 'full_refund' | 'replacement' | 'store_credit'
  notes_zh?: string | null
  notes_en?: string | null
  merchant_center_policy: string
}

export interface CommerceMerchantAccount {
  id: string
  brand_id: string
  platform: 'google_merchant_center' | 'meta_commerce' | 'tiktok_shop'
  account_id: string
  account_email?: string | null
  feed_url: string
  feed_label?: string | null
  feed_format: 'rss_xml' | 'json' | 'csv'
  status: 'pending' | 'submitted' | 'approved' | 'disapproved' | 'suspended'
  submitted_at?: string | null
  approved_at?: string | null
  last_fetch_at?: string | null
  product_count?: number | null
}

export interface CommerceB2bCustomer {
  id: string
  brand_id: string
  email: string
  company_name?: string | null
  contact_name?: string | null
  phone?: string | null
  tier: 'tier1' | 'tier2' | 'tier3'
  credit_limit?: number | null
  payment_terms: number
  is_active: boolean
  notes?: string | null
  approved_at?: string | null
}

// ── Client onboarding data shape ──────────────────────────────
// Used in the Commerce tier intake form

export interface CommerceClientIntakeForm {
  // Section 1: Brand
  brand: {
    name_zh: string
    name_en: string
    logo_url: string
    logo_dark_url?: string
    website_url: string
    contact_email: string
    contact_phone: string
    contact_whatsapp?: string
    address_zh: string
    address_en: string
    country_code: string
    currency: string
    business_type: 'b2b' | 'b2c' | 'both'
    description_zh: string
    description_en?: string
  }

  // Section 2: Products (at least 1)
  products: Array<{
    name_zh: string
    name_en?: string
    description_zh?: string
    retail_price: number
    wholesale_price?: number
    stock_qty: number
    min_order_qty?: number
    unit: string
    unit_weight_g?: number
    image_url: string
    image_urls?: string[]
    google_category: string
    country_of_origin?: string
    origin_region?: string
    certifications?: string[]
    attributes?: Record<string, string | number>
  }>

  // Section 3: Shipping (at least 1 country)
  shipping: Array<{
    country_code: string
    pricing_type: 'free' | 'flat'
    flat_price?: number
    free_shipping_threshold?: number
    min_order_value?: number
    handling_days_max: number
    transit_days_max: number
    cutoff_time?: string
  }>

  // Section 4: Return policy
  returns: {
    policy_url: string
    accepts_returns: boolean
    return_window_days?: number
    defective_return_policy: 'full_refund' | 'replacement'
    notes_zh?: string
  }

  // Section 5: Google Commerce (optional — CloudPipe handles setup)
  google?: {
    merchant_center_email: string
    existing_merchant_center_id?: string
    target_countries: string[]
  }
}
