-- Add verification tracking fields to merchants table
-- Used by MiniMax 24/7 merchant verification daemon

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_sources jsonb DEFAULT '[]'::jsonb;

-- verified_at: last verification timestamp (ISO 8601)
-- verified_sources: array of source objects, e.g.:
--   [{"name": "Google Maps", "field": "address_zh", "confidence": 0.95},
--    {"name": "澳門旅遊局", "field": "opening_hours", "confidence": 0.90}]

COMMENT ON COLUMN merchants.verified_at IS 'Last data verification timestamp (MiniMax + Serper)';
COMMENT ON COLUMN merchants.verified_sources IS 'JSON array of verification sources per field';

-- Index for querying unverified merchants
CREATE INDEX IF NOT EXISTS idx_merchants_verified_at ON merchants(verified_at ASC NULLS FIRST);
