-- Create ai_search_results table for tracking brand rankings across AI platforms
CREATE TABLE IF NOT EXISTS ai_search_results (
  id BIGSERIAL PRIMARY KEY,
  brand_slug TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'gemini', 'gpt', 'perplexity', 'claude'
  query TEXT NOT NULL,
  competitor_name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0, -- 排名位置（0 = 未提及）
  mentioned BOOLEAN DEFAULT false,
  citation_count INTEGER DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for fast queries
  UNIQUE(brand_slug, platform, query, competitor_name, timestamp)
);

CREATE INDEX idx_ai_search_brand_slug ON ai_search_results(brand_slug);
CREATE INDEX idx_ai_search_platform ON ai_search_results(platform);
CREATE INDEX idx_ai_search_competitor ON ai_search_results(competitor_name);
CREATE INDEX idx_ai_search_timestamp ON ai_search_results(timestamp DESC);

-- Grant permissions
ALTER TABLE ai_search_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON ai_search_results
  FOR SELECT USING (true);

CREATE POLICY "Allow service role write access" ON ai_search_results
  FOR INSERT WITH CHECK (true);
