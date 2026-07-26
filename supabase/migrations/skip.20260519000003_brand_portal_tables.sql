-- Brand Portal Phase 2: brand_profiles, brand_products, brand_faqs, brand_assets, brand_content_drafts
-- 2026-05-19

-- ─────────────────────────────────────────────────────────────────────────────
-- brand_profiles（品牌主檔）
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_slug TEXT NOT NULL UNIQUE,
  -- 身份
  name_zh TEXT, name_en TEXT, name_ja TEXT,
  industry TEXT, sub_industry TEXT,
  founded_year INT,
  company_size TEXT CHECK (company_size IN ('1-10','11-50','51-200','200+')),
  about_zh TEXT, about_en TEXT,
  usp JSONB DEFAULT '[]'::jsonb,
  target_audience TEXT,
  -- 聯絡
  website_url TEXT,
  address_full TEXT,
  address_lat NUMERIC, address_lng NUMERIC,
  phone TEXT, email TEXT, whatsapp TEXT,
  opening_hours JSONB DEFAULT '{}'::jsonb,
  maps_url TEXT,
  -- 社群
  social_facebook TEXT, social_instagram TEXT,
  social_youtube TEXT, social_linkedin TEXT,
  -- AEO 信號
  primary_query TEXT,
  secondary_queries JSONB DEFAULT '[]'::jsonb,
  competitor_slugs JSONB DEFAULT '[]'::jsonb,
  key_stats JSONB DEFAULT '[]'::jsonb,
  certifications JSONB DEFAULT '[]'::jsonb,
  -- 權威信號
  authority_sources JSONB DEFAULT '[]'::jsonb,
  media_mentions JSONB DEFAULT '[]'::jsonb,
  awards JSONB DEFAULT '[]'::jsonb,
  testimonials JSONB DEFAULT '[]'::jsonb,
  -- 技術
  llms_txt_url TEXT,
  insight_slugs JSONB DEFAULT '[]'::jsonb,
  indexnow_key TEXT,
  -- 元
  profile_completeness INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON brand_profiles
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS brand_profiles_slug_idx ON brand_profiles (brand_slug);

-- ─────────────────────────────────────────────────────────────────────────────
-- brand_products（產品/服務目錄）
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_slug TEXT NOT NULL,
  name_zh TEXT, name_en TEXT,
  description TEXT,
  price_mop NUMERIC, price_hkd NUMERIC,
  sku TEXT,
  min_order INT DEFAULT 1,
  delivery_days INT,
  image_url TEXT,
  product_url TEXT,
  is_flagship BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brand_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON brand_products
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS brand_products_brand_idx ON brand_products (brand_slug, sort_order);

-- ─────────────────────────────────────────────────────────────────────────────
-- brand_faqs（FAQ 問答對）
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_faqs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_slug TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  lang TEXT DEFAULT 'zh' CHECK (lang IN ('zh','en','ja')),
  intent_type TEXT DEFAULT 'general' CHECK (intent_type IN ('general','product','location','price','comparison','trust')),
  is_published BOOLEAN DEFAULT false,
  schema_injected BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brand_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON brand_faqs
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS brand_faqs_brand_idx ON brand_faqs (brand_slug, is_published);

-- ─────────────────────────────────────────────────────────────────────────────
-- brand_assets（上傳檔案）
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_slug TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT,
  file_size_bytes INT,
  extracted_text TEXT,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending','processing','done','failed')),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON brand_assets
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS brand_assets_brand_idx ON brand_assets (brand_slug, uploaded_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- brand_content_drafts（AI 生成內容審批佇列）
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_content_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_slug TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('faq','insight','schema','llms_txt','social_post')),
  title TEXT,
  content TEXT NOT NULL,
  ai_model TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','published')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brand_content_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON brand_content_drafts
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS brand_content_drafts_brand_status_idx ON brand_content_drafts (brand_slug, status, created_at DESC);
