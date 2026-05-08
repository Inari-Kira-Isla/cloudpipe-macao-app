-- 加入搜尋詞追蹤欄位到 ai_referrals
-- Task #4 + #5：AI 引流搜尋詞展示系統

ALTER TABLE ai_referrals
  ADD COLUMN IF NOT EXISTS search_query TEXT,      -- 用戶的原始搜尋詞（從 beacon payload 傳入）
  ADD COLUMN IF NOT EXISTS ai_platform  TEXT;      -- 標準化平台名（perplexity / chatgpt / claude / gemini 等）

-- 搜尋詞索引（用於快速聚合 Top 10）
CREATE INDEX IF NOT EXISTS idx_ai_referrals_search_query
  ON ai_referrals(search_query, ts DESC)
  WHERE search_query IS NOT NULL;

-- ai_platform 索引（已有 referrer_source，但 ai_platform 是正規化後的值）
CREATE INDEX IF NOT EXISTS idx_ai_referrals_platform
  ON ai_referrals(ai_platform, ts DESC)
  WHERE ai_platform IS NOT NULL;
