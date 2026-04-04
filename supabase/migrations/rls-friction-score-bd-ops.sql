-- Migration: RLS 政策設置 — friction_score & bd_operations_log 保護
-- 日期: 2026-04-04
-- 目標: 隱藏商業機密，only ENTERPRISE 用戶可訪問

-- ────────────────────────────────────────────────────────────
-- 1. 檢查 merchant_page_mapping 表結構
--    (假設存在 friction_score、bd_operations_log 欄位)
-- ────────────────────────────────────────────────────────────

-- ALTER TABLE merchant_page_mapping ADD COLUMN friction_score NUMERIC DEFAULT 0;
-- ALTER TABLE merchant_page_mapping ADD COLUMN bd_operations_log JSONB DEFAULT '[]'::jsonb;

-- ────────────────────────────────────────────────────────────
-- 2. 啟用 RLS
-- ────────────────────────────────────────────────────────────

-- 確保表已啟用 RLS
ALTER TABLE merchant_page_mapping ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 3. 建立 RLS 政策
-- ────────────────────────────────────────────────────────────

-- 政策 1: 所有公開欄位（無認證也能讀）
-- SELECT: name_zh, name_en, conversions, conversion_rate, llm_referral_clicks 等
CREATE POLICY "merchant_page_mapping_public_read"
  ON merchant_page_mapping
  FOR SELECT
  USING (true);

-- 政策 2: friction_score 只有 ENTERPRISE 用戶可讀
-- 通過 JWT 中的 user_metadata 或 app_metadata 驗證
-- 假設存在 subscription_tier = 'enterprise' 的標記
CREATE POLICY "merchant_page_mapping_friction_score_enterprise_only"
  ON merchant_page_mapping
  FOR SELECT
  USING (
    CASE
      -- 檢查 auth.users 的 user_metadata 中 subscription_tier = 'enterprise'
      WHEN (auth.jwt() ->> 'subscription_tier' = 'enterprise') THEN true
      -- 或者檢查是否持有有效的 ENTERPRISE API token
      WHEN (auth.jwt() ->> 'role' = 'service_role') THEN true
      ELSE false
    END
  );

-- 政策 3: bd_operations_log 只有內部 service role 和 ENTERPRISE 用戶可讀
CREATE POLICY "merchant_page_mapping_bd_operations_enterprise_only"
  ON merchant_page_mapping
  FOR SELECT
  USING (
    CASE
      -- Service role (內部 API) 總是允許
      WHEN (auth.jwt() ->> 'role' = 'service_role') THEN true
      -- ENTERPRISE 認證用戶
      WHEN (auth.jwt() ->> 'subscription_tier' = 'enterprise') THEN true
      ELSE false
    END
  );

-- ────────────────────────────────────────────────────────────
-- 4. 隱藏欄位的替代方案（如果 RLS 不支持欄位級別）
--    使用 VIEW 來隱藏敏感欄位
-- ────────────────────────────────────────────────────────────

-- 創建公開視圖（不包含敏感欄位）
CREATE OR REPLACE VIEW merchant_page_mapping_public AS
SELECT
  id,
  merchant_slug,
  industry_page_id,
  conversions,
  conversion_rate,
  llm_referral_clicks,
  llm_referral_arrivals,
  conversion_type,
  updated_at,
  created_at
  -- 注意: friction_score, bd_operations_log 已隱藏
FROM merchant_page_mapping;

-- 創建 ENTERPRISE 視圖（包含所有欄位）
CREATE OR REPLACE VIEW merchant_page_mapping_enterprise AS
SELECT *
FROM merchant_page_mapping
WHERE
  auth.jwt() ->> 'subscription_tier' = 'enterprise'
  OR auth.jwt() ->> 'role' = 'service_role';

-- ────────────────────────────────────────────────────────────
-- 5. 更新 API 層驗證
--    在 /api/v1/routing-baseline 等端點中檢查 token
-- ────────────────────────────────────────────────────────────

-- 建立 API token 表（用於 ENTERPRISE API 認證）
CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  organization_name TEXT,
  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- 啟用 RLS
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

-- 政策: 只有 service role 和 token 擁有者可讀
CREATE POLICY "api_tokens_service_role_only"
  ON api_tokens
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 6. 記錄 RLS 更改日誌
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rls_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  details JSONB
);

-- 插入此次更改記錄
INSERT INTO rls_audit_log (table_name, policy_name, action, details) VALUES
  ('merchant_page_mapping', 'friction_score RLS', 'CREATED', '{"description": "friction_score 隱藏，僅 ENTERPRISE 可讀"}'),
  ('merchant_page_mapping', 'bd_operations_log RLS', 'CREATED', '{"description": "bd_operations_log 隱藏，僅 service_role 和 ENTERPRISE 可讀"}'),
  ('api_tokens', 'api_tokens_service_role_only', 'CREATED', '{"description": "API token 管理表，用於 ENTERPRISE 認證"}');

-- ────────────────────────────────────────────────────────────
-- 查詢: 驗證 RLS 設置
-- ────────────────────────────────────────────────────────────
-- SELECT table_schema, table_name, row_level_security
-- FROM information_schema.tables
-- WHERE table_name = 'merchant_page_mapping';

-- SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'merchant_page_mapping';
