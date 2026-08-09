-- ============================================================================
-- Enable the crawler_visits 90-day retention cron job
-- ============================================================================
-- 🔴 DO NOT APPLY WITHOUT KIRA'S EXPLICIT SIGN-OFF (2026-08-09 cross-model
-- verification, Opus, against live production):
--   pg_cron IS installed and cleanup_old_crawler_visits() DOES exist — both
--   guards below would pass cleanly. That is exactly why this is dangerous
--   rather than safe: nothing will stop the first run.
--   crawler_visits currently has 94,265 rows older than 90 days, spanning
--   2026-05-01 → 2026-05-11 — i.e. this single irreversible DELETE would
--   destroy the only remaining crawl-baseline data for the 2026-05-11
--   sitemap-route incident window (-99% crawler traffic). No archive table
--   exists for this data anywhere in the schema. cleanup_old_crawler_visits()
--   has no LIMIT/batching and no post-VACUUM — it is a single ~94k-row
--   transaction on an already-2.1GB table.
--   Required before applying: archive first —
--     CREATE TABLE IF NOT EXISTS crawler_visits_archive_2026q2 AS
--       SELECT * FROM crawler_visits WHERE ts < NOW() - INTERVAL '90 days';
--     SELECT COUNT(*) FROM crawler_visits_archive_2026q2;  -- expect ~94265
--   Only apply this migration after that archive exists and its count has
--   been read back and confirmed. This is a Checkpoint item under CLAUDE.md
--   (大批量 DELETE) — treat it as a separate decision from today's cache-perf
--   deploy, not something to bundle in.
-- ============================================================================
-- Problem (diagnosed 2026-08-08):
--   supabase/migrations/crawler_visits_indexes_and_retention.sql defines
--   cleanup_old_crawler_visits() (step 4) but its cron.schedule() call (step 5)
--   was left COMMENTED OUT and was never enabled anywhere else in the repo.
--   Result: the function exists but nothing ever calls it, and crawler_visits
--   (1.6M+ rows) grows without bound.
--
-- Why a NEW migration instead of just uncommenting that line:
--   That file also contains a bulk `DELETE` + `VACUUM ANALYZE` (steps 2-3).
--   VACUUM cannot run inside a transaction block, so re-running the whole file
--   just to activate one line is unsafe. This migration only schedules the job.
--
-- ⚠️ PREREQUISITE — NOT VERIFIABLE FROM THE REPO:
--   pg_cron must be enabled on the Supabase project
--   (Dashboard → Database → Extensions → pg_cron).
--   Evidence it is *probably* already on: add_crawler_stats_cache_auto_refresh.sql
--   schedules 'refresh-crawler-stats-cache' unconditionally, and
--   skip.20260725_fix_crawler_stats_cache_stale_via_mv.sql documents that job
--   running in production as jobid=1. That is circumstantial, NOT a check of the
--   live DB — hence the fail-loud guard below instead of an assumption.
-- ============================================================================

-- ── Guard 1: fail loud if pg_cron is not installed ──────────────────────────
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION
      'pg_cron extension is NOT installed. Enable it in Supabase Dashboard → Database → Extensions → pg_cron, then re-run this migration.';
  END IF;
END;
$do$;

-- ── Guard 2: fail loud if the retention function is missing ─────────────────
--    (i.e. crawler_visits_indexes_and_retention.sql was never applied)
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'cleanup_old_crawler_visits'
  ) THEN
    RAISE EXCEPTION
      'public.cleanup_old_crawler_visits() does not exist. Apply supabase/migrations/crawler_visits_indexes_and_retention.sql (step 4) first.';
  END IF;
END;
$do$;

-- ── Idempotency: drop any existing job with this name before (re)scheduling ──
--    pg_cron >= 1.4 upserts by jobname, but cron.unschedule() first makes this
--    safe on older versions too. Raises if the job does not exist → swallow.
DO $do$
BEGIN
  PERFORM cron.unschedule('cleanup-crawler-visits');
EXCEPTION WHEN OTHERS THEN
  NULL;  -- job was not scheduled yet; nothing to remove
END;
$do$;

-- ── Schedule: daily 03:00 UTC (11:00 HKT) — same slot the original file
--    documented. Off-peak for AI crawler traffic.
SELECT cron.schedule(
  'cleanup-crawler-visits',
  '0 3 * * *',
  $job$SELECT public.cleanup_old_crawler_visits()$job$
);

-- ── Verification (run manually after applying) ──────────────────────────────
--   -- 1. job registered?
--   SELECT jobid, jobname, schedule, command, active
--   FROM cron.job WHERE jobname = 'cleanup-crawler-visits';
--
--   -- 2. after the first 03:00 UTC run, confirm it actually executed:
--   SELECT status, return_message, start_time, end_time
--   FROM cron.job_run_details
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-crawler-visits')
--   ORDER BY start_time DESC LIMIT 5;
--
--   -- 3. retention actually holding (should return 0):
--   SELECT COUNT(*) FROM crawler_visits WHERE ts < NOW() - INTERVAL '90 days';
--
--   ⚠️ Step 2 is the real health signal. A registered job is NOT proof it ran —
--   check job_run_details, not just cron.job.
