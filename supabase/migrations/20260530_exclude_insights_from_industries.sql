-- 2026-05-29: Exclude 'insights' pseudo-industry from dashboard industries breakdown.
-- Root cause: middleware.ts hardcodes industry='insights' for all insight pages
-- (/macao/insights/*, /(hongkong|japan|taiwan|global)/[lang]/insights/*).
-- Result: 'insights' aggregates ~112K visits/day and dominates the dashboard,
-- masking real industry distribution (dining/attractions/etc).
--
-- Fix (Strategy A, quick win): drop industry IN ('insights','') from the
-- get_crawler_summary 'industries' aggregator. Middleware-side fix
-- (derive industry from insights.related_industries[0]) is tracked as P2.

CREATE OR REPLACE FUNCTION public.get_crawler_summary(since_ts timestamp with time zone)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'total_visits', COUNT(*),
    'today_visits', COUNT(*) FILTER (WHERE ts >= date_trunc('day', NOW())),
    'unique_bots', COUNT(DISTINCT bot_name),
    'bots', (
      SELECT json_object_agg(bot_name, json_build_object('count', total_cnt, 'owner', top_owner))
      FROM (
        SELECT bot_name,
               SUM(cnt) as total_cnt,
               (array_agg(bot_owner ORDER BY cnt DESC NULLS LAST))[1] as top_owner
        FROM (
          SELECT bot_name, bot_owner, COUNT(*) as cnt
          FROM crawler_visits cv2
          WHERE cv2.ts >= since_ts
          GROUP BY bot_name, bot_owner
        ) ig
        GROUP BY bot_name
        ORDER BY total_cnt DESC
        LIMIT 50
      ) b
    ),
    'industries', (
      SELECT json_object_agg(industry, cnt)
      FROM (
        SELECT COALESCE(NULLIF(industry, ''), 'unknown') as industry, COUNT(*) as cnt
        FROM crawler_visits cv5
        WHERE cv5.ts >= since_ts
          AND page_type NOT IN ('spider-web','page','robots','api-faq','faqs')
          AND COALESCE(industry, '') NOT IN ('insights', '')  -- 2026-05-29: exclude pseudo-industry
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
    'daily_by_owner', (
      SELECT json_object_agg(day, owners)
      FROM (
        SELECT day, json_object_agg(bot_owner, cnt) as owners
        FROM (
          SELECT ts::date::text as day, bot_owner, COUNT(*) as cnt
          FROM crawler_visits cv6
          WHERE cv6.ts >= since_ts
            AND bot_owner IS NOT NULL
          GROUP BY 1, 2
        ) iq
        GROUP BY day
        ORDER BY day
      ) oq
    ),
    'generated_at', NOW()
  ) INTO result FROM crawler_visits WHERE ts >= since_ts;
  RETURN result;
END;
$function$;
