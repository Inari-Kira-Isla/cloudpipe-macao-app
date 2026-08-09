-- ============================================================
-- crawler_visits: 加「AI 爬蟲讀取耗時」儀錶
-- 背景：2026-08-08 /omni-audit — crawler_visits 完全冇任何 duration /
--       response_time / ttfb 欄位，「AI 爬蟲讀取耗時」全鏈零可觀測性。
--       唯一真跑嘅耗時信號係 crawler_integrity_gate.py 由外部探 3 條頁，
--       每 6 小時一次 —— 覆蓋率近乎零，而且探測 UA 係假 Googlebot。
--
-- 呢條 migration 只加欄位，nullable、冇 DEFAULT，唔改任何現有行。
-- ============================================================

-- 1. 耗時數值（毫秒）。nullable：舊行同埋量唔到嘅新行一律 NULL，
--    絕對唔可以填 DEFAULT 值 —— 一個假常數比冇數據更差（見 status_code
--    寫死 200 嘅教訓，同一張表已經踩過一次）。
ALTER TABLE crawler_visits
  ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;

-- 2. 量度範圍標籤。呢個唔係裝飾 —— 唔同寫入點量到嘅「耗時」語義唔同，
--    冇呢欄就會將 middleware 分段耗時同真 TTFB 溝埋一齊做平均，
--    整出一個睇落有數但實際冇意義嘅指標。
--    現行值：
--      'middleware' = src/middleware.ts 由 middleware 入口到派發 tracking
--                     嗰一刻嘅耗時（含 supabase auth.getUser() round-trip）。
--                     ⚠ 呢個係 server TTFB 嘅**下限**，唔係端到端 TTFB：
--                     middleware 行完之後仲要行 route handler / ISR 讀取 /
--                     render / 網絡傳輸，嗰啲完全唔喺呢個數字入面。
--      NULL         = 冇量度（舊行、或者寫入點量唔到）。
--    將來如果加到真 TTFB（例如經 Server-Timing 或 Vercel log drain 回填），
--    請用新 scope 值（例如 'ttfb'），唔好直接覆蓋 'middleware' 嘅語義。
ALTER TABLE crawler_visits
  ADD COLUMN IF NOT EXISTS response_time_scope TEXT;

COMMENT ON COLUMN crawler_visits.response_time_ms IS
  '請求處理耗時（毫秒）。語義由 response_time_scope 決定；NULL = 未量度。禁止填預設值。';

COMMENT ON COLUMN crawler_visits.response_time_scope IS
  'response_time_ms 量到嘅係邊一段：middleware = middleware 分段耗時（TTFB 下限，非端到端）；NULL = 未量度。';

-- 3. 報表用 partial index：只索引真有量度嘅行（現階段係少數），
--    避免掃全表。site + ts 對齊現有查詢型態（見 crawler_visits_indexes_and_retention.sql）。
CREATE INDEX IF NOT EXISTS idx_crawler_visits_response_time
  ON crawler_visits(site, ts DESC)
  WHERE response_time_ms IS NOT NULL;

-- ============================================================
-- ⚠ APPLY 狀態：**未 apply 到 production**。
--    呢個 repo 嘅 supabase/migrations 唔係自動跑 —— 已 apply 嘅檔案會改名
--    加 `skip.` 前綴（見 skip.20260413_crawler_404_monitoring.sql，
--    正正就係當初加 status_code 嗰條）。即係話呢度嘅 migration 一律靠人手
--    喺有權限嘅工具跑（Supabase SQL Editor / Management API / supabase CLI
--    連 production project）。
--
--    落地步驟（需要有 production 權限嘅人執行）：
--      1) 喺 Supabase SQL Editor 貼曬呢個檔案內容跑一次；
--      2) 驗證：
--         SELECT column_name, data_type, is_nullable
--         FROM information_schema.columns
--         WHERE table_name = 'crawler_visits'
--           AND column_name IN ('response_time_ms','response_time_scope');
--      3) 跑完之後將本檔案改名加 `skip.` 前綴，跟返 repo 慣例。
--
--    ⚠ 未 apply 之前唔好 deploy middleware 改動：PostgREST 對未知欄位會
--      回 400（PGRST204 column not found），crawler_visits 寫入會全數失敗，
--      middleware 會 fallback 去 Inari buffer，等同爬蟲追蹤靜默斷線。
--      正確次序：先 apply migration → 再 deploy app。
-- ============================================================
