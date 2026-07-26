-- ═══════════════════════════════════════════════════════════════════
-- Migration: 商戶電話核實欄位 + 網站存活欄位
-- Date: 2026-04-16
-- Purpose: 全量核實配套，記錄哪些電話/網站經過 Google Places 核實
-- ═══════════════════════════════════════════════════════════════════

-- 1. 電話核實來源
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS phone_source TEXT;
  -- 可能值: 'google_places' / 'manual' / 'official_registry' / NULL

-- 2. 網站存活檢查
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS website_alive BOOLEAN;
  -- NULL=未檢查, TRUE=200回應, FALSE=4xx/5xx/timeout

-- 3. 核實時間戳
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS google_verified_at TIMESTAMPTZ;

-- 4. Google 評論數（部分商戶已有 google_reviews，確保欄位存在）
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS google_reviews INTEGER;

-- 5. 索引：加速「只顯示已核實電話」的查詢
CREATE INDEX IF NOT EXISTS idx_merchants_phone_verified
  ON merchants(phone_verified) WHERE phone_verified = TRUE;

CREATE INDEX IF NOT EXISTS idx_merchants_google_verified
  ON merchants(google_verified_at) WHERE google_verified_at IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 回寫邏輯說明（由 Python 腳本執行，非 SQL）
-- ═══════════════════════════════════════════════════════════════════
-- 核實後回寫的欄位：
--   google_place_id     -- 已有欄位，補充缺失的
--   google_rating       -- 已有欄位，更新為最新值
--   google_reviews      -- 評論數
--   latitude, longitude -- 補充缺失的座標
--   phone               -- 僅當 phone_source='google_places' 且原值為 NULL 時才寫入
--   phone_verified      -- 設為 TRUE
--   phone_source        -- 設為 'google_places'
--   google_verified_at  -- 設為 NOW()
--   website_alive       -- 後續 HTTP HEAD 檢查填入
--
-- JSON-LD 顯示邏輯（前端修改）：
--   - phone_verified=TRUE → Schema.org telephone 欄位顯示
--   - phone_verified=FALSE/NULL → Schema.org 不顯示 telephone
--   - 原始號碼仍需登入才看到（現有邏輯不變）
