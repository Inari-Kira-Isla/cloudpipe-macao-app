-- ============================================================
-- crawler_stats_cache — Single-row auto-refreshing summary table
-- All consumers (macao page, dashboard, brand dashboard, etc.)
-- read from here. pg_cron refreshes every 5 minutes.
-- Date: 2026-04-12
-- ============================================================

-- 1. Create the cache table (single row, id always = 1)
CREATE TABLE IF NOT EXISTS crawler_stats_cache (
  id                   INTEGER PRIMARY KEY DEFAULT 1,

  -- Core counts per time window
  total_visits_1d      INTEGER NOT NULL DEFAULT 0,
  total_visits_7d      INTEGER NOT NULL DEFAULT 0,
  total_visits_30d     INTEGER NOT NULL DEFAULT 0,
  total_visits_90d     INTEGER NOT NULL DEFAULT 0,

  -- Rich breakdown (30-day window — matches existing get_crawler_summary output)
  unique_bots          INTEGER NOT NULL DEFAULT 0,
  bots_breakdown       JSONB,   -- { bot_name: { count, owner } }
  sites_breakdown      JSONB,   -- { site: count }
  industries_breakdown JSONB,   -- { industry: count }
  daily_30d            JSONB,   -- { "YYYY-MM-DD": count }
  daily_by_owner_30d   JSONB,   -- { "YYYY-MM-DD": { owner: count } }

  -- Meta
  generated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT single_row CHECK (id = 1)
);

-- Enable RLS (public read, no writes from client)
ALTER TABLE crawler_stats_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read crawler_stats_cache"
  ON crawler_stats_cache FOR SELECT USING (true);

-- 2. Refresh function
--    Calls the existing get_crawler_summary RPC for 30d rich data,
--    then does lightweight COUNT for 1d / 7d / 90d.
CREATE OR REPLACE FUNCTION refresh_crawler_stats_cache()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats_30d      JSON;
  v_total_1d     INTEGER;
  v_total_7d     INTEGER;
  v_total_90d    INTEGER;
  v_today_start  TIMESTAMPTZ;
BEGIN
  v_today_start := DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

  -- Rich 30-day stats (reuse existing indexed RPC)
  SELECT get_crawler_summary(NOW() - INTERVAL '30 days') INTO stats_30d;

  -- Lightweight counts for other windows
  SELECT COUNT(*) INTO v_total_1d
    FROM crawler_visits WHERE ts >= v_today_start;

  SELECT COUNT(*) INTO v_total_7d
    FROM crawler_visits WHERE ts >= NOW() - INTERVAL '7 days';

  SELECT COUNT(*) INTO v_total_90d
    FROM crawler_visits WHERE ts >= NOW() - INTERVAL '90 days';

  -- Upsert single row
  INSERT INTO crawler_stats_cache (
    id,
    total_visits_1d,
    total_visits_7d,
    total_visits_30d,
    total_visits_90d,
    unique_bots,
    bots_breakdown,
    sites_breakdown,
    industries_breakdown,
    daily_30d,
    daily_by_owner_30d,
    generated_at
  ) VALUES (
    1,
    v_total_1d,
    v_total_7d,
    (stats_30d->>'total_visits')::INTEGER,
    v_total_90d,
    (stats_30d->>'unique_bots')::INTEGER,
    (stats_30d->'bots'),
    (stats_30d->'sites'),
    (stats_30d->'industries'),
    (stats_30d->'daily'),
    (stats_30d->'daily_by_owner'),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    total_visits_1d      = EXCLUDED.total_visits_1d,
    total_visits_7d      = EXCLUDED.total_visits_7d,
    total_visits_30d     = EXCLUDED.total_visits_30d,
    total_visits_90d     = EXCLUDED.total_visits_90d,
    unique_bots          = EXCLUDED.unique_bots,
    bots_breakdown       = EXCLUDED.bots_breakdown,
    sites_breakdown      = EXCLUDED.sites_breakdown,
    industries_breakdown = EXCLUDED.industries_breakdown,
    daily_30d            = EXCLUDED.daily_30d,
    daily_by_owner_30d   = EXCLUDED.daily_by_owner_30d,
    generated_at         = EXCLUDED.generated_at;

EXCEPTION WHEN OTHERS THEN
  -- Never let a refresh failure crash; silently skip this cycle
  RAISE WARNING 'refresh_crawler_stats_cache failed: %', SQLERRM;
END;
$$;

-- 3. Run once immediately to seed the table
SELECT refresh_crawler_stats_cache();

-- 4. Schedule pg_cron job (every 5 minutes)
--    pg_cron extension must be enabled in Supabase Dashboard:
--    Database → Extensions → pg_cron
SELECT cron.schedule(
  'refresh-crawler-stats-cache',   -- job name (unique)
  '*/5 * * * *',                   -- every 5 minutes
  'SELECT refresh_crawler_stats_cache()'
);

-- 5. Helper view: expose the same shape as get_crawler_summary()
--    so existing callers can migrate without JSON surgery
CREATE OR REPLACE VIEW crawler_stats_live AS
SELECT
  total_visits_30d                          AS total_visits,
  total_visits_1d                           AS today_visits,
  total_visits_7d,
  total_visits_90d,
  unique_bots,
  bots_breakdown                            AS bots,
  sites_breakdown                           AS sites,
  industries_breakdown                      AS industries,
  daily_30d                                 AS daily,
  daily_by_owner_30d                        AS daily_by_owner,
  generated_at
FROM crawler_stats_cache
WHERE id = 1;
