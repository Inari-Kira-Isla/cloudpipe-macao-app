-- Fix: Exclude spider-web and non-macao page types from industries breakdown
-- Root cause: get_crawler_summary was counting NULL industry for spider-web (cross-site crawls
-- to /articles/...) and page type (HK/JP/TW insight paths) as "unknown", inflating it to ~100K.
-- These are legitimate NULL industry values (not /macao/ paths), but not macao industry data.
-- Fix: Add WHERE page_type NOT IN ('spider-web', 'page', 'robots', 'api-faq', 'faqs')
-- Date: 2026-05-25

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
        -- Exclude page_types that legitimately have NULL industry:
        --   spider-web: cross-site crawls to /articles/... (other brand sites)
        --   page: non-macao region paths (/hongkong/insights, /japan/insights, /taiwan/insights, etc.)
        --   robots/api-faq/faqs: utility paths with no meaningful industry
        SELECT COALESCE(NULLIF(industry, ''), 'unknown') as industry, COUNT(*) as cnt
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

-- Immediately refresh the cache with new logic
SELECT refresh_crawler_stats_cache();
