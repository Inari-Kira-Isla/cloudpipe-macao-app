-- Analytics events table for tracking user interactions
-- Used by: ClickTracker component, conversion-track API, brand-funnel API
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,          -- arrival, click, conversion, page-view
  session_id VARCHAR(128),
  user_agent TEXT,
  referrer TEXT,
  region VARCHAR(20) DEFAULT 'macao',
  is_ai_generated BOOLEAN DEFAULT FALSE,
  merchant_slug VARCHAR(200),
  conversion_type VARCHAR(50),              -- whatsapp, call, email, claim
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_merchant_slug ON analytics_events(merchant_slug);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_is_ai ON analytics_events(is_ai_generated);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);

-- RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role insert analytics"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service role select analytics"
  ON analytics_events FOR SELECT
  USING (auth.role() = 'service_role');
