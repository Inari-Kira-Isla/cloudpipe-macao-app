-- Brand RAG Knowledge Base: pgvector embeddings + FTS fallback
-- 2026-05-19

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Brand knowledge chunks (per brand, per content type)
CREATE TABLE IF NOT EXISTS brand_knowledge (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_slug  TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  content_type TEXT       NOT NULL CHECK (content_type IN ('faq','product','profile','asset','manual','contact')),
  source_id   TEXT,        -- FK reference to original row id
  metadata    JSONB       DEFAULT '{}'::jsonb,
  embedding   vector(1536),  -- MiniMax embo-01 / OpenAI ada-002 compatible
  fts_vector  TSVECTOR,   -- Fallback full-text search
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brand_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON brand_knowledge
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS brand_knowledge_brand_type_idx
  ON brand_knowledge (brand_slug, content_type);

CREATE INDEX IF NOT EXISTS brand_knowledge_fts_idx
  ON brand_knowledge USING GIN (fts_vector);

-- Note: ivfflat vector index created separately after first data insert
-- (requires data to determine list count; run manually after first sync):
-- CREATE INDEX brand_knowledge_vec_idx ON brand_knowledge
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- Auto-update fts_vector on insert/update
CREATE OR REPLACE FUNCTION update_brand_knowledge_fts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fts_vector = to_tsvector('simple', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brand_knowledge_fts_trigger
  BEFORE INSERT OR UPDATE ON brand_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_brand_knowledge_fts();

-- Unique index for upsert: brand_slug + content_type + source_id
CREATE UNIQUE INDEX IF NOT EXISTS brand_knowledge_upsert_key_idx
  ON brand_knowledge (brand_slug, content_type, source_id)
  WHERE source_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Vector similarity search RPC function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_brand_knowledge(
  query_embedding vector(1536),
  brand_slug_filter text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  content_type text,
  metadata jsonb,
  similarity float
)
LANGUAGE SQL STABLE AS $$
  SELECT
    id, content, content_type, metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM brand_knowledge
  WHERE brand_slug = brand_slug_filter
    AND embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
