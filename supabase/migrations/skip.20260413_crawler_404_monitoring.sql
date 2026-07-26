-- 為 crawler_visits 加 status_code 欄位追蹤 AI 爬蟲 404
-- 現有記錄預設 200（歷史資料均為成功訪問）

ALTER TABLE crawler_visits
  ADD COLUMN IF NOT EXISTS status_code INTEGER DEFAULT 200;

-- 建立 404 監控 view
CREATE OR REPLACE VIEW crawler_404_report AS
SELECT
  DATE_TRUNC('day', ts) AS date,
  bot_name,
  path,
  COUNT(*) AS attempts,
  MAX(ts) AS last_attempt
FROM crawler_visits
WHERE status_code = 404
  AND bot_name IS NOT NULL
GROUP BY 1, 2, 3
ORDER BY attempts DESC, date DESC;

COMMENT ON VIEW crawler_404_report IS 'AI 爬蟲 404 錯誤彙總 — 用於發現 AI 想爬但找不到的頁面';
