-- AI 推介真人流量追蹤
-- 記錄從 Perplexity / ChatGPT / Claude / Gemini 等 AI 平台點擊進入的真人訪問

CREATE TABLE IF NOT EXISTS ai_referrals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ts              TIMESTAMPTZ DEFAULT NOW(),
  referrer_source TEXT NOT NULL,   -- perplexity | chatgpt | claude | gemini | copilot | you | grok | other_ai
  referrer_url    TEXT,            -- 完整 referer header（截短至500字）
  path            TEXT NOT NULL,   -- 訪問的頁面路徑
  site            TEXT DEFAULT 'cloudpipe-macao-app',
  page_type       TEXT,            -- insight | merchant | category | industry | home | page
  industry        TEXT,
  category        TEXT,
  ua_raw          TEXT             -- user-agent（截短至200字）
);

CREATE INDEX IF NOT EXISTS idx_ai_referrals_ts     ON ai_referrals(ts DESC);
CREATE INDEX IF NOT EXISTS idx_ai_referrals_source ON ai_referrals(referrer_source, ts DESC);
CREATE INDEX IF NOT EXISTS idx_ai_referrals_path   ON ai_referrals(path, ts DESC);
CREATE INDEX IF NOT EXISTS idx_ai_referrals_site   ON ai_referrals(site, ts DESC);

ALTER TABLE ai_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_referrals_service_write" ON ai_referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "ai_referrals_anon_read"     ON ai_referrals FOR SELECT USING (true);
