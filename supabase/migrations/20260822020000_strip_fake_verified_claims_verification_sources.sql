-- ─────────────────────────────────────────────────────────────────────────
-- Close sibling-column gap in the strip-fake-verified-claims guard.
-- Checkpoint approved by Kira 2026-08-22 (Opus5 fresh-context final review
-- finding), follow-up to:
--   skip.20260821014852_strip_fake_verified_claims_trigger.sql (insights.authority_sources)
--   20260822010000_strip_fake_verified_claims_trigger_insights_draft.sql (insights_draft.authority_sources)
--
-- Finding: public.insights has a SIBLING jsonb column, verification_sources,
-- structurally similar to authority_sources but NOT covered by either prior
-- migration (trg_strip_fake_verified_claims_fn only ever read/wrote
-- NEW.authority_sources). Pre-migration production audit (2026-08-22, via
-- count_fake_verified_claims applied to verification_sources):
--   insights.verification_sources:        6,401 rows / 20,433 fake entries
--     of which status='published':        3,856 rows (publicly exposed)
--   insights_draft.verification_sources:    270 rows /    900 fake entries
-- Known fake fingerprints present: notebooklm-deep-research (5,592 published
-- entries), gov-source-catalog-v1 (333 published entries).
--
-- Fix: extend the SAME trigger function (trg_strip_fake_verified_claims_fn)
-- to strip both NEW.authority_sources AND NEW.verification_sources in one
-- pass, reusing the existing strip_fake_verified_claims() /
-- count_fake_verified_claims() pure functions unchanged. No new trigger is
-- created — the existing trg_strip_fake_verified_claims triggers already
-- attached to insights and insights_draft fire this updated function body
-- automatically; only CREATE OR REPLACE FUNCTION is needed here.
--
-- The tripwire log (authority_sources_strip_log) gains a `source_column`
-- column so authority_sources vs verification_sources strips are
-- distinguishable going forward (defaults to 'authority_sources' for
-- historical rows, matching prior behavior).
--
-- One-time backfill of the 6,401 + 270 existing polluted rows is done
-- separately via no-op UPDATE batches in the same delivery (not part of
-- this migration file, which only changes go-forward behavior) — same
-- division of labor as the original authority_sources migrations.
--
-- Local backups taken before backfill (id/slug/lang/status/verification_sources):
--   insights_verification_sources_pre_fix_20260822.json       (6,401 rows)
--   insights_draft_verification_sources_pre_fix_20260822.json (  270 rows)
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Add source_column to the tripwire log so we can tell which jsonb
--    column a given strip happened on.
ALTER TABLE public.authority_sources_strip_log
  ADD COLUMN IF NOT EXISTS source_column TEXT NOT NULL DEFAULT 'authority_sources';

COMMENT ON COLUMN public.authority_sources_strip_log.source_column IS
  'Which jsonb column the strip occurred on for this row: authority_sources or verification_sources.';

-- 2. Replace the trigger function body to also cover verification_sources.
--    Reuses strip_fake_verified_claims() / count_fake_verified_claims()
--    unchanged — only the trigger body is extended to check a second field.
CREATE OR REPLACE FUNCTION public.trg_strip_fake_verified_claims_fn()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  original_auth jsonb;
  stripped_auth jsonb;
  n_stripped_auth int;
  original_ver jsonb;
  stripped_ver jsonb;
  n_stripped_ver int;
BEGIN
  -- authority_sources (existing behavior, unchanged)
  original_auth := NEW.authority_sources;
  stripped_auth := public.strip_fake_verified_claims(original_auth);

  IF stripped_auth IS DISTINCT FROM original_auth THEN
    n_stripped_auth := public.count_fake_verified_claims(original_auth);
    INSERT INTO public.authority_sources_strip_log
      (insight_id, slug, lang, table_name, op, entries_stripped, source_column)
    VALUES
      (NEW.id, NEW.slug, NEW.lang, TG_TABLE_NAME, TG_OP, n_stripped_auth, 'authority_sources');
    NEW.authority_sources := stripped_auth;
  END IF;

  -- verification_sources (new: sibling column, same strip logic)
  original_ver := NEW.verification_sources;
  stripped_ver := public.strip_fake_verified_claims(original_ver);

  IF stripped_ver IS DISTINCT FROM original_ver THEN
    n_stripped_ver := public.count_fake_verified_claims(original_ver);
    INSERT INTO public.authority_sources_strip_log
      (insight_id, slug, lang, table_name, op, entries_stripped, source_column)
    VALUES
      (NEW.id, NEW.slug, NEW.lang, TG_TABLE_NAME, TG_OP, n_stripped_ver, 'verification_sources');
    NEW.verification_sources := stripped_ver;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.trg_strip_fake_verified_claims_fn() IS
  'BEFORE INSERT OR UPDATE trigger body for insights/insights_draft authority_sources AND verification_sources. Unconditionally strips verified/verified_by claim keys from both jsonb columns and logs a tripwire row (tagged by source_column) whenever a strip actually occurred. See strip_fake_verified_claims() for the pure logic.';

-- ─────────────────────────────────────────────────────────────────────────
-- NOTE: insights_draft has no `status` or `verification_sources`-specific
-- special-casing needed — NEW.verification_sources resolves to NULL for
-- any row/table where the column doesn't exist... actually PL/pgSQL record
-- field access requires the column to exist on the table the trigger fires
-- on. Both public.insights and public.insights_draft have a
-- verification_sources column (confirmed via information_schema before
-- writing this migration), so NEW.verification_sources is valid for both
-- trigger attachment points (trg_strip_fake_verified_claims on insights and
-- on insights_draft, both EXECUTE FUNCTION trg_strip_fake_verified_claims_fn()).
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- ROLLBACK (run manually if this extension needs to be reverted to
-- authority_sources-only behavior):
--
--   -- Restore the pre-2026-08-22b function body (authority_sources only):
--   -- see skip.20260821014852_strip_fake_verified_claims_trigger.sql section 4
--   -- for the exact CREATE OR REPLACE FUNCTION statement to re-run.
--
-- (The triggers themselves stay attached to both tables either way — this
-- migration only changes what the shared function body checks.)
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- Verification (run manually after applying):
--   -- 1. Function body now mentions verification_sources:
--   SELECT prosrc FROM pg_proc WHERE proname = 'trg_strip_fake_verified_claims_fn';
--
--   -- 2. End-to-end proof: touch a known donor row carrying a fake
--   --    verified claim in verification_sources with a no-op UPDATE:
--   UPDATE public.insights SET updated_at = updated_at WHERE id = '<donor-row-id>';
--   SELECT verification_sources FROM public.insights WHERE id = '<donor-row-id>';
--   SELECT * FROM public.authority_sources_strip_log
--   WHERE insight_id = '<donor-row-id>' AND source_column = 'verification_sources'
--   ORDER BY logged_at DESC LIMIT 1;
--
--   -- 3. Confirm authority_sources protection is unaffected (containment
--   --    probe should still read 0 for published insights, same as before):
--   SELECT COUNT(*) FROM public.insights
--   WHERE status = 'published' AND public.count_fake_verified_claims(authority_sources) > 0;
-- ─────────────────────────────────────────────────────────────────────────
