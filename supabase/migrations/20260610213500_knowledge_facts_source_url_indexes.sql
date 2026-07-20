-- Add source_url lookup indexes for knowledge_facts.
--
-- Production hotfix note:
-- For an already-live table, run the equivalent CREATE INDEX CONCURRENTLY
-- statements first to avoid blocking writes. These transaction-safe statements
-- are kept for normal migration replay and will no-op when the indexes exist.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_kf_source_url
    ON public.knowledge_facts (source_url)
    WHERE source_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kf_source_url_trgm
    ON public.knowledge_facts USING GIN (source_url gin_trgm_ops)
    WHERE source_url IS NOT NULL;
