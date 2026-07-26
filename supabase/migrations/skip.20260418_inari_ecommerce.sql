-- ================================================================
-- 稻荷環球食品 電商框架 Migration
-- Run: supabase db query --linked --file supabase/migrations/20260418_inari_ecommerce.sql
-- ================================================================

-- ── 1. Products ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inari_catalog (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  name_zh         text NOT NULL,
  name_en         text,
  name_ja         text,
  description_zh  text,
  description_en  text,
  species         text,           -- 馬糞雲丹 / 紫海膽 / 赤海膽 / 白海膽
  origin_region   text,           -- 北海道 / 青森 / 岩手 / 長崎
  origin_detail   text,           -- e.g. 知床半島
  season_start    int,            -- 月份 1-12
  season_end      int,
  unit            text DEFAULT '板盒',    -- 板盒 / 木箱 / 公斤
  unit_weight_g   int,            -- 重量（克）
  min_order_qty   int DEFAULT 1,  -- 最低訂購量
  retail_price    numeric(10,2),  -- B2C 定價（MOP）
  wholesale_price numeric(10,2),  -- B2B 批發價（RLS 保護）
  stock_qty       int DEFAULT 0,
  is_available    boolean DEFAULT true,
  is_featured     boolean DEFAULT false,
  image_url       text,
  image_urls      text[],
  certifications  text[],         -- ['michelin_partner', 'black_pearl_supplier']
  schema_json     jsonb,          -- 預建 Schema.org Product JSON-LD
  sort_order      int DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── 2. B2B Customers ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS b2b_customers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name    text NOT NULL,
  contact_name    text,
  email           text NOT NULL,
  phone           text,
  address         text,
  region          text DEFAULT 'MO',  -- MO / HK / TW
  tier            text DEFAULT 'tier3' CHECK (tier IN ('tier1','tier2','tier3')),
  -- tier1 = 米芝蓮/黑珍珠餐廳（最低批發價）
  -- tier2 = 高端餐廳（標準批發價）
  -- tier3 = 一般 B2B（基本批發價）
  credit_limit    numeric(10,2) DEFAULT 0,
  payment_terms   text DEFAULT 'prepaid',  -- prepaid / net-15 / net-30
  is_active       boolean DEFAULT false,   -- 需要 Kira 手動核准
  notes           text,
  approved_at     timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── 3. Orders ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inari_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no        text UNIQUE NOT NULL DEFAULT 'INR-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6),
  customer_id     uuid REFERENCES b2b_customers(id),
  customer_email  text NOT NULL,   -- for guest B2C orders
  order_type      text DEFAULT 'b2b' CHECK (order_type IN ('b2b', 'b2c')),
  status          text DEFAULT 'pending' CHECK (status IN (
                    'pending', 'confirmed', 'processing',
                    'shipped', 'delivered', 'cancelled'
                  )),
  items           jsonb NOT NULL DEFAULT '[]',
  -- [{product_id, slug, name_zh, qty, unit_price, subtotal}]
  subtotal        numeric(10,2),
  shipping_fee    numeric(10,2) DEFAULT 0,
  total           numeric(10,2),
  currency        text DEFAULT 'MOP',
  shipping_addr   text,
  delivery_date   date,
  cold_chain_log  jsonb DEFAULT '[]',
  -- [{timestamp, location, temperature_c, status}]
  payment_method  text,           -- stripe / bank_transfer / mpay
  payment_status  text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded')),
  stripe_session  text,
  notes           text,
  internal_notes  text,           -- Kira only
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inari_catalog_slug    ON inari_catalog(slug);
CREATE INDEX IF NOT EXISTS idx_inari_catalog_avail   ON inari_catalog(is_available, sort_order);
CREATE INDEX IF NOT EXISTS idx_b2b_customers_user     ON b2b_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_b2b_customers_email    ON b2b_customers(email);
CREATE INDEX IF NOT EXISTS idx_inari_orders_no        ON inari_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_inari_orders_customer  ON inari_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_inari_orders_status    ON inari_orders(status);

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE inari_catalog  ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_customers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inari_orders    ENABLE ROW LEVEL SECURITY;

-- inari_catalog: anon can see everything EXCEPT wholesale_price
-- (wholesale_price hidden via application logic, not column-level RLS)
CREATE POLICY "products_public_read" ON inari_catalog
  FOR SELECT USING (is_available = true);

CREATE POLICY "products_admin_all" ON inari_catalog
  FOR ALL USING (auth.jwt() ->> 'email' = 'inariglobal@gmail.com');

-- b2b_customers: only own record + Kira admin
CREATE POLICY "b2b_own_record" ON b2b_customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "b2b_admin_all" ON b2b_customers
  FOR ALL USING (auth.jwt() ->> 'email' = 'inariglobal@gmail.com');

CREATE POLICY "b2b_insert_self" ON b2b_customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- inari_orders: own orders + Kira admin
CREATE POLICY "orders_own" ON inari_orders
  FOR SELECT USING (
    customer_email = auth.jwt() ->> 'email'
    OR customer_id IN (SELECT id FROM b2b_customers WHERE user_id = auth.uid())
  );

CREATE POLICY "orders_insert_auth" ON inari_orders
  FOR INSERT WITH CHECK (
    customer_email = auth.jwt() ->> 'email'
  );

CREATE POLICY "orders_admin_all" ON inari_orders
  FOR ALL USING (auth.jwt() ->> 'email' = 'inariglobal@gmail.com');

-- ── Seed: 4 sample products ───────────────────────────────────────
INSERT INTO inari_catalog (slug, name_zh, name_en, name_ja, species, origin_region, origin_detail, season_start, season_end, unit, unit_weight_g, min_order_qty, retail_price, wholesale_price, is_featured, certifications, sort_order)
VALUES
  ('hokkaido-bafun-uni',   '北海道馬糞雲丹', 'Hokkaido Bafun Uni', '北海道馬糞ウニ', '馬糞雲丹', '北海道', '知床半島', 6, 9,  '板盒', 250, 5,  980, 720, true,  ARRAY['michelin_partner','black_pearl_supplier'], 1),
  ('aomori-murasaki-uni',  '青森紫海膽',     'Aomori Murasaki Uni','青森紫ウニ',     '紫海膽',   '青森',   '大間',   4, 8,  '板盒', 200, 5,  750, 540, false, ARRAY['michelin_partner'],                        2),
  ('iwate-aka-uni',        '岩手赤海膽',     'Iwate Aka Uni',      '岩手赤ウニ',     '赤海膽',   '岩手',   '三陸',   5, 9,  '板盒', 200, 5,  820, 600, false, ARRAY[]::text[],                                           3),
  ('nagasaki-shiro-uni',   '長崎白海膽',     'Nagasaki Shiro Uni', '長崎白ウニ',     '白海膽',   '長崎',   '五島列島', 3, 7, '板盒', 150, 10, 680, 490, false, ARRAY[]::text[],                                           4)
ON CONFLICT (slug) DO NOTHING;
