-- Fix: Add industries aggregation + LOWER(site) normalization to get_crawler_summary RPC
-- Run this in Supabase SQL Editor to update the live function
-- Date: 2026-04-08

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
    'industries', (
      SELECT json_object_agg(industry, cnt)
      FROM (
        SELECT COALESCE(NULLIF(industry, ''), 'unknown') as industry, COUNT(*) as cnt
        FROM crawler_visits cv5
        WHERE cv5.ts >= since_ts
        GROUP BY 1
        ORDER BY cnt DESC
        LIMIT 50
      ) ind
    ),
    'sites', (
      SELECT json_object_agg(site, cnt)
      FROM (
        SELECT COALESCE(LOWER(site), 'cloudpipe-macao-app') as site, COUNT(*) as cnt
        FROM crawler_visits cv3
        WHERE cv3.ts >= since_ts
        GROUP BY 1
        ORDER BY cnt DESC
      ) s
    ),
    'site_sample_total', COUNT(*),
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
