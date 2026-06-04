-- MAPE Loop Core Tables — Phase 3a Harness Engineering (H1)
-- Date: 2026-05-29
-- Source: ~/Documents/KiraVault/Knowledge/Decisions/2026-05-28-encyclopedia-learning-loop-strategy.md §五 H1
-- Purpose:
--   Bootstrap the 4 tables that power the MAPE (Measure / Analyze / Plan / Execute / Learn)
--   closed-loop for the 7 encyclopedias (MO/HK/TW/JP/MY/GLOBAL/JBL):
--     1. encyclopedia_edges     — entity edge graph (cross-region substrate)
--     2. citation_gap_queue     — Analyze-stage queue produced from prompt_runs + insights audits
--     3. prompt_library         — fixed measurement panel (CEO-curated)
--     4. prompt_runs            — daily measurement output per AI engine
--
-- Safety:
--   - No DROP IF EXISTS — these are NEW tables; never recreate if migration is re-applied.
--   - RLS enabled on all 4 tables; anon SELECT only on encyclopedia_edges (others are internal queues).
--   - Apply via `supabase db push` only after CEO review (do NOT auto-apply from sub-agent).
--
-- Migration target: Supabase project cloudpipe-macao-app (main app DB, not inari-production).

-- ============================================================================
-- 1. encyclopedia_edges — entity edge graph for cross-region spider-web
-- ============================================================================
CREATE TABLE public.encyclopedia_edges (
  id BIGSERIAL PRIMARY KEY,
  from_entity_slug TEXT NOT NULL,
  from_region      TEXT NOT NULL CHECK (from_region IN ('MO','HK','TW','JP','MY','GLOBAL','JBL')),
  to_entity_slug   TEXT NOT NULL,
  to_region        TEXT NOT NULL CHECK (to_region   IN ('MO','HK','TW','JP','MY','GLOBAL','JBL')),
  edge_type        TEXT NOT NULL CHECK (edge_type IN (
    'sameAs','about','mentions','relatedTo','sourcedBy','locatedIn','ingredientOf'
  )),
  confidence       NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  source_evidence  JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (from_entity_slug, from_region, to_entity_slug, to_region, edge_type)
);

CREATE INDEX idx_edges_from ON public.encyclopedia_edges (from_region, from_entity_slug);
CREATE INDEX idx_edges_to   ON public.encyclopedia_edges (to_region,   to_entity_slug);

ALTER TABLE public.encyclopedia_edges ENABLE ROW LEVEL SECURITY;

-- Edges are public read (drive cross-region spider-web rendering at runtime).
CREATE POLICY edges_read_all
  ON public.encyclopedia_edges
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ============================================================================
-- 2. citation_gap_queue — Analyze-stage queue
-- ============================================================================
CREATE TABLE public.citation_gap_queue (
  id                    BIGSERIAL PRIMARY KEY,
  gap_type              TEXT NOT NULL CHECK (gap_type IN (
    'query_gap','source_gap','merchant_gap','crosslink_gap','freshness_gap'
  )),
  target_entity_slug    TEXT,
  target_region         TEXT,
  target_insight_slug   TEXT,
  priority              INT  DEFAULT 50,
  evidence              JSONB,
  status                TEXT DEFAULT 'open' CHECK (status IN (
    'open','planned','executing','done','dropped'
  )),
  planned_action        TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ
);

-- Partial index — hot path is "next open gap by priority"
CREATE INDEX idx_gap_open_priority
  ON public.citation_gap_queue (status, priority DESC)
  WHERE status = 'open';

ALTER TABLE public.citation_gap_queue ENABLE ROW LEVEL SECURITY;
-- Internal queue — no anon SELECT policy; service-role only.


-- ============================================================================
-- 3. prompt_library — fixed measurement panel
-- ============================================================================
CREATE TABLE public.prompt_library (
  id                       BIGSERIAL PRIMARY KEY,
  prompt_text              TEXT NOT NULL,
  intent_category          TEXT,            -- 'find-merchant' | 'compare' | 'how-to' | ...
  target_region            TEXT,
  expected_cited_entities  TEXT[],
  active                   BOOLEAN DEFAULT true,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.prompt_library ENABLE ROW LEVEL SECURITY;
-- CEO-curated prompts; not exposed to anon.


-- ============================================================================
-- 4. prompt_runs — daily measurement results per AI engine
-- ============================================================================
CREATE TABLE public.prompt_runs (
  id                    BIGSERIAL PRIMARY KEY,
  prompt_id             BIGINT REFERENCES public.prompt_library(id) ON DELETE CASCADE,
  ai_engine             TEXT NOT NULL,      -- 'chatgpt' | 'perplexity' | 'claude' | 'gemini'
  run_date              DATE NOT NULL,
  brand_mentioned       BOOLEAN,
  url_cited             BOOLEAN,
  cited_url             TEXT,
  top_rank              INT,
  competitor_share      JSONB,
  raw_response_excerpt  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prompt_runs_date_engine
  ON public.prompt_runs (run_date DESC, ai_engine);

ALTER TABLE public.prompt_runs ENABLE ROW LEVEL SECURITY;
-- Raw measurement data; not exposed to anon.
