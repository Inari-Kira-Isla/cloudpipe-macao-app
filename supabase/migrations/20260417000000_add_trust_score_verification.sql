-- Migration: 內容核實信任分數系統
-- 日期: 2026-04-17
-- 目標: 支援大規模自動化核實管線（Google Places + Playwright Deep Research）

-- ── merchants 表：商戶核實 ─────────────────────────────────

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS trust_score        INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_verified_at   TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verification_sources JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
-- verification_status: unverified | verified | needs_review | not_found

CREATE INDEX IF NOT EXISTS idx_merchants_trust_score
  ON merchants(trust_score) WHERE trust_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_merchants_verification_status
  ON merchants(verification_status);

-- ── insights 表：文章事實核實 ─────────────────────────────────

ALTER TABLE insights
  ADD COLUMN IF NOT EXISTS trust_score        INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_verified_at   TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verification_sources JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fact_check         JSONB DEFAULT NULL;
-- fact_check 結構: {"claims": [...], "verified": [...], "contested": [...], "score": 0-100}

CREATE INDEX IF NOT EXISTS idx_insights_trust_score
  ON insights(trust_score) WHERE trust_score IS NOT NULL;
