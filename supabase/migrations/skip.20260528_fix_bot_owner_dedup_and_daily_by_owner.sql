-- Fix get_crawler_summary() bot_owner dedup bug + add daily_by_owner aggregation
-- Date: 2026-05-28
--
-- Bug 1: bot_owner dedup
--   Original SQL: SELECT bot_name, bot_owner, COUNT(*) GROUP BY bot_name, bot_owner
--   When the same bot_name has multiple bot_owner values (e.g. legitimate Applebot
--   tagged 'Apple' for 8459 rows + one historical noise row tagged 'Unknown'),
--   json_object_agg(bot_name, ...) gets two entries with the same key and picks
--   one non-deterministically — in production it picked 'Unknown'.
--   Result: dashboard "owners" array missed Apple entirely; Apple column never rendered.
--
--   Fix: sub-aggregate to pick the predominant owner per bot_name
--   (array_agg(bot_owner ORDER BY cnt DESC NULLS LAST))[1]
--
-- Bug 2: daily_by_owner not computed
--   add_daily_by_owner_to_rpc.sql (2026-04-09) was supposed to add this field
--   but the deployed version of the function was missing the daily_by_owner key,
--   so crawler_stats_cache.daily_by_owner_30d was always NULL → dashboard had
--   empty by_owner for every day except today (which is patched at precompute time).
--
--   Fix: re-add the daily_by_owner aggregation grouped by (date, bot_owner).
--
-- Verified post-deploy: Applebot now correctly tagged with owner='Apple' (8460 visits),
-- "owners" array now includes Apple, dashboard renders Apple column.

CREATE OR REPLACE FUNCTION public.get_crawler_summary(since_ts timestamp with time zone)
RETURNS json
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_visits', COUNT(*),
    'today_visits', COUNT(*) FILTER (WHERE ts >= date_trunc('day', NOW())),
    'unique_bots',  COUNT(DISTINCT bot_name),
    'bots', (
      SELECT json_object_agg(bot_name, json_build_object('count', total_cnt, 'owner', top_owner))
      FROM (
        SELECT
          bot_name,
          SUM(cnt) AS total_cnt,
          -- Pick predominant owner per bot_name (highest cnt wins; NULLs last)
          (array_agg(bot_owner ORDER BY cnt DESC NULLS LAST))[1] AS top_owner
        FROM (
          SELECT bot_name, bot_owner, COUNT(*) AS cnt
          FROM crawler_visits cv2
          WHERE cv2.ts >= since_ts
          GROUP BY bot_name, bot_owner
        ) inner_grouped
        GROUP BY bot_name
        ORDER BY total_cnt DESC
        LIMIT 50
      ) b
    ),
    'industries', (
      SELECT json_object_agg(industry, cnt)
      FROM (
        SELECT COALESCE(NULLIF(industry, ''), 'unknown') AS industry, COUNT(*) AS cnt
        FROM crawler_visits cv5
        WHERE cv5.ts >= since_ts
          AND page_type NOT IN ('spider-web', 'page', 'robots', 'api-faq', 'faqs')
        GROUP BY 1
        ORDER BY cnt DESC
        LIMIT 50
      ) ind
    ),
    'sites', (
      SELECT json_object_agg(site, cnt)
      FROM (
        SELECT COALESCE(LOWER(site), 'cloudpipe-macao-app') AS site, COUNT(*) AS cnt
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
        SELECT ts::date::text AS day, COUNT(*) AS cnt
        FROM crawler_visits cv4
        WHERE cv4.ts >= since_ts
        GROUP BY 1
        ORDER BY 1
      ) d
    ),
    'daily_by_owner', (
      SELECT json_object_agg(day, owners)
      FROM (
        SELECT day, json_object_agg(bot_owner, cnt) AS owners
        FROM (
          SELECT ts::date::text AS day, bot_owner, COUNT(*) AS cnt
          FROM crawler_visits cv6
          WHERE cv6.ts >= since_ts
            AND bot_owner IS NOT NULL
          GROUP BY 1, 2
        ) inner_q
        GROUP BY day
        ORDER BY day
      ) outer_q
    ),
    'generated_at', NOW()
  ) INTO result
  FROM crawler_visits
  WHERE ts >= since_ts;

  RETURN result;
END;
$function$;
