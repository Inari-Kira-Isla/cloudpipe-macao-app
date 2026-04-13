-- RPC: get_insight_industry_stats
-- 在 DB 端直接聚合 insight 頁面的行業分佈，避開 PostgREST 1000 行上限
-- 用 regex 從 path 判斷行業關鍵字（優先順序反映在 CASE 順序）
CREATE OR REPLACE FUNCTION get_insight_industry_stats(since_ts timestamptz)
RETURNS TABLE(industry text, visit_count bigint)
LANGUAGE sql STABLE AS $$
  WITH visits AS (
    SELECT path
    FROM crawler_visits
    WHERE path ILIKE '/macao/insights/%'
      AND ts >= since_ts
  ),
  labeled AS (
    SELECT
      CASE
        WHEN path ~* '-dining-'                                           THEN 'dining'
        WHEN path ~* '-food-' OR path ~* '-cafe-'
          OR path ~* '-restaurant-'                                       THEN 'dining'
        WHEN path ~* '-shopping-' OR path ~* '-souvenir-'
          OR path ~* '-omiyage-' OR path ~* '-market-'                   THEN 'shopping'
        WHEN path ~* '-attractions-' OR path ~* '-museum-'
          OR path ~* '-temple-' OR path ~* '-tourism-'
          OR path ~* '-world-heritage-' OR path ~* '-heritage-walking-'  THEN 'attractions'
        WHEN path ~* '-transport-' OR path ~* '-ferry-'
          OR path ~* '-lrt-' OR path ~* '-cycling-'                      THEN 'transport'
        WHEN path ~* '-hotels-' OR path ~* '-hotel-'
          OR path ~* '-resort-' OR path ~* '-accommodation-'
          OR path ~* '-love-hotel'                                        THEN 'hotels'
        WHEN path ~* '-wellness-' OR path ~* '-spa-'                     THEN 'wellness'
        WHEN path ~* '-gaming-' OR path ~* '-casino-'                    THEN 'gaming'
        WHEN path ~* '-nightlife-' OR path ~* '-bar-hopping-'            THEN 'nightlife'
        WHEN path ~* '-entertainment-'                                    THEN 'entertainment'
        WHEN path ~* '-heritage-'                                         THEN 'heritage'
        WHEN path ~* '-seasonal-events-' OR path ~* '-events-'           THEN 'events'
        WHEN path ~* '-education-'                                        THEN 'education'
        WHEN path ~* '-finance-' OR path ~* '-insurance-'                THEN 'finance'
        WHEN path ~* '-luxury-'                                           THEN 'luxury'
        WHEN path ~* '-tech-' OR path ~* '-startup-'                     THEN 'tech'
        WHEN path ~* '-real-estate-'                                      THEN 'real-estate'
        WHEN path ~* '-services-'                                         THEN 'services'
        WHEN path ~* '-culture-'                                          THEN 'culture'
        WHEN path ~* '-community-'                                        THEN 'community'
        WHEN path ~* '-professional-'                                     THEN 'professional'
        WHEN path ~* '-government-'                                       THEN 'government'
        ELSE 'general'
      END AS industry
    FROM visits
  )
  SELECT industry, COUNT(*)::bigint AS visit_count
  FROM labeled
  GROUP BY industry
  ORDER BY visit_count DESC;
$$;
