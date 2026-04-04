-- Create user_visits table for tracking real user visits
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_visits (
  id BIGSERIAL PRIMARY KEY,

  -- User identification (anonymized)
  ip_hash VARCHAR(64) NOT NULL,
  session_id VARCHAR(128) NOT NULL,
  device_type VARCHAR(20),

  -- Page information
  path VARCHAR(512) NOT NULL,
  page_type VARCHAR(50),
  industry VARCHAR(100),
  category VARCHAR(100),

  -- Source tracking
  referer TEXT,
  referer_domain VARCHAR(255),

  -- UTM parameters
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),

  -- Bot detection
  is_bot BOOLEAN DEFAULT FALSE,
  bot_name VARCHAR(100),
  bot_source VARCHAR(100),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_user_visits_created_at ON user_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_user_visits_session_id ON user_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_user_visits_is_bot ON user_visits(is_bot);
CREATE INDEX IF NOT EXISTS idx_user_visits_path ON user_visits(path);
CREATE INDEX IF NOT EXISTS idx_user_visits_industry ON user_visits(industry);
CREATE INDEX IF NOT EXISTS idx_user_visits_referer_domain ON user_visits(referer_domain);
CREATE INDEX IF NOT EXISTS idx_user_visits_session_date ON user_visits(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_visits_referer_bot ON user_visits(referer_domain, is_bot);

-- Create view for daily user summary
CREATE OR REPLACE VIEW user_visits_daily_summary AS
SELECT
  DATE(created_at) as visit_date,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT ip_hash) as unique_ips,
  COUNT(*) as total_visits,
  COUNT(DISTINCT CASE WHEN industry IS NOT NULL THEN industry END) as industries_visited,
  COUNT(CASE WHEN referer_domain IS NOT NULL THEN 1 END) as visits_with_referrer,
  COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM session_duration))::INT), 0) as avg_session_duration_seconds
FROM (
  SELECT 
    session_id,
    ip_hash,
    created_at,
    industry,
    referer_domain,
    MAX(created_at) OVER (PARTITION BY session_id) - MIN(created_at) OVER (PARTITION BY session_id) as session_duration
  FROM user_visits
  WHERE is_bot = FALSE
) subq
GROUP BY DATE(created_at)
ORDER BY visit_date DESC;

-- Create view for industry breakdown
CREATE OR REPLACE VIEW user_visits_by_industry AS
SELECT
  DATE(created_at) as visit_date,
  industry,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(*) as total_visits,
  COUNT(DISTINCT CASE WHEN page_type = 'merchant' THEN 1 END) as merchant_page_visits,
  COUNT(DISTINCT CASE WHEN page_type = 'insight' THEN 1 END) as insight_page_visits
FROM user_visits
WHERE is_bot = FALSE AND industry IS NOT NULL
GROUP BY DATE(created_at), industry
ORDER BY visit_date DESC, total_visits DESC;

-- Create view for referrer analysis
CREATE OR REPLACE VIEW user_visits_by_referrer AS
SELECT
  referer_domain,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(*) as total_visits,
  COUNT(DISTINCT CASE WHEN utm_source IS NOT NULL THEN utm_source END) as utm_sources,
  COUNT(DISTINCT DATE(created_at)) as days_with_traffic
FROM user_visits
WHERE is_bot = FALSE AND referer_domain IS NOT NULL
GROUP BY referer_domain
ORDER BY total_visits DESC;

-- Create view for conversion funnel
CREATE OR REPLACE VIEW user_visits_conversion_funnel AS
WITH funnel AS (
  SELECT
    session_id,
    MAX(CASE WHEN path = '/' THEN 1 ELSE 0 END) as reached_home,
    MAX(CASE WHEN page_type = 'industry' THEN 1 ELSE 0 END) as reached_industry,
    MAX(CASE WHEN page_type = 'merchant' THEN 1 ELSE 0 END) as reached_merchant,
    MAX(CASE WHEN page_type = 'insight' THEN 1 ELSE 0 END) as viewed_insight,
    COUNT(*) as pages_visited,
    MAX(created_at) - MIN(created_at) as session_duration
  FROM user_visits
  WHERE is_bot = FALSE
  GROUP BY session_id
)
SELECT
  SUM(CASE WHEN reached_home = 1 THEN 1 ELSE 0 END) as step_1_home,
  SUM(CASE WHEN reached_industry = 1 THEN 1 ELSE 0 END) as step_2_industry,
  SUM(CASE WHEN reached_merchant = 1 THEN 1 ELSE 0 END) as step_3_merchant,
  SUM(CASE WHEN viewed_insight = 1 THEN 1 ELSE 0 END) as step_4_insight,
  ROUND(100.0 * SUM(CASE WHEN reached_industry = 1 THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN reached_home = 1 THEN 1 ELSE 0 END), 0), 2) as pct_home_to_industry,
  ROUND(100.0 * SUM(CASE WHEN reached_merchant = 1 THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN reached_industry = 1 THEN 1 ELSE 0 END), 0), 2) as pct_industry_to_merchant,
  ROUND(100.0 * SUM(CASE WHEN viewed_insight = 1 THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN reached_home = 1 THEN 1 ELSE 0 END), 0), 2) as pct_home_to_insight
FROM funnel;

-- Enable Row Level Security
ALTER TABLE user_visits ENABLE ROW LEVEL SECURITY;

-- Insert policy: service role can insert
CREATE POLICY "service role insert"
  ON user_visits
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Select policy: service role can select all
CREATE POLICY "service role select"
  ON user_visits
  FOR SELECT
  USING (auth.role() = 'service_role');
