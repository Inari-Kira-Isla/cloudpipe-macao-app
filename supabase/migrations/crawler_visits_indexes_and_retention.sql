-- ============================================================
-- Fix: crawler_visits indexes + data retention
-- Root cause: missing indexes caused full table scans →
--             connection pool exhaustion → DB unresponsive
-- Apply AFTER DB is restored via Supabase support ticket
-- ============================================================

-- 1. Core query indexes (covers all WHERE/ORDER BY patterns in the API)
CREATE INDEX IF NOT EXISTS idx_crawler_visits_ts
  ON crawler_visits(ts DESC);

CREATE INDEX IF NOT EXISTS idx_crawler_visits_site_ts
  ON crawler_visits(site, ts DESC);

CREATE INDEX IF NOT EXISTS idx_crawler_visits_bot_owner_ts
  ON crawler_visits(bot_owner, ts DESC);

CREATE INDEX IF NOT EXISTS idx_crawler_visits_session_id
  ON crawler_visits(session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crawler_visits_industry_ts
  ON crawler_visits(industry, ts DESC)
  WHERE industry IS NOT NULL;

-- 2. Delete stale data (keep 90 days only)
DELETE FROM crawler_visits
WHERE ts < NOW() - INTERVAL '90 days';

-- 3. Reclaim space after bulk delete
VACUUM ANALYZE crawler_visits;

-- 4. Auto-retention function: called by pg_cron every day at 03:00 UTC
CREATE OR REPLACE FUNCTION cleanup_old_crawler_visits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM crawler_visits
  WHERE ts < NOW() - INTERVAL '90 days';
END;
$$;

-- 5. Schedule daily cleanup (requires pg_cron extension — enable in Supabase dashboard)
-- SELECT cron.schedule('cleanup-crawler-visits', '0 3 * * *', 'SELECT cleanup_old_crawler_visits()');

-- 6. Efficient aggregation function for live-summary API
--    Replaces 6 parallel full-table scans with 1 indexed scan
CREATE OR REPLACE FUNCTION get_crawler_summary(since_ts TIMESTAMPTZ)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_visits', COUNT(*),
    'today_visits', COUNT(*) FILTER (WHERE ts >= date_trunc('day', NOW())),
    'unique_bots',  COUNT(DISTINCT bot_name),
    'bots', (
      SELECT json_object_agg(bot_name, json_build_object('count', cnt, 'owner', bot_owner))
      FROM (
        SELECT bot_name, bot_owner, COUNT(*) as cnt
        FROM crawler_visits cv2
        WHERE cv2.ts >= since_ts
        GROUP BY bot_name, bot_owner
        ORDER BY cnt DESC
        LIMIT 50
      ) b
    ),
    'sites', (
      SELECT json_object_agg(site, cnt)
      FROM (
        SELECT COALESCE(site, 'cloudpipe-macao-app') as site, COUNT(*) as cnt
        FROM crawler_visits cv3
        WHERE cv3.ts >= since_ts
        GROUP BY 1
        ORDER BY cnt DESC
      ) s
    ),
    'daily', (
      SELECT json_object_agg(day, cnt)
      FROM (
        SELECT ts::date::text as day, COUNT(*) as cnt
        FROM crawler_visits cv4
        WHERE cv4.ts >= since_ts
        GROUP BY 1
        ORDER BY 1
      ) d
    ),
    'generated_at', NOW()
  ) INTO result
  FROM crawler_visits
  WHERE ts >= since_ts;

  RETURN result;
END;
$$;
