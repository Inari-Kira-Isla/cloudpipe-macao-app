export interface Category {
  id: string
  slug: string
  name_zh: string
  name_en: string
  icon?: string
  sort_order: number
}

export interface Merchant {
  id: string
  code: string
  slug: string
  name_zh: string
  name_en?: string
  name_pt?: string
  category_id?: string
  category?: Category
  phone?: string
  email?: string
  website?: string
  address_zh?: string
  address_en?: string
  district?: string
  latitude?: number
  longitude?: number
  opening_hours?: Record<string, string>
  price_range?: string
  google_rating?: number
  google_reviews?: number
  tripadvisor_rating?: number
  tripadvisor_reviews?: number
  tier: 'premium' | 'basic' | 'draft'
  status: 'draft' | 'review' | 'live' | 'archived'
  is_owned: boolean
  page_url?: string
  schema_type: string
  created_at: string
  updated_at: string
  published_at?: string
}

export interface MerchantContent {
  id: string
  merchant_id: string
  lang: string
  title: string
  description?: string
  body?: string
  word_count: number
  og_title?: string
  og_description?: string
  og_image?: string
  generated_by?: string
  reviewed: boolean
}

export interface MerchantFAQ {
  id: string
  merchant_id: string
  lang: string
  question: string
  answer: string
  sort_order: number
}

export interface MerchantSource {
  id: string
  merchant_id: string
  source_type: string
  source_url?: string
  source_id?: string
  raw_data?: unknown
}
