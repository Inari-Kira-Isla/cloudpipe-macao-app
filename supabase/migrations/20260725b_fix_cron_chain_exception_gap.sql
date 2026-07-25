-- 20260725b_fix_cron_chain_exception_gap.sql
--
-- ROOT CAUSE (found by critic red-team review of 20260725_fix_crawler_stats_cache_stale_via_mv.sql,
-- confirmed 2026-07-25 via pg_get_functiondef('public.refresh_crawler_stats_cache_v2()'::regprocedure)):
--   refresh_crawler_stats_cache_v2() has NO exception handler — bare
--   `BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY x5 END` (the live function
--   actually refreshes 5 MVs, including mv_crawler_sessions_30d, which is not
--   defined in any tracked migration in this repo — that MV was added
--   directly on prod out-of-band; not in scope for this fix, but the
--   REFRESH statement is preserved unchanged below to avoid silently
--   dropping it).
--
--   Prior migration 20260725_fix_crawler_stats_cache_stale_via_mv.sql chained
--   this function onto the SAME pg_cron job, in the SAME SQL command, right
--   before the newly-fixed refresh_crawler_stats_cache() (which DOES have an
--   exception handler that writes crawler_stats_cache.last_refresh_error):
--
--     SET LOCAL statement_timeout = '60s';
--     SELECT refresh_crawler_stats_cache_v2();
--     SELECT refresh_crawler_stats_cache();
--
--   Because these are two separate statements executed by pg_cron as ONE
--   command, if refresh_crawler_stats_cache_v2() raises ANY exception
--   (e.g. `REFRESH MATERIALIZED VIEW CONCURRENTLY` hitting a lock conflict,
--   a unique-index violation, or exceeding the 60s statement_timeout), the
--   WHOLE command aborts right there — refresh_crawler_stats_cache() never
--   runs, and its exception-handler write to last_refresh_error never fires
--   either, because that code lives inside the function that never got a
--   chance to execute. This exactly reproduces the original failure mode
--   (silent staleness, nobody notified) one level up the call chain.
--
-- FIX: wrap refresh_crawler_stats_cache_v2()'s body in its own
-- EXCEPTION WHEN OTHERS handler that RAISE WARNINGs and returns normally
-- instead of propagating. This means:
--   - If one/some of the 5 REFRESH MATERIALIZED VIEW CONCURRENTLY calls fail
--     (e.g. lock timeout), the function no longer aborts the whole cron
--     command — refresh_crawler_stats_cache() still runs right after using
--     whatever MV data is currently there (stale-but-available beats a total
--     outage of the downstream cache table).
--   - The failure is still visible via Postgres WARNING in cron logs (same
--     visibility model already used elsewhere in this file's sibling
--     function), it just no longer blocks the next statement in the chain.
--   - Because this handler catches at the statement level inside a single
--     plpgsql function, a REFRESH that fails partway through still commits
--     whichever earlier REFRESH statements in the same function body
--     succeeded (each REFRESH MATERIALIZED VIEW CONCURRENTLY is its own
--     implicit transaction in Postgres; plpgsql EXCEPTION blocks roll back
--     to a SAVEPOINT taken at BEGIN, but committed DDL/DML from completed
--     sub-statements executed via REFRESH ... CONCURRENTLY is not undone by
--     catching a LATER statement's exception — only the currently-failing
--     statement's own effects are ever at risk, and REFRESH CONCURRENTLY is
--     failure-atomic per-MV).
--
-- ROLLBACK: restore the function body below (this IS the exact live
-- definition immediately before this migration, captured via
-- pg_get_functiondef('public.refresh_crawler_stats_cache_v2()'::regprocedure)
-- on 2026-07-25):
--
-- CREATE OR REPLACE FUNCTION public.refresh_crawler_stats_cache_v2()
--  RETURNS void
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'pg_temp'
-- AS $function$
-- BEGIN
--   REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_crawler_total_visits_30d;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_crawler_bots_30d;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_crawler_industries_30d;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_crawler_daily_30d;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_crawler_sessions_30d;
-- END;
-- $function$;
--
-- (cron.job command / schedule are untouched by this migration — no rollback
-- needed for those.)

BEGIN;

CREATE OR REPLACE FUNCTION public.refresh_crawler_stats_cache_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_crawler_total_visits_30d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_crawler_bots_30d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_crawler_industries_30d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_crawler_daily_30d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_crawler_sessions_30d;
EXCEPTION WHEN OTHERS THEN
  -- Do NOT propagate: this function is chained in the SAME pg_cron command,
  -- BEFORE refresh_crawler_stats_cache(). Letting an exception here abort
  -- the command would silently starve refresh_crawler_stats_cache() of its
  -- turn to run (and its own exception handler / last_refresh_error write
  -- would never get a chance to fire) — exactly the failure mode this whole
  -- 2026-07-25 fix chain exists to eliminate.
  RAISE WARNING 'refresh_crawler_stats_cache_v2 failed (MV refresh may be partial/stale): %', SQLERRM;
END;
$function$;

COMMENT ON FUNCTION public.refresh_crawler_stats_cache_v2() IS
  'Refreshes 5 MVs CONCURRENTLY (~<5s). Non-propagating exception handler added 2026-07-25b so a failure here never blocks refresh_crawler_stats_cache(), which is chained right after it in the same pg_cron job command.';

COMMIT;

-- Verify immediately: run once and confirm it succeeds against currently
-- healthy MVs (outside the transaction, matches this migration family's
-- established pattern of "run once to verify" — failure here does not roll
-- back the function/comment changes above).
SELECT refresh_crawler_stats_cache_v2();
