-- Plan B: crawler_daily_stats — pre-aggregated daily table
-- Enables arbitrary date-range queries without raw row scanning
-- Populated by crawler_stats_precompute.py (upsert_crawler_daily_stats)
-- One row per (date, bot_owner, site)

CREATE TABLE IF NOT EXISTS crawler_daily_stats (
  date        date    NOT NULL,
  bot_owner   text    NOT NULL DEFAULT 'Unknown',
  site        text    NOT NULL DEFAULT 'cloudpipe-macao-app',
  visit_count integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crawler_daily_stats_pkey PRIMARY KEY (date, bot_owner, site)
);

CREATE INDEX IF NOT EXISTS idx_cds_date      ON crawler_daily_stats (date DESC);
CREATE INDEX IF NOT EXISTS idx_cds_date_site ON crawler_daily_stats (date DESC, site);
CREATE INDEX IF NOT EXISTS idx_cds_owner     ON crawler_daily_stats (bot_owner, date DESC);

-- RLS: anon can SELECT (for dashboard), service role can write
ALTER TABLE crawler_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read crawler_daily_stats"
  ON crawler_daily_stats FOR SELECT TO anon USING (true);

CREATE POLICY "service write crawler_daily_stats"
  ON crawler_daily_stats FOR ALL TO service_role USING (true);

-- RPC: arbitrary date-range summary from pre-aggregated table
-- Usage: SELECT get_crawler_period_summary('2026-01-17', '2026-04-17')
CREATE OR REPLACE FUNCTION get_crawler_period_summary(
  since_date date,
  until_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'period',       jsonb_build_object('since', since_date, 'until', until_date,
                                       'days', (until_date - since_date + 1)),
    'total_visits', COALESCE((
      SELECT SUM(visit_count) FROM crawler_daily_stats
      WHERE date >= since_date AND date <= until_date AND bot_owner = '_total'
    ), 0),
    'unique_bots',  COALESCE((
      SELECT COUNT(DISTINCT bot_owner) FROM crawler_daily_stats
      WHERE date >= since_date AND date <= until_date AND bot_owner != '_total'
    ), 0),
    'bots', COALESCE((
      SELECT jsonb_object_agg(bot_owner, visit_count)
      FROM (
        SELECT bot_owner, SUM(visit_count) AS visit_count
        FROM crawler_daily_stats
        WHERE date >= since_date AND date <= until_date AND bot_owner != '_total'
        GROUP BY bot_owner ORDER BY visit_count DESC LIMIT 20
      ) t
    ), '{}'::jsonb),
    'daily', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('date', date, 'total', total) ORDER BY date)
      FROM (
        SELECT date, SUM(visit_count) AS total
        FROM crawler_daily_stats
        WHERE date >= since_date AND date <= until_date AND bot_owner = '_total'
        GROUP BY date
      ) t
    ), '[]'::jsonb)
  )
$$;

COMMENT ON TABLE crawler_daily_stats IS
  'Pre-aggregated daily crawler visit counts. Written by crawler_stats_precompute.py. '
  'Primary key (date, bot_owner, site) supports upsert merge. '
  '_total bot_owner stores the day total across all bots.';
