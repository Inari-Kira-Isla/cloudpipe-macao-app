-- FAQ AEO Intent Layer
-- Phase 1: 新增 intent 管理欄位到 merchant_faqs + 建立輔助表
-- 目標：讓 AI 爬蟲能識別 FAQ 意圖、優先級、時效性

-- ── 1. 升級 merchant_faqs 表 ─────────────────────────────────────────────────
ALTER TABLE merchant_faqs
  ADD COLUMN IF NOT EXISTS question_intent  TEXT,
  ADD COLUMN IF NOT EXISTS competition_level TEXT DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS citation_count    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority_score    NUMERIC(4,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_dynamic        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMPTZ;

COMMENT ON COLUMN merchant_faqs.question_intent IS
  'AEO intent: check_hours | check_price | check_stock | compare | find_location | book | delivery | seasonal | contact | general';
COMMENT ON COLUMN merchant_faqs.competition_level IS
  'Keyword competition: low | medium | high';
COMMENT ON COLUMN merchant_faqs.citation_count IS
  'Times this FAQ answer was cited by an AI (tracked via referer)';
COMMENT ON COLUMN merchant_faqs.priority_score IS
  'System-computed priority: (100 - competition) * 0.4 + freshness * 0.3 + citation * 0.2 + premium_bonus * 0.1';
COMMENT ON COLUMN merchant_faqs.is_dynamic IS
  'True = answer is generated from live DB data (not static text)';

-- Indexes for intent-based queries
CREATE INDEX IF NOT EXISTS merchant_faqs_intent_idx    ON merchant_faqs(question_intent);
CREATE INDEX IF NOT EXISTS merchant_faqs_priority_idx  ON merchant_faqs(priority_score DESC);
CREATE INDEX IF NOT EXISTS merchant_faqs_citation_idx  ON merchant_faqs(citation_count DESC) WHERE citation_count > 0;

-- ── 2. business_hours 表 ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_hours (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id  UUID        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  day_of_week  INTEGER     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  -- 0=Sunday, 1=Monday, ..., 6=Saturday
  open_time    TIME,
  close_time   TIME,
  is_closed    BOOLEAN     DEFAULT false,
  special_note TEXT,       -- e.g. "最後落單 21:30" / "午市 12:00-14:30 晚市 18:00-22:30"
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(merchant_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS business_hours_merchant_idx ON business_hours(merchant_id);

COMMENT ON TABLE business_hours IS
  'Per-merchant weekly operating hours. Used to generate dynamic check_hours FAQ answers.';

-- ── 3. merchant_products 表 ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_products (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id    UUID        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  product_name   TEXT        NOT NULL,
  product_name_en TEXT,
  category       TEXT,       -- e.g. seafood / drink / treatment / course
  price_note     TEXT,       -- e.g. "MOP 280/100g" or "MOP 150-350" (descriptive)
  is_signature   BOOLEAN     DEFAULT false,
  is_seasonal    BOOLEAN     DEFAULT false,
  season_label   TEXT,       -- e.g. "北海道馬糞海膽當季 (3-6月)"
  is_available   BOOLEAN     DEFAULT true,
  origin         TEXT,       -- e.g. "北海道" / "長崎"
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS merchant_products_merchant_idx ON merchant_products(merchant_id);
CREATE INDEX IF NOT EXISTS merchant_products_signature_idx ON merchant_products(merchant_id, is_signature) WHERE is_signature = true;

COMMENT ON TABLE merchant_products IS
  'Key products/menu items per merchant. Drives check_price, check_stock, compare, seasonal FAQ answers.';

-- ── 4. seasonal_info 表 ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seasonal_info (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     UUID        REFERENCES merchants(id) ON DELETE CASCADE,
  industry        TEXT,       -- NULL = merchant-specific, set = industry-wide
  district        TEXT,
  season_type     TEXT        NOT NULL,  -- e.g. 'chinese_new_year' | 'summer' | 'seafood_peak'
  start_date      DATE,
  end_date        DATE,
  description_zh  TEXT,
  description_en  TEXT,
  affects_hours   BOOLEAN     DEFAULT false,
  affects_menu    BOOLEAN     DEFAULT false,
  is_active       BOOLEAN     DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seasonal_info_merchant_idx  ON seasonal_info(merchant_id);
CREATE INDEX IF NOT EXISTS seasonal_info_industry_idx  ON seasonal_info(industry);
CREATE INDEX IF NOT EXISTS seasonal_info_dates_idx     ON seasonal_info(start_date, end_date);
CREATE INDEX IF NOT EXISTS seasonal_info_active_idx    ON seasonal_info(is_active) WHERE is_active = true;

COMMENT ON TABLE seasonal_info IS
  'Seasonal events/availability per merchant or industry. Drives seasonal FAQ answers.';

-- ── 5. faq_type → question_intent 映射（批量回填）────────────────────────────
-- 執行一次性回填，把現有 faq_type 對應到 question_intent
-- 後續由 Python 腳本細化（加入 priority_score 計算）
UPDATE merchant_faqs SET question_intent = CASE faq_type
  WHEN 'hours'         THEN 'check_hours'
  WHEN 'price'         THEN 'check_price'
  WHEN 'location'      THEN 'find_location'
  WHEN 'transport'     THEN 'find_location'
  WHEN 'booking'       THEN 'book'
  WHEN 'delivery'      THEN 'delivery'
  WHEN 'specialty'     THEN 'compare'
  WHEN 'diet'          THEN 'compare'
  WHEN 'contact'       THEN 'contact'
  WHEN 'wifi'          THEN 'check_stock'
  WHEN 'parking'       THEN 'find_location'
  WHEN 'certification' THEN 'compare'
  WHEN 'language'      THEN 'contact'
  WHEN 'insurance'     THEN 'check_price'
  ELSE                      'general'
END
WHERE question_intent IS NULL;

-- ── 6. 初始 priority_score 設定（基於 intent，不含 industry bonus）──────────
-- Industry bonus 由 Python 腳本 faq_intent_backfill.py 補充（JOIN categories）
-- check_price = 8.5, compare = 8.0, seasonal = 7.5, check_stock = 7.0
-- check_hours = 6.0, find_location/contact = 5.5, book/delivery = 5.0, general = 4.0
UPDATE merchant_faqs
SET priority_score = CASE question_intent
    WHEN 'check_price'   THEN 8.5
    WHEN 'compare'       THEN 8.0
    WHEN 'seasonal'      THEN 7.5
    WHEN 'check_stock'   THEN 7.0
    WHEN 'check_hours'   THEN 6.0
    WHEN 'contact'       THEN 5.5
    WHEN 'find_location' THEN 5.5
    WHEN 'book'          THEN 5.0
    WHEN 'delivery'      THEN 5.0
    ELSE                      4.0
  END
WHERE priority_score = 0;
