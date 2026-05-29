-- H7 sitemap_priority_cache: per-slug per-region per-lang computed priority cache
-- 用途：儲存 sitemap_priority_recompute.py 計算結果，供 sitemap-region.ts 即時讀取
-- 計算因子：age × lang × citation_gap × crawl_demand × commercial_weight
-- factors_json 範例：{"base":0.95,"citation":0.05,"crawl":0.05,"commercial":0.05}

CREATE TABLE IF NOT EXISTS public.sitemap_priority_cache (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL,
  region TEXT NOT NULL,
  lang TEXT NOT NULL,
  computed_priority NUMERIC(3,2) NOT NULL,
  base_priority NUMERIC(3,2),
  factors_json JSONB,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slug, region, lang)
);

CREATE INDEX IF NOT EXISTS idx_sitemap_priority_region
  ON public.sitemap_priority_cache(region, computed_priority DESC);

CREATE INDEX IF NOT EXISTS idx_sitemap_priority_computed_at
  ON public.sitemap_priority_cache(computed_at DESC);

ALTER TABLE public.sitemap_priority_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sitemap_priority_read_all ON public.sitemap_priority_cache;
CREATE POLICY sitemap_priority_read_all
  ON public.sitemap_priority_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);
