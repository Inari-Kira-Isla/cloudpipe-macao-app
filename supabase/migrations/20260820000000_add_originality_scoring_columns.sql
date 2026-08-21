-- Migration: 原創性評分持久化欄位
-- 日期: 2026-08-20
-- 背景: originality-scorer.ts 計算原創性分數後，scripts/batch-score-insights.ts
--       會 UPDATE insights SET originality_score/originality_grade/citation_worthy，
--       但 insights 表冇呢三個欄位，儲存一律靜默失敗（PGRST204 column not found）。
--       board 票關鍵詞：「originality-scorer.ts TypeScript 編譯錯誤」
--       「新增原創性評分欄位」。
-- 範圍: 純新增 nullable 欄位，唔改唔刪任何現有欄位/資料。

ALTER TABLE insights
  ADD COLUMN IF NOT EXISTS originality_score  INTEGER DEFAULT NULL,   -- 0-100，calculateOriginalityScore() 總分
  ADD COLUMN IF NOT EXISTS originality_grade  TEXT DEFAULT NULL,      -- 'A' | 'B' | 'C' | 'D' | 'F'
  ADD COLUMN IF NOT EXISTS citation_worthy    BOOLEAN DEFAULT NULL;   -- score >= ORIGINALITY_CONFIG.CITATION_THRESHOLD

-- 選填 CHECK：只接受演算法實際會產生的等級值，避免手工寫入垃圾值（不影響現有 NULL 資料）
ALTER TABLE insights
  ADD CONSTRAINT insights_originality_grade_check
  CHECK (originality_grade IS NULL OR originality_grade IN ('A','B','C','D','F'));

CREATE INDEX IF NOT EXISTS idx_insights_originality_score
  ON insights(originality_score) WHERE originality_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_insights_citation_worthy
  ON insights(citation_worthy) WHERE citation_worthy IS TRUE;
