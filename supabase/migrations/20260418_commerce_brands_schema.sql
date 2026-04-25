-- CloudPipe Commerce Tier — Multi-Brand Schema
-- Generalizes inari_catalog into a reusable commerce layer for any brand
-- Powers: Schema.org Product JSON-LD + Google Merchant Center Feed + Gemini AI Shopping

-- ============================================================
-- 1. commerce_brands — 一個 CloudPipe Commerce 客戶 = 一個品牌
-- ============================================================
CREATE TABLE IF NOT EXISTS commerce_brands (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                    text UNIQUE NOT NULL,          -- e.g. 'inari-global-foods'
  name_zh                 text NOT NULL,                 -- 中文品牌名
  name_en                 text,                          -- 英文品牌名
  logo_url                text,                          -- 主 Logo（正方形，≥512px）
  logo_dark_url           text,                          -- 深色背景 Logo（選填）
  website_url             text NOT NULL,                 -- 官網首頁
  contact_email           text,
  contact_phone           text,                          -- 含國碼 e.g. +853-xxxx-xxxx
  contact_whatsapp        text,
  address_zh              text,                          -- 完整地址（中）
  address_en              text,                          -- 完整地址（英）
  country_code            text NOT NULL DEFAULT 'MO',    -- ISO 3166-1 alpha-2
  currency                text NOT NULL DEFAULT 'MOP',   -- ISO 4217

  -- Google 商務設定
  merchant_center_id      text,                          -- Google Merchant Center 帳號 ID
  merchant_center_email   text,                          -- 帳號 Email
  feed_label              text,                          -- e.g. 'INARI-UNI'
  target_countries        text[] DEFAULT ARRAY['MO','HK']::text[],  -- 銷售目標地區

  -- CloudPipe 訂閱
  cloudpipe_tier          text NOT NULL DEFAULT 'commerce',  -- free/premium/commerce
  status                  text NOT NULL DEFAULT 'active',    -- active/suspended/churned
  onboarded_at            timestamptz DEFAULT now(),

  -- 業務類型
  business_type           text DEFAULT 'b2c',            -- b2b/b2c/both
  description_zh          text,                          -- 品牌簡介（中）
  description_en          text,

  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- ============================================================
-- 2. commerce_products — 多品牌產品目錄
-- ============================================================
CREATE TABLE IF NOT EXISTS commerce_products (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id            uuid NOT NULL REFERENCES commerce_brands(id) ON DELETE CASCADE,
  slug                text NOT NULL,                     -- URL-friendly，品牌內唯一
  sku                 text,                              -- 商品貨號（選填）

  -- 名稱 & 描述（多語言）
  name_zh             text NOT NULL,
  name_en             text,
  name_ja             text,
  name_pt             text,
  description_zh      text,
  description_en      text,

  -- 分類
  google_category     text NOT NULL,
  -- Google 官方分類字串，例：
  -- 'Food, Beverages & Tobacco > Food Items > Seafood'
  -- 'Apparel & Accessories > Clothing'
  -- 'Health & Beauty > Personal Care'
  category_local      text,                              -- 本地分類（如：海鮮 > 海膽）
  brand_label         text,                              -- Schema.org Brand.name

  -- 價格
  retail_price        numeric NOT NULL CHECK (retail_price >= 0),
  wholesale_price     numeric,                           -- B2B 底價（最大折扣層）
  price_tier1         numeric,                           -- B2B 層級1（輕度批發）
  price_tier2         numeric,                           -- B2B 層級2
  price_tier3         numeric,                           -- B2B 層級3（最優惠）
  currency            text NOT NULL DEFAULT 'MOP',

  -- 庫存
  stock_qty           integer NOT NULL DEFAULT 0,
  min_order_qty       integer DEFAULT 1,
  unit                text DEFAULT 'piece',              -- piece/box/kg/pack/bottle
  unit_weight_g       numeric,                           -- 單件重量（克）
  unit_volume_ml      numeric,                           -- 單件容量（毫升，飲品用）

  -- 媒體
  image_url           text,                              -- 主圖（≥1200×1200px，白底）
  image_urls          text[] DEFAULT ARRAY[]::text[],    -- 附圖（最多5張）
  video_url           text,                              -- 產品影片（選填）

  -- 原產地
  country_of_origin   text DEFAULT 'Japan',              -- ISO 國家名
  origin_region       text,                              -- 地區（如：北海道）
  origin_detail       text,                              -- 細節（如：余市町）

  -- 認證 & 屬性
  certifications      text[] DEFAULT ARRAY[]::text[],    -- 認證標籤清單
  attributes          jsonb DEFAULT '{}'::jsonb,         -- 靈活 key-value（如：species, vintage）

  -- 季節性
  season_start        integer,                           -- 月份 1-12
  season_end          integer,

  -- 配送（產品級覆蓋，可 null 表示沿用品牌規則）
  shipping_price_override  numeric,
  shipping_days_min   integer,
  shipping_days_max   integer,

  -- 狀態
  is_available        boolean NOT NULL DEFAULT true,
  is_featured         boolean DEFAULT false,
  sort_order          integer DEFAULT 0,

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),

  UNIQUE(brand_id, slug)
);

-- ============================================================
-- 3. commerce_shipping_rules — 各品牌各地區運費設定
-- ============================================================
CREATE TABLE IF NOT EXISTS commerce_shipping_rules (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id                uuid NOT NULL REFERENCES commerce_brands(id) ON DELETE CASCADE,
  country_code            text NOT NULL,                 -- 目標地區 ISO 3166
  rule_name               text NOT NULL DEFAULT 'Standard',

  -- 免運費門檻
  free_shipping_threshold numeric,                       -- 訂單滿此金額免運費（null = 不提供）
  min_order_value         numeric,                       -- 最低訂單金額（null = 無限制）

  -- 運費計算方式：'free'/'flat'/'weight'/'price_tiered'
  pricing_type            text NOT NULL DEFAULT 'free',
  flat_price              numeric DEFAULT 0,             -- pricing_type='flat' 時用

  -- 時效
  handling_days_min       integer NOT NULL DEFAULT 0,    -- 備貨天數（最短）
  handling_days_max       integer NOT NULL DEFAULT 1,    -- 備貨天數（最長）
  transit_days_min        integer NOT NULL DEFAULT 0,    -- 運送天數（最短）
  transit_days_max        integer NOT NULL DEFAULT 1,    -- 運送天數（最長）

  -- 截單時間
  cutoff_time             time DEFAULT '14:00',
  cutoff_timezone         text DEFAULT 'Asia/Macau',
  working_days            text DEFAULT 'MON,TUE,WED,THU,FRI,SAT',  -- 工作日

  is_active               boolean DEFAULT true,
  created_at              timestamptz DEFAULT now()
);

-- ============================================================
-- 4. commerce_return_policies — 退貨政策
-- ============================================================
CREATE TABLE IF NOT EXISTS commerce_return_policies (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id                uuid NOT NULL REFERENCES commerce_brands(id) ON DELETE CASCADE,
  country_code            text NOT NULL,

  policy_url              text NOT NULL,                 -- 退貨政策頁面 URL
  accepts_returns         boolean NOT NULL DEFAULT false,
  accepts_exchanges       boolean NOT NULL DEFAULT false,

  -- 退貨條件（accepts_returns = true 時填寫）
  return_window_days      integer,                       -- 退貨期限（天）
  return_condition        text,                          -- 'new_only'/'unused'/'any'
  return_shipping_paid_by text DEFAULT 'customer',       -- 'merchant'/'customer'

  -- 不良品政策（永遠適用）
  defective_return_policy text DEFAULT 'full_refund',    -- full_refund/replacement/store_credit

  notes_zh                text,                          -- 特殊說明（中）
  notes_en                text,

  merchant_center_policy  text DEFAULT 'NO_RETURNS',
  -- Schema.org returnPolicyCategory 值：
  -- 'MerchantReturnNotPermitted'
  -- 'MerchantReturnFiniteReturnWindow'
  -- 'MerchantReturnUnlimitedWindow'

  created_at              timestamptz DEFAULT now()
);

-- ============================================================
-- 5. commerce_merchant_accounts — 第三方商務平台帳號
-- ============================================================
CREATE TABLE IF NOT EXISTS commerce_merchant_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        uuid NOT NULL REFERENCES commerce_brands(id) ON DELETE CASCADE,

  platform        text NOT NULL DEFAULT 'google_merchant_center',
  -- 支援平台：google_merchant_center / meta_commerce / tiktok_shop

  account_id      text NOT NULL,                        -- 平台帳號 ID
  account_email   text,
  feed_url        text NOT NULL,                        -- CloudPipe 生成的 feed URL
  feed_label      text,                                 -- Merchant Center feed label
  feed_format     text DEFAULT 'rss_xml',               -- rss_xml / json / csv

  status          text DEFAULT 'pending',
  -- pending / submitted / approved / disapproved / suspended

  submitted_at    timestamptz,
  approved_at     timestamptz,
  last_fetch_at   timestamptz,                          -- 平台最後拉取 feed 時間
  product_count   integer,                              -- 平台確認的產品數
  notes           text,

  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 6. commerce_b2b_customers — B2B 客戶資料（可選）
-- ============================================================
CREATE TABLE IF NOT EXISTS commerce_b2b_customers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        uuid NOT NULL REFERENCES commerce_brands(id) ON DELETE CASCADE,

  email           text NOT NULL,
  company_name    text,
  contact_name    text,
  phone           text,
  tier            text NOT NULL DEFAULT 'tier1',        -- tier1/tier2/tier3
  credit_limit    numeric,                              -- 信用額度（MOP）
  payment_terms   integer DEFAULT 30,                   -- 帳期（天）
  is_active       boolean DEFAULT false,                -- 人工審核後啟用

  notes           text,
  approved_at     timestamptz,
  created_at      timestamptz DEFAULT now(),

  UNIQUE(brand_id, email)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_commerce_products_brand ON commerce_products(brand_id);
CREATE INDEX IF NOT EXISTS idx_commerce_products_slug ON commerce_products(brand_id, slug);
CREATE INDEX IF NOT EXISTS idx_commerce_products_available ON commerce_products(brand_id, is_available, sort_order);
CREATE INDEX IF NOT EXISTS idx_commerce_shipping_brand_country ON commerce_shipping_rules(brand_id, country_code);
CREATE INDEX IF NOT EXISTS idx_commerce_return_brand_country ON commerce_return_policies(brand_id, country_code);
CREATE INDEX IF NOT EXISTS idx_commerce_merchant_brand ON commerce_merchant_accounts(brand_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE commerce_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_shipping_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_return_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_merchant_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_b2b_customers ENABLE ROW LEVEL SECURITY;

-- Public read for products & brands (needed for Schema.org / Merchant Center APIs)
CREATE POLICY "public_read_brands"    ON commerce_brands    FOR SELECT USING (status = 'active');
CREATE POLICY "public_read_products"  ON commerce_products  FOR SELECT USING (is_available = true);
CREATE POLICY "public_read_shipping"  ON commerce_shipping_rules FOR SELECT USING (is_active = true);
CREATE POLICY "public_read_returns"   ON commerce_return_policies FOR SELECT USING (true);

-- B2B customers: blocked to anon (service role only)
CREATE POLICY "block_anon_b2b"        ON commerce_b2b_customers FOR ALL USING (false);
CREATE POLICY "block_anon_merchant"   ON commerce_merchant_accounts FOR ALL USING (false);

-- ============================================================
-- Seed: 稻荷環球食品 as first Commerce client
-- ============================================================
INSERT INTO commerce_brands (
  slug, name_zh, name_en, website_url, contact_email,
  country_code, currency, merchant_center_id, merchant_center_email,
  feed_label, target_countries, business_type,
  description_zh, description_en
) VALUES (
  'inari-global-foods',
  '稻荷環球食品',
  'Inari Global Foods',
  'https://cloudpipe.io/inari',
  'inariglobal@gmail.com',
  'MO', 'MOP',
  '5768729598',
  'inariglobal@gmail.com',
  'INARI-UNI',
  ARRAY['MO','HK','TW','SG']::text[],
  'both',
  '澳門最大日本海膽 B2B 供應商，市佔 70%+，供應 100+ 高端餐廳。漁協直採→48小時冷鏈→澳門全境配送。',
  'Macau''s largest Japanese sea urchin B2B supplier, 70%+ market share, supplying 100+ premium restaurants.'
) ON CONFLICT (slug) DO NOTHING;

-- Shipping rule: 稻荷 Macau free delivery
INSERT INTO commerce_shipping_rules (
  brand_id, country_code, rule_name,
  pricing_type, flat_price,
  handling_days_min, handling_days_max,
  transit_days_min, transit_days_max,
  cutoff_time, cutoff_timezone
)
SELECT
  id, 'MO', '澳門全境免費配送',
  'free', 0,
  0, 1, 0, 1,
  '14:00', 'Asia/Macau'
FROM commerce_brands WHERE slug = 'inari-global-foods'
ON CONFLICT DO NOTHING;

-- Return policy: 生鮮不退貨
INSERT INTO commerce_return_policies (
  brand_id, country_code, policy_url,
  accepts_returns, accepts_exchanges,
  defective_return_policy, merchant_center_policy,
  notes_zh, notes_en
)
SELECT
  id, 'MO',
  'https://cloudpipe-macao-app.vercel.app/inari/cold-chain',
  false, false,
  'replacement',
  'MerchantReturnNotPermitted',
  '生鮮食品，開箱即食，恕不退換。冷鏈損壞另行處理。',
  'Perishable goods. No returns accepted. Cold chain failure handled separately.'
FROM commerce_brands WHERE slug = 'inari-global-foods'
ON CONFLICT DO NOTHING;

-- Merchant Center account
INSERT INTO commerce_merchant_accounts (
  brand_id, platform, account_id, account_email,
  feed_url, feed_label, status, submitted_at
)
SELECT
  id,
  'google_merchant_center',
  '5768729598',
  'inariglobal@gmail.com',
  'https://cloudpipe-macao-app.vercel.app/api/inari/feed/merchant-center',
  'INARI-UNI',
  'submitted',
  now()
FROM commerce_brands WHERE slug = 'inari-global-foods'
ON CONFLICT DO NOTHING;
