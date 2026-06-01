-- 20260601_fix_mv_hkt_timezone.sql
-- Fix crawler stats MVs: use HKT (Asia/Hong_Kong) dates instead of UTC dates.
-- total_visits_1d: count from HKT midnight (not UTC midnight)
-- mv_crawler_daily_30d.day: use HKT date (not UTC date)

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Fix mv_crawler_total_visits_30d — total_visits_1d uses HKT midnight
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS public.mv_crawler_total_visits_30d CASCADE;
CREATE MATERIALIZED VIEW public.mv_crawler_total_visits_30d AS
SELECT
  COUNT(*)                                                                        AS total_visits_30d,
  COUNT(*) FILTER (WHERE ts >= NOW() - INTERVAL '7 days')                        AS total_visits_7d,
  COUNT(*) FILTER (
    WHERE ts >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Hong_Kong')
                           AT TIME ZONE 'Asia/Hong_Kong'
  )                                                                               AS total_visits_1d,
  COUNT(DISTINCT bot_name)                                                        AS unique_bots,
  NOW()                                                                           AS computed_at,
  NOW()                                                                           AS generated_at
FROM public.crawler_visits
WHERE ts >= NOW() - INTERVAL '30 days';

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_crawler_total_visits_uniq
  ON public.mv_crawler_total_visits_30d (computed_at);

-- ---------------------------------------------------------------------------
-- 4) Fix mv_crawler_daily_30d — day uses HKT date
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS public.mv_crawler_daily_30d CASCADE;
CREATE MATERIALIZED VIEW public.mv_crawler_daily_30d AS
SELECT
  (ts AT TIME ZONE 'Asia/Hong_Kong')::date             AS day,
  COALESCE(NULLIF(bot_owner, ''), 'unknown')            AS bot_owner,
  COUNT(*)                                              AS visit_count,
  NOW()                                                 AS computed_at
FROM public.crawler_visits
WHERE ts >= NOW() - INTERVAL '30 days'
GROUP BY 1, 2;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_crawler_daily_uniq
  ON public.mv_crawler_daily_30d (day, bot_owner);

CREATE INDEX IF NOT EXISTS idx_mv_crawler_daily_day
  ON public.mv_crawler_daily_30d (day DESC);

-- Grants
GRANT SELECT ON public.mv_crawler_total_visits_30d TO anon, authenticated, service_role;
GRANT SELECT ON public.mv_crawler_daily_30d        TO anon, authenticated, service_role;

COMMIT;
