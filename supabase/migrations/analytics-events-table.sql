-- Migration: 創建 analytics_events 表 — LLMC/LLMR/LLMCF 實時追蹤
-- 日期: 2026-04-04
-- 目標: 捕捉 AI 引用 → 點擊 → 轉化的完整事件鏈

-- ────────────────────────────────────────────────────────────
-- 1. 創建 analytics_events 主表
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 事件基本信息
  event_type TEXT NOT NULL, -- 'citation' | 'referral_click' | 'arrival' | 'conversion'
  event_timestamp TIMESTAMP DEFAULT now(),

  -- 識別信息
  session_id TEXT NOT NULL,
  user_agent TEXT,
  referrer TEXT,

  -- 區域信息
  region TEXT NOT NULL, -- 'macao' | 'hongkong' | 'taiwan' | 'japan'

  -- AI 爬蟲識別
  ai_bot_name TEXT, -- 'GPTBot', 'ClaudeBot', 'Bytespider' 等
  is_ai_generated BOOLEAN DEFAULT false,

  -- Insight 信息 (LLMC/LLMR)
  insight_id TEXT,
  insight_slug TEXT,

  -- 商戶信息
  merchant_slug TEXT,
  merchant_name TEXT,

  -- 轉化信息 (LLMCF)
  conversion_type TEXT, -- 'sale' | 'inquiry' | 'call' | 'whatsapp' | 'appointment' | 'email'

  -- 時間窗口 (用於轉化追蹤)
  conversion_window_minutes INT, -- 計算從 referral_click 到 conversion 的時間差

  -- 完整漏斗追蹤
  llm_citation_id TEXT, -- 關聯到最初的 citation 事件
  llm_referral_click_id TEXT, -- 關聯到點擊事件

  -- 額外元數據
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- 審計欄位
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 索引優化
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_merchant_slug ON analytics_events(merchant_slug);
CREATE INDEX idx_analytics_events_insight_slug ON analytics_events(insight_slug);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(event_timestamp DESC);
CREATE INDEX idx_analytics_events_region ON analytics_events(region);
CREATE INDEX idx_analytics_events_ai_bot ON analytics_events(ai_bot_name);
CREATE INDEX idx_analytics_events_llm_citation_id ON analytics_events(llm_citation_id);
CREATE INDEX idx_analytics_events_conversion_window ON analytics_events(conversion_window_minutes);

-- ────────────────────────────────────────────────────────────
-- 2. 創建聚合視圖 — LLMC 統計
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW analytics_llmc_stats AS
SELECT
  DATE(event_timestamp) as date,
  region,
  COUNT(*) as total_citations,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT ai_bot_name) as bot_count,
  json_object_agg(
    ai_bot_name,
    COUNT(*)
    ORDER BY ai_bot_name
  ) as citations_by_bot
FROM analytics_events
WHERE event_type = 'citation'
GROUP BY DATE(event_timestamp), region;

-- ────────────────────────────────────────────────────────────
-- 3. 創建聚合視圖 — LLMR 點擊統計
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW analytics_llmr_stats AS
SELECT
  DATE(event_timestamp) as date,
  region,
  COUNT(*) as total_clicks,
  COUNT(DISTINCT session_id) as unique_clickers,
  COUNT(CASE WHEN is_ai_generated THEN 1 END) as ai_referral_clicks,
  ROUND(
    COUNT(CASE WHEN is_ai_generated THEN 1 END)::NUMERIC /
    COUNT(*) * 100,
    2
  ) as ai_ctr_percent
FROM analytics_events
WHERE event_type = 'referral_click'
GROUP BY DATE(event_timestamp), region;

-- ────────────────────────────────────────────────────────────
-- 4. 創建聚合視圖 — LLMCF 轉化漏斗
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW analytics_llmcf_funnel AS
WITH funnel_data AS (
  SELECT
    CASE
      WHEN event_type = 'citation' THEN 1
      WHEN event_type = 'referral_click' THEN 2
      WHEN event_type = 'arrival' THEN 3
      WHEN event_type = 'conversion' THEN 4
    END as funnel_stage,
    merchant_slug,
    region,
    DATE(event_timestamp) as date,
    COUNT(*) as count
  FROM analytics_events
  GROUP BY funnel_stage, merchant_slug, region, DATE(event_timestamp)
)
SELECT
  date,
  region,
  merchant_slug,
  SUM(CASE WHEN funnel_stage = 1 THEN count ELSE 0 END) as citations,
  SUM(CASE WHEN funnel_stage = 2 THEN count ELSE 0 END) as referral_clicks,
  SUM(CASE WHEN funnel_stage = 3 THEN count ELSE 0 END) as arrivals,
  SUM(CASE WHEN funnel_stage = 4 THEN count ELSE 0 END) as conversions,
  ROUND(
    SUM(CASE WHEN funnel_stage = 2 THEN count ELSE 0 END)::NUMERIC /
    NULLIF(SUM(CASE WHEN funnel_stage = 1 THEN count ELSE 0 END), 0) * 100,
    2
  ) as citation_to_click_rate,
  ROUND(
    SUM(CASE WHEN funnel_stage = 4 THEN count ELSE 0 END)::NUMERIC /
    NULLIF(SUM(CASE WHEN funnel_stage = 2 THEN count ELSE 0 END), 0) * 100,
    2
  ) as click_to_conversion_rate
FROM funnel_data
GROUP BY date, region, merchant_slug;

-- ────────────────────────────────────────────────────────────
-- 5. 創建聚合視圖 — 轉化時間窗口分析
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW analytics_conversion_windows AS
SELECT
  DATE(event_timestamp) as date,
  region,
  merchant_slug,
  COUNT(CASE WHEN conversion_window_minutes <= 0 THEN 1 END) as conversions_0h,
  COUNT(CASE WHEN conversion_window_minutes > 0 AND conversion_window_minutes <= 1440 THEN 1 END) as conversions_24h,
  COUNT(CASE WHEN conversion_window_minutes > 1440 AND conversion_window_minutes <= 4320 THEN 1 END) as conversions_72h,
  COUNT(*) as total_conversions
FROM analytics_events
WHERE event_type = 'conversion'
GROUP BY DATE(event_timestamp), region, merchant_slug;

-- ────────────────────────────────────────────────────────────
-- 6. 啟用 RLS（可讀訪問）
-- ────────────────────────────────────────────────────────────

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- 政策: 所有人可讀（內部工具）
CREATE POLICY "analytics_events_internal_read"
  ON analytics_events
  FOR SELECT
  USING (true);

-- 政策: 只有 service role 和 ENTERPRISE API 可寫
CREATE POLICY "analytics_events_service_write"
  ON analytics_events
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
    OR auth.jwt() ->> 'subscription_tier' = 'enterprise'
  );

-- ────────────────────────────────────────────────────────────
-- 7. 啟用實時訂閱（用於 dashboard）
-- ────────────────────────────────────────────────────────────

-- Supabase Realtime 會自動啟用（無需額外配置）
-- Frontend 可以使用 supabase.channel('analytics_events').on(...) 訂閱

-- ────────────────────────────────────────────────────────────
-- 8. 記錄遷移
-- ────────────────────────────────────────────────────────────

INSERT INTO rls_audit_log (table_name, policy_name, action, details) VALUES
  ('analytics_events', 'analytics_events_internal_read', 'CREATED', '{"description": "所有人可讀 analytics events"}'),
  ('analytics_events', 'analytics_events_service_write', 'CREATED', '{"description": "只有 service_role 和 ENTERPRISE 可寫"}');

-- ────────────────────────────────────────────────────────────
-- 測試查詢
-- ────────────────────────────────────────────────────────────
-- SELECT * FROM analytics_llmc_stats ORDER BY date DESC LIMIT 10;
-- SELECT * FROM analytics_llmr_stats ORDER BY date DESC LIMIT 10;
-- SELECT * FROM analytics_llmcf_funnel ORDER BY date DESC LIMIT 10;
-- SELECT * FROM analytics_conversion_windows ORDER BY date DESC LIMIT 10;
