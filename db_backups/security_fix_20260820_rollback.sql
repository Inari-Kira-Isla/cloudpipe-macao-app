-- Rollback script for supabase/migrations/20260820120000_security_fix_live_rls_policies.sql
-- Captures the EXACT pre-fix policy definitions (queried live from production via
-- `supabase db query --linked` against pg_policies, 2026-08-20 23:xx HKT) so the
-- two live RLS changes can be reverted instantly if something breaks.
--
-- NOTE: `supabase db dump --linked` and pg_dump both failed in this environment —
-- no Docker daemon (known limitation, see memory: feedback re: no-Docker repo).
-- This is a targeted rollback for the 2 policy objects actually touched; no data
-- was mutated, only access-control policies, so this is sufficient backup for the
-- blast radius of this change.

-- Restore original ai_search_results INSERT policy (PUBLIC role, no TO clause):
-- DROP POLICY IF EXISTS "Allow service role write access" ON ai_search_results;
-- CREATE POLICY "Allow service role write access" ON ai_search_results FOR INSERT WITH CHECK (true);

-- Restore original sea_urchin_customers anon insert policy:
-- CREATE POLICY "anon_insert_customers" ON sea_urchin_customers
--   FOR INSERT TO anon WITH CHECK (true);
