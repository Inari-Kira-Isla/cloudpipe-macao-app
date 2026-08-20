-- Security fix: 2026-08-20 audit — Important-severity RLS gaps on tables that are
-- LIVE in production today (unlike cloudnote_users / brand_mentions / district_faqs,
-- which are still-unapplied migrations and were fixed at the source instead).
--
-- 1. ai_search_results — "Allow service role write access" INSERT policy had no
--    `TO service_role`, so it defaulted to PUBLIC: any anon/authenticated caller
--    could INSERT arbitrary rows via PostgREST. Recreate scoped to service_role.
--
-- 2. sea_urchin_customers — "anon_insert_customers" let anon INSERT with no
--    validation (`WITH CHECK (true)`) into a PII table (name/phone/email). Verified
--    the only legitimate write path is src/app/api/v1/sea-urchin-customers/route.ts,
--    which always uses createServiceClient() (service_role bypasses RLS) — the app
--    never relies on this anon policy. It is pure unused public attack surface via
--    the raw PostgREST endpoint, so it is dropped rather than merely tightened.

-- ── 1. ai_search_results ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow service role write access" ON ai_search_results;

CREATE POLICY "Allow service role write access" ON ai_search_results
  FOR INSERT TO service_role WITH CHECK (true);

-- ── 2. sea_urchin_customers ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_insert_customers" ON sea_urchin_customers;
