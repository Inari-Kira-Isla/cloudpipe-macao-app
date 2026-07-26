-- ============================================================================
-- Migration: ai_referrals 加 session_id 欄位
-- Date: 2026-06-04
-- 根據: AI Revenue Attribution SDD L2 已 alive 但缺 session correlation
--
-- 目的:
--   1. 同 session 嘅多個 events 可以 join（referral → landing → WhatsApp click）
--   2. 建立 user journey 嘅基礎
--   3. 為 attribution_events 表預留 cross-table join 嘅 PK
--
-- 安全:
--   - ADD COLUMN NULLABLE 不影響現有 11 records
--   - 不需要 backfill（新 referral 開始填，舊 record 保留 NULL）
--   - 不破壞 RLS
-- ============================================================================

-- Step 1: ADD COLUMN
ALTER TABLE public.ai_referrals
  ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Step 2: 加 index 加速 session-based join
CREATE INDEX IF NOT EXISTS idx_ai_referrals_session
  ON public.ai_referrals(session_id, ts)
  WHERE session_id IS NOT NULL;

-- Step 3: comment 文檔
COMMENT ON COLUMN public.ai_referrals.session_id IS 'Cookie session ID (cp_sid); NULL for legacy records before 2026-06-04';

-- Step 4: 確認
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'ai_referrals' AND column_name = 'session_id';
