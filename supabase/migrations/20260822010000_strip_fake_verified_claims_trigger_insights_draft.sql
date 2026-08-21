-- ─────────────────────────────────────────────────────────────────────────
-- Extend the strip-fake-verified-claims guard to insights_draft.
-- Checkpoint approved by Kira 2026-08-22 ("照做（建議）"), follow-up to
-- skip.20260821014852_strip_fake_verified_claims_trigger.sql, which attached
-- the same guard to `insights` and explicitly flagged (L25) that
-- `insights_draft` was left uncovered "if/when needed". This migration is
-- that follow-up.
--
-- Reuses the SAME trigger function (public.trg_strip_fake_verified_claims_fn)
-- and the SAME strip/count logic (public.strip_fake_verified_claims /
-- public.count_fake_verified_claims) created by the 2026-08-21 migration —
-- no new logic is introduced here, only a second attachment point. The
-- tripwire log (public.authority_sources_strip_log) already has a
-- table_name column (populated via TG_TABLE_NAME) so rows from this trigger
-- are distinguishable from the `insights` ones without any schema change.
--
-- Pre-flight trigger audit on insights_draft (2026-08-22, via pg_trigger)
-- found only:
--   insights_draft:   insights_draft_updated_at   (BEFORE UPDATE)
-- which does not read or write authority_sources, so trigger firing order
-- (alphabetical among BEFORE triggers for the same event: "insights_draft_..."
-- vs "trg_strip_...") is irrelevant, same reasoning as the original migration.
--
-- Pre-migration state (2026-08-22, verified via
-- count_fake_verified_claims over the live table before this migration):
--   1,245 rows / 6,634 verified|verified_by entries in insights_draft.
-- This migration only stops NEW fake claims from being written to
-- insights_draft going forward. It does NOT retroactively clean the 1,245
-- existing rows — that one-time cleanup is done separately (see the
-- companion backfill run in the same delivery), same division of labor as
-- the original insights trigger (trigger = go-forward guard, backfill =
-- one-time cleanup of pre-existing pollution).
-- ─────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_strip_fake_verified_claims ON public.insights_draft;

CREATE TRIGGER trg_strip_fake_verified_claims
  BEFORE INSERT OR UPDATE ON public.insights_draft
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_strip_fake_verified_claims_fn();

-- ─────────────────────────────────────────────────────────────────────────
-- ROLLBACK (run manually if this trigger needs to be reverted):
--
--   DROP TRIGGER IF EXISTS trg_strip_fake_verified_claims ON public.insights_draft;
--
-- (The shared strip_fake_verified_claims / count_fake_verified_claims
-- functions and the audit log table are shared with the `insights` trigger
-- — do NOT drop them here, that would also disable the `insights` guard.)
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- Verification (run manually after applying):
--   -- 1. Trigger is attached:
--   SELECT tgname, tgenabled FROM pg_trigger
--   WHERE tgrelid = 'public.insights_draft'::regclass AND tgname = 'trg_strip_fake_verified_claims';
--
--   -- 2. End-to-end proof: touch a known donor row carrying a fake
--   --    verified claim with a no-op UPDATE and confirm both the column
--   --    and the tripwire log react:
--   UPDATE public.insights_draft SET updated_at = updated_at WHERE id = '<donor-row-id>';
--   SELECT authority_sources FROM public.insights_draft WHERE id = '<donor-row-id>';
--   SELECT * FROM public.authority_sources_strip_log
--   WHERE table_name = 'insights_draft' ORDER BY logged_at DESC LIMIT 1;
--
--   -- 3. Confirm the `insights` trigger is unaffected (containment probe
--   --    should still read 0, same as before this migration):
--   SELECT COUNT(*) FROM public.insights
--   WHERE public.count_fake_verified_claims(authority_sources) > 0;
-- ─────────────────────────────────────────────────────────────────────────
