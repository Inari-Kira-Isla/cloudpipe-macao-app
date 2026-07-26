-- RouteScope: API event logging table
-- Tracks tier distribution, intent routing, and API effectiveness

CREATE TABLE IF NOT EXISTS api_events (
  id              bigserial PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now(),
  path            text        NOT NULL,
  method          text        NOT NULL DEFAULT 'GET',
  tier            text,        -- 'layer0' | 'layer1' | 'layer2'
  intent_route    text,        -- 'for-rag' | 'for-training' | 'for-research' | null
  api_key_prefix  text,        -- first 8 chars of key (not full key)
  bot_name        text,        -- null if human
  response_ms     integer,
  status_code     integer,
  ip_hash         text         -- SHA-256 of IP for privacy
);

CREATE INDEX IF NOT EXISTS api_events_created_at_idx ON api_events (created_at DESC);
CREATE INDEX IF NOT EXISTS api_events_tier_idx       ON api_events (tier);
CREATE INDEX IF NOT EXISTS api_events_path_idx       ON api_events (path);
CREATE INDEX IF NOT EXISTS api_events_intent_idx     ON api_events (intent_route);

ALTER TABLE api_events ENABLE ROW LEVEL SECURITY;
-- No permissive policies: anon/authenticated roles blocked; service role bypasses RLS
