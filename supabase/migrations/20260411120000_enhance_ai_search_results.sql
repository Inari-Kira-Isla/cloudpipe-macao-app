-- Enhance ai_search_results table with keyword extraction and grok platform support
ALTER TABLE ai_search_results ADD COLUMN IF NOT EXISTS keywords_extracted TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Update unique constraint to remove timestamp for better grouping
-- (Timestamps will vary for same platform/query/competitor)
DROP INDEX IF EXISTS ai_search_results_brand_slug_platform_query_competitor_name_timestamp_key;
ALTER TABLE ai_search_results DROP CONSTRAINT IF EXISTS ai_search_results_brand_slug_platform_query_competitor_name_timestamp_key;

-- Add new composite unique constraint without timestamp
ALTER TABLE ai_search_results ADD CONSTRAINT ai_search_results_unique_search
  UNIQUE(brand_slug, platform, query, competitor_name) DEFERRABLE INITIALLY DEFERRED;

-- Add index for faster keyword searches
CREATE INDEX IF NOT EXISTS idx_ai_search_keywords ON ai_search_results USING GIN(keywords_extracted);

-- Add partial index for mentioned entries
CREATE INDEX IF NOT EXISTS idx_ai_search_mentioned ON ai_search_results(brand_slug, platform) WHERE mentioned = true;

-- Comment on new column
COMMENT ON COLUMN ai_search_results.keywords_extracted IS '關鍵詞陣列 - 從搜尋結果提取的相關詞彙，用於分析內容相關性';
