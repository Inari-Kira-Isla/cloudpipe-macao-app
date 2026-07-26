-- ============================================================================
-- Migration: attribution_events 表建立
-- Date: 2026-06-04
-- 根據: AI Revenue Attribution Loop SDD 2026-06-04
--
-- 目的:
--   建立 9 type funnel event 追蹤表 + RLS
--   Phase 1 / 1.5：landing_view → ... → conversion_confirmed
--
-- 依賴:
--   ai_referrals.session_id（同日 P1 已 commit ec466a，待 CEO apply）
--
-- 安全:
--   - 新表獨立 CHECK constraint（不沿用舊 entity_type whitelist）
--   - RLS: service_write (INSERT) + anon_no_read (block public SELECT)
--   - service_role 可 SELECT 全部
-- ============================================================================

-- Step 1: 建表
CREATE TABLE IF NOT EXISTS public.attribution_events (
  event_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   TEXT NOT NULL,
  event_type   TEXT NOT NULL CHECK (event_type IN (
    'landing_view',
    'page_engaged',
    'whatsapp_click',
    'inquiry_form_open',
    'inquiry_form_submit',
    'phone_call_click',
    'email_click',
    'external_share',
    'conversion_confirmed'
  )),
  event_time   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- AI source attribution
  ai_source    TEXT,
  keyword      TEXT,

  -- Page context
  landing_url  TEXT,
  referrer     TEXT,
  user_agent   TEXT,
  ip_hash      TEXT,

  -- Event-specific data
  event_data   JSONB,

  -- 業務 link
  brand_slug   TEXT,
  insight_slug TEXT,
  merchant_slug TEXT
);

-- Step 2: Indexes
CREATE INDEX IF NOT EXISTS idx_ae_session ON public.attribution_events(session_id, event_time);
CREATE INDEX IF NOT EXISTS idx_ae_source  ON public.attribution_events(ai_source, event_time);
CREATE INDEX IF NOT EXISTS idx_ae_brand   ON public.attribution_events(brand_slug, event_time);
CREATE INDEX IF NOT EXISTS idx_ae_type    ON public.attribution_events(event_type, event_time);

-- Step 3: RLS
ALTER TABLE public.attribution_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ae_service_write"
  ON public.attribution_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "ae_anon_no_read"
  ON public.attribution_events
  FOR SELECT
  USING (false);

CREATE POLICY "ae_service_read"
  ON public.attribution_events
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Step 4: Comments
COMMENT ON TABLE public.attribution_events IS 'AI-to-Revenue Attribution funnel events';
COMMENT ON COLUMN public.attribution_events.session_id IS 'Cookie session ID (cp_sid), 與 ai_referrals.session_id 對齊';
COMMENT ON COLUMN public.attribution_events.event_type IS '9 funnel stages from landing_view to conversion_confirmed';
COMMENT ON COLUMN public.attribution_events.ai_source IS 'AI engine: chatgpt/perplexity/copilot/google_aimode/claude/...';
COMMENT ON COLUMN public.attribution_events.event_data IS 'Event-specific JSONB (form fields, click target, etc)';

-- Step 5: 確認
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'attribution_events'
ORDER BY ordinal_position;
