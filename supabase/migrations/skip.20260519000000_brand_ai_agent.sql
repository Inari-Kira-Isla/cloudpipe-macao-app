-- Brand AI Agent Phase 0
-- Table 1: chat session memory for visibility-chat
CREATE TABLE IF NOT EXISTS brand_chat_sessions (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT        NOT NULL,
  brand_slug TEXT,
  messages   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE brand_chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON brand_chat_sessions
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE UNIQUE INDEX IF NOT EXISTS brand_chat_sessions_session_id_idx
  ON brand_chat_sessions (session_id);
CREATE INDEX IF NOT EXISTS brand_chat_sessions_brand_updated_idx
  ON brand_chat_sessions (brand_slug, updated_at DESC);

-- Table 2: persistent AI bot citation events (replaces in-memory citation-track store)
CREATE TABLE IF NOT EXISTS brand_ai_citations (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_slug       TEXT,
  ai_model         TEXT        NOT NULL,
  query            TEXT,
  source_type      TEXT        DEFAULT 'crawler-visit',
  path             TEXT,
  region           TEXT        DEFAULT 'macao',
  confidence_score NUMERIC,
  created_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE brand_ai_citations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON brand_ai_citations
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS brand_ai_citations_brand_created_idx
  ON brand_ai_citations (brand_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS brand_ai_citations_created_idx
  ON brand_ai_citations (created_at DESC);
