-- Commerce Merchant Center Status System
-- 1. 加上架審核機制到 commerce_products
-- 2. 從 inari_catalog 複製資料（保留原表不動）
-- 3. 自動分析上架條件，設定初始 mc_status
-- 4. 建 readiness view 供管理員審核

-- ============================================================
-- Step 1: 在 commerce_products 加上架狀態欄位
-- ============================================================
ALTER TABLE commerce_products
  ADD COLUMN IF NOT EXISTS mc_status text NOT NULL DEFAULT 'draft',
  -- draft         → 剛複製進來，待審核
  -- approved      → 已審核，納入 Merchant Center feed
  -- excluded      → 人工排除（如 B2B 專屬，不對外公開）
  -- paused        → 暫停上架（如季節性缺貨）
  -- needs_image   → 自動標記：無主圖，Merchant Center 拒絕
  -- needs_price   → 自動標記：無售價
  -- needs_desc    → 自動標記：無描述（AI 引用效果差）

  ADD COLUMN IF NOT EXISTS mc_exclude_reason text,
  -- 排除/暫停的原因（人工填寫或自動填入）

  ADD COLUMN IF NOT EXISTS mc_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS mc_approved_by text,
  -- 誰在什麼時間核准上架

  ADD COLUMN IF NOT EXISTS source_table text DEFAULT 'manual',
  -- 資料來源：'inari_catalog' / 'manual' / 'api_sync'

  ADD COLUMN IF NOT EXISTS source_id uuid;
  -- 來源表的原始 id（方便追溯）

-- 上架狀態索引（feed route 主要過濾條件）
CREATE INDEX IF NOT EXISTS idx_commerce_products_mc_status
  ON commerce_products(brand_id, mc_status);

-- ============================================================
-- Step 2: 從 inari_catalog 複製資料到 commerce_products
-- （inari_catalog 保持不變，這是一次鏡射複製）
-- ============================================================
INSERT INTO commerce_products (
  brand_id,
  slug,
  name_zh, name_en, name_ja,
  description_zh, description_en,
  google_category,
  category_local,
  brand_label,
  retail_price,
  wholesale_price,
  currency,
  stock_qty,
  min_order_qty,
  unit,
  unit_weight_g,
  image_url,
  image_urls,
  country_of_origin,
  origin_region,
  origin_detail,
  certifications,
  attributes,
  season_start,
  season_end,
  is_available,
  is_featured,
  sort_order,
  source_table,
  source_id,
  -- 自動評估上架狀態（見 Step 3 邏輯）
  mc_status,
  mc_exclude_reason
)
SELECT
  b.id AS brand_id,
  c.slug,
  c.name_zh, c.name_en, c.name_ja,
  c.description_zh, c.description_en,
  'Food, Beverages & Tobacco > Food Items > Seafood' AS google_category,
  '海鮮 > 海膽' AS category_local,
  '稻荷環球食品' AS brand_label,
  c.retail_price,
  c.wholesale_price,
  'MOP' AS currency,
  c.stock_qty,
  COALESCE(c.min_order_qty, 1),
  COALESCE(c.unit, 'piece'),
  c.unit_weight_g,
  c.image_url,
  COALESCE(c.image_urls, ARRAY[]::text[]),
  'Japan' AS country_of_origin,
  c.origin_region,
  c.origin_detail,
  COALESCE(c.certifications, ARRAY[]::text[]),
  -- 把 species 放進 attributes（inari 特有欄位）
  jsonb_build_object(
    'species', c.species,
    'source', 'inari_catalog'
  ) AS attributes,
  c.season_start,
  c.season_end,
  c.is_available,
  COALESCE(c.is_featured, false),
  COALESCE(c.sort_order, 0),
  'inari_catalog' AS source_table,
  c.id AS source_id,

  -- ── 自動上架資格評估 ──────────────────────────────────────
  CASE
    -- 沒有主圖 → Merchant Center 必拒
    WHEN c.image_url IS NULL OR c.image_url = ''
      THEN 'needs_image'
    -- 沒有售價
    WHEN c.retail_price IS NULL OR c.retail_price = 0
      THEN 'needs_price'
    -- 沒有中文描述（AI 引用效果差）
    WHEN c.description_zh IS NULL OR length(c.description_zh) < 20
      THEN 'needs_desc'
    -- 通過基本檢查 → 待人工最終審核
    ELSE 'draft'
  END AS mc_status,

  CASE
    WHEN c.image_url IS NULL OR c.image_url = ''
      THEN '缺少主圖：Merchant Center 要求 1200×1200px 以上白底圖片'
    WHEN c.retail_price IS NULL OR c.retail_price = 0
      THEN '缺少零售售價'
    WHEN c.description_zh IS NULL OR length(c.description_zh) < 20
      THEN '缺少產品描述（至少20字）'
    ELSE NULL
  END AS mc_exclude_reason

FROM inari_catalog c
CROSS JOIN (
  SELECT id FROM commerce_brands WHERE slug = 'inari-global-foods'
) b
-- 避免重複插入（如果已有相同 brand+slug 就跳過）
ON CONFLICT (brand_id, slug) DO UPDATE SET
  -- 更新資料但保留人工設定的 mc_status（如果已審核就不覆蓋）
  name_zh          = EXCLUDED.name_zh,
  name_en          = EXCLUDED.name_en,
  description_zh   = EXCLUDED.description_zh,
  retail_price     = EXCLUDED.retail_price,
  wholesale_price  = EXCLUDED.wholesale_price,
  stock_qty        = EXCLUDED.stock_qty,
  image_url        = EXCLUDED.image_url,
  image_urls       = EXCLUDED.image_urls,
  certifications   = EXCLUDED.certifications,
  attributes       = EXCLUDED.attributes,
  updated_at       = now();
  -- 注意：mc_status 在 ON CONFLICT 時不更新，保留人工審核結果

-- ============================================================
-- Step 3: 上架資格分析 View（管理員審核介面用）
-- ============================================================
CREATE OR REPLACE VIEW v_commerce_mc_readiness AS
SELECT
  b.name_zh                                          AS brand,
  p.slug,
  p.name_zh,
  p.retail_price,
  p.stock_qty,
  p.mc_status,
  p.mc_exclude_reason,
  p.mc_approved_at,

  -- 逐項檢查上架條件
  CASE WHEN p.image_url IS NOT NULL AND p.image_url != ''
    THEN '✅' ELSE '❌ 缺圖' END                    AS img_check,

  CASE WHEN p.retail_price > 0
    THEN '✅' ELSE '❌ 缺價' END                    AS price_check,

  CASE WHEN length(COALESCE(p.description_zh,'')) >= 20
    THEN '✅' ELSE '⚠️ 描述短' END                  AS desc_check,

  CASE WHEN p.name_en IS NOT NULL AND p.name_en != ''
    THEN '✅' ELSE '⚠️ 無英文名' END                AS name_en_check,

  CASE WHEN p.stock_qty > 0
    THEN '✅ 有貨' ELSE '⚠️ 缺貨（仍可送出，標 out_of_stock）'
  END                                                AS stock_check,

  -- 整體建議
  CASE
    WHEN p.image_url IS NULL OR p.image_url = ''
      THEN '🔴 不能上架：需先提供產品圖片'
    WHEN p.retail_price IS NULL OR p.retail_price = 0
      THEN '🔴 不能上架：需填寫售價'
    WHEN p.mc_status = 'approved'
      THEN '🟢 已核准上架'
    WHEN p.mc_status = 'excluded'
      THEN '⚫ 已排除（' || COALESCE(p.mc_exclude_reason,'') || '）'
    WHEN p.mc_status = 'paused'
      THEN '🟡 暫停中（' || COALESCE(p.mc_exclude_reason,'') || '）'
    WHEN length(COALESCE(p.description_zh,'')) < 20
      THEN '🟡 建議補充描述後再上架'
    ELSE '🔵 待人工審核（執行 approve 操作）'
  END                                                AS recommendation

FROM commerce_products p
JOIN commerce_brands b ON b.id = p.brand_id
ORDER BY b.name_zh, p.sort_order;

-- ============================================================
-- Step 4: 管理員用 Helper Functions
-- ============================================================

-- 核准單一產品上架
CREATE OR REPLACE FUNCTION approve_for_merchant_center(
  p_brand_slug text,
  p_product_slug text,
  p_approved_by text DEFAULT 'admin'
)
RETURNS text AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE commerce_products p
  SET
    mc_status      = 'approved',
    mc_approved_at = now(),
    mc_approved_by = p_approved_by,
    mc_exclude_reason = NULL
  FROM commerce_brands b
  WHERE p.brand_id = b.id
    AND b.slug = p_brand_slug
    AND p.slug = p_product_slug
    -- 確認有圖片才能核准
    AND p.image_url IS NOT NULL AND p.image_url != '';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RETURN 'ERROR: 產品不存在或缺少圖片，無法核准';
  END IF;
  RETURN 'OK: ' || p_product_slug || ' 已核准上架';
END;
$$ LANGUAGE plpgsql;

-- 排除產品（B2B 專屬、不適合公開等）
CREATE OR REPLACE FUNCTION exclude_from_merchant_center(
  p_brand_slug text,
  p_product_slug text,
  p_reason text
)
RETURNS text AS $$
BEGIN
  UPDATE commerce_products p
  SET
    mc_status         = 'excluded',
    mc_exclude_reason = p_reason,
    mc_approved_at    = NULL
  FROM commerce_brands b
  WHERE p.brand_id = b.id
    AND b.slug = p_brand_slug
    AND p.slug = p_product_slug;

  RETURN 'OK: ' || p_product_slug || ' 已排除，原因：' || p_reason;
END;
$$ LANGUAGE plpgsql;

-- 暫停（季節性缺貨）
CREATE OR REPLACE FUNCTION pause_merchant_center_listing(
  p_brand_slug text,
  p_product_slug text,
  p_reason text DEFAULT '季節性暫停'
)
RETURNS text AS $$
BEGIN
  UPDATE commerce_products p
  SET
    mc_status         = 'paused',
    mc_exclude_reason = p_reason
  FROM commerce_brands b
  WHERE p.brand_id = b.id
    AND b.slug = p_brand_slug
    AND p.slug = p_product_slug;

  RETURN 'OK: ' || p_product_slug || ' 已暫停';
END;
$$ LANGUAGE plpgsql;

-- 同步 inari_catalog 庫存到 commerce_products（定期執行）
CREATE OR REPLACE FUNCTION sync_inari_catalog_stock()
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE commerce_products cp
  SET
    stock_qty  = ic.stock_qty,
    updated_at = now()
  FROM inari_catalog ic
  WHERE cp.source_table = 'inari_catalog'
    AND cp.source_id = ic.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
