-- Migration: sea_urchin_customers
-- Run this in Supabase SQL Editor

-- Customer profiles (private domain capture)
CREATE TABLE IF NOT EXISTS sea_urchin_customers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text,
  phone         text,
  email         text UNIQUE,
  customer_type text DEFAULT 'retail',
  -- customer_type: 'retail' | 'restaurant' | 'chef' | 'vip'
  source        text DEFAULT 'landing_page',
  -- source: 'landing_page' | 'whatsapp' | 'instagram' | 'referral' | 'facebook'
  delivery_area text,
  lang          text DEFAULT 'zh',
  notes         text,
  tier          text DEFAULT 'bronze',
  -- tier: 'bronze' | 'silver' | 'gold' | 'restaurant'
  total_orders  integer DEFAULT 0,
  total_spent   numeric(10,2) DEFAULT 0,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  last_order_at timestamptz
);

-- Membership tiers reference
CREATE TABLE IF NOT EXISTS sea_urchin_tiers (
  id          text PRIMARY KEY,
  name_zh     text NOT NULL,
  name_en     text,
  min_orders  integer DEFAULT 0,
  benefits    jsonb DEFAULT '[]'::jsonb,
  discount_pct numeric(4,2) DEFAULT 0
);

INSERT INTO sea_urchin_tiers VALUES
  ('bronze',     '銅級會員', 'Bronze',     0,  '["優先通知"]'::jsonb,          0),
  ('silver',     '銀級會員', 'Silver',     3,  '["5% 折扣", "優先通知"]'::jsonb, 5),
  ('gold',       '金級會員', 'Gold',       8,  '["10% 折扣", "專屬客服", "優先配送"]'::jsonb, 10),
  ('restaurant', '餐廳批發', 'Restaurant', 0,  '["批發價格", "發票", "週固定供貨"]'::jsonb, 0)
ON CONFLICT (id) DO NOTHING;

-- Orders / inquiries
CREATE TABLE IF NOT EXISTS sea_urchin_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     uuid REFERENCES sea_urchin_customers(id) ON DELETE SET NULL,
  product_name    text,
  quantity_grams  integer,
  amount_mop      numeric(10,2),
  delivery_date   date,
  delivery_area   text,
  status          text DEFAULT 'inquiry',
  -- status: 'inquiry' | 'confirmed' | 'paid' | 'delivered' | 'cancelled'
  source          text,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Loyalty events (referrals, purchases, reviews)
CREATE TABLE IF NOT EXISTS sea_urchin_loyalty (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES sea_urchin_customers(id) ON DELETE CASCADE,
  event_type  text,
  -- 'purchase' | 'referral' | 'tasting' | 'review' | 'signup'
  points      integer DEFAULT 0,
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sue_customers_phone   ON sea_urchin_customers(phone);
CREATE INDEX IF NOT EXISTS idx_sue_customers_email   ON sea_urchin_customers(email);
CREATE INDEX IF NOT EXISTS idx_sue_customers_type    ON sea_urchin_customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_sue_customers_source  ON sea_urchin_customers(source);
CREATE INDEX IF NOT EXISTS idx_sue_orders_customer   ON sea_urchin_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sue_orders_status     ON sea_urchin_orders(status);
CREATE INDEX IF NOT EXISTS idx_sue_loyalty_customer  ON sea_urchin_loyalty(customer_id);

-- RLS
ALTER TABLE sea_urchin_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sea_urchin_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sea_urchin_tiers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sea_urchin_loyalty   ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for API routes)
-- Anon can only INSERT into customers (registration)
CREATE POLICY "anon_insert_customers" ON sea_urchin_customers
  FOR INSERT TO anon WITH CHECK (true);

-- Anon can read tiers (public)
CREATE POLICY "anon_read_tiers" ON sea_urchin_tiers
  FOR SELECT TO anon USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sue_customers_updated_at
  BEFORE UPDATE ON sea_urchin_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sue_orders_updated_at
  BEFORE UPDATE ON sea_urchin_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
