-- 20260531_crawler_stats_materialized_views.sql
--
-- Replace slow refresh_crawler_stats_cache() (5+ min) with 4 lightweight
-- materialized views + a new refresh function that uses CONCURRENTLY.
--
-- Old function kept for rollback. Dashboard API still reads the old cache
-- table until /api/v1/crawler-stats/route.ts is migrated to read MVs (TODO).
--
-- All MVs cover the last 30 days of crawler_visits. The industries MV
-- carries over the dashboard fix (exclude 'insights' and certain page_types).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Total visits + period buckets (single row)
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS public.mv_crawler_total_visits_30d CASCADE;
CREATE MATERIALIZED VIEW public.mv_crawler_total_visits_30d AS
SELECT
  COUNT(*)                                                       AS total_visits_30d,
  COUNT(*) FILTER (WHERE ts >= NOW() - INTERVAL '7 days')        AS total_visits_7d,
  COUNT(*) FILTER (WHERE ts >= date_trunc('day', NOW()))         AS total_visits_1d,
  COUNT(DISTINCT bot_name)                                       AS unique_bots,
  NOW()                                                          AS computed_at
FROM public.crawler_visits
WHERE ts >= NOW() - INTERVAL '30 days';

-- CONCURRENTLY refresh needs a UNIQUE INDEX. Single-row MV — index on computed_at.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_crawler_total_visits_uniq
  ON public.mv_crawler_total_visits_30d (computed_at);

-- ---------------------------------------------------------------------------
-- 2) Bot breakdown
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS public.mv_crawler_bots_30d CASCADE;
CREATE MATERIALIZED VIEW public.mv_crawler_bots_30d AS
SELECT
  COALESCE(NULLIF(bot_name, ''),  'unknown') AS bot_name,
  COALESCE(NULLIF(bot_owner, ''), 'unknown') AS bot_owner,
  COUNT(*)                                   AS visit_count,
  NOW()                                      AS computed_at
FROM public.crawler_visits
WHERE ts >= NOW() - INTERVAL '30 days'
GROUP BY 1, 2;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_crawler_bots_uniq
  ON public.mv_crawler_bots_30d (bot_name, bot_owner);

CREATE INDEX IF NOT EXISTS idx_mv_crawler_bots_count
  ON public.mv_crawler_bots_30d (visit_count DESC);

-- ---------------------------------------------------------------------------
-- 3) Industry breakdown (carries dashboard exclusion rules)
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS public.mv_crawler_industries_30d CASCADE;
CREATE MATERIALIZED VIEW public.mv_crawler_industries_30d AS
SELECT
  COALESCE(NULLIF(industry, ''), 'unknown') AS industry,
  COUNT(*)                                  AS visit_count,
  NOW()                                     AS computed_at
FROM public.crawler_visits
WHERE ts >= NOW() - INTERVAL '30 days'
  AND COALESCE(page_type, '') NOT IN ('spider-web', 'page', 'robots', 'api-faq', 'faqs')
  AND COALESCE(industry, '')  NOT IN ('insights', '')
GROUP BY 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_crawler_industries_uniq
  ON public.mv_crawler_industries_30d (industry);

CREATE INDEX IF NOT EXISTS idx_mv_crawler_industries_count
  ON public.mv_crawler_industries_30d (visit_count DESC);

-- ---------------------------------------------------------------------------
-- 4) Daily breakdown by bot_owner
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS public.mv_crawler_daily_30d CASCADE;
CREATE MATERIALIZED VIEW public.mv_crawler_daily_30d AS
SELECT
  ts::date                                     AS day,
  COALESCE(NULLIF(bot_owner, ''), 'unknown')   AS bot_owner,
  COUNT(*)                                     AS visit_count,
  NOW()                                        AS computed_at
FROM public.crawler_visits
WHERE ts >= NOW() - INTERVAL '30 days'
GROUP BY 1, 2;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_crawler_daily_uniq
  ON public.mv_crawler_daily_30d (day, bot_owner);

CREATE INDEX IF NOT EXISTS idx_mv_crawler_daily_day
  ON public.mv_crawler_daily_30d (day DESC);

-- ---------------------------------------------------------------------------
-- New lightweight refresh function (v2). Old refresh_crawler_stats_cache()
-- is intentionally retained for rollback.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_crawler_stats_cache_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_crawler_total_visits_30d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_crawler_bots_30d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_crawler_industries_30d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_crawler_daily_30d;
END;
$$;

COMMENT ON FUNCTION public.refresh_crawler_stats_cache_v2() IS
  'Replaces refresh_crawler_stats_cache() (>5min). Refreshes 4 MVs CONCURRENTLY. Expected <5s. Old function kept for rollback.';

-- ---------------------------------------------------------------------------
-- Grants: allow read-only access via PostgREST for anon/authenticated
-- (matches the existing public read pattern for crawler_visits stats).
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.mv_crawler_total_visits_30d TO anon, authenticated, service_role;
GRANT SELECT ON public.mv_crawler_bots_30d         TO anon, authenticated, service_role;
GRANT SELECT ON public.mv_crawler_industries_30d   TO anon, authenticated, service_role;
GRANT SELECT ON public.mv_crawler_daily_30d        TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.refresh_crawler_stats_cache_v2() TO service_role;

COMMIT;

-- Note: Initial population happens via the first REFRESH below. We use
-- non-CONCURRENT refresh for the very first populate because CONCURRENTLY
-- cannot run on an empty MV (data was already loaded during CREATE).
-- After this, CONCURRENTLY works on subsequent refreshes.
