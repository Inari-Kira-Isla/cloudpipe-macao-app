-- ============================================================================
-- /api/faq/index performance fix — replace 11 sequential COUNT queries with one
-- ============================================================================
-- Problem (diagnosed 2026-08-08):
--   src/app/api/faq/index/route.ts ran one
--     .select('*', { count: 'exact' }).eq('question_intent', <intent>)
--        .neq('faq_type','insight_derived').limit(0)
--   per intent (10 intents) PLUS one global total = 11 exact COUNTs, executed
--   SEQUENTIALLY (Promise.all was removed because the shared Supabase client
--   singleton misbehaves under concurrency). Each COUNT hits merchant_faqs
--   (~2.52M rows). Result: 11 serial round trips per request.
--
-- Fix: one GROUP BY question_intent aggregate, exposed as an RPC.
--
-- Semantics are preserved EXACTLY:
--   * Filter stays `faq_type <> 'insight_derived'` (NOT `IS DISTINCT FROM`), so
--     rows with faq_type IS NULL keep being excluded, same as PostgREST .neq().
--   * Rows with question_intent IS NULL are still returned (as intent = NULL) so
--     the caller can sum them into total_faqs — the old code's global total also
--     counted them. The caller keeps filtering the intent whitelist itself.
-- ============================================================================

-- 1. Partial index: ~96.7% of merchant_faqs is faq_type='insight_derived', so a
--    partial index over the *non*-broadcast rows is small and lets the aggregate
--    run as an index-only scan instead of a 2.5M-row seq scan.
--
--    NOTE: plain CREATE INDEX takes a SHARE lock (blocks writes on the table for
--    the duration). If this must be applied on a hot production table, run this
--    single statement separately with CONCURRENTLY instead (it cannot run inside
--    a transaction block):
--      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_faqs_intent_not_insight
--        ON public.merchant_faqs (question_intent)
--        WHERE faq_type <> 'insight_derived';
CREATE INDEX IF NOT EXISTS idx_merchant_faqs_intent_not_insight
  ON public.merchant_faqs (question_intent)
  WHERE faq_type <> 'insight_derived';

-- 2. The aggregate itself.
--    SECURITY INVOKER (the default) is deliberate: RLS on merchant_faqs stays in
--    force for whichever role calls this. No RLS/security mechanism is bypassed
--    or removed.
--    CORRECTED 2026-08-09 (cross-model verification against live production):
--    merchant_faqs has RLS ENABLED with ZERO policies defined — anon/authenticated
--    currently get an EMPTY result set from this table, not a `FOR SELECT USING
--    (true)` policy as an earlier draft of this comment claimed. Do NOT use that
--    false claim to justify switching this function to SECURITY DEFINER later —
--    that would be a real privilege escalation, not a no-op. The API route this
--    function serves calls it with service_role, which bypasses RLS entirely by
--    design (service_role always does), independent of this function's security
--    mode.
CREATE OR REPLACE FUNCTION public.faq_index_intent_counts()
RETURNS TABLE (intent TEXT, faq_count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    mf.question_intent::TEXT AS intent,
    COUNT(*)::BIGINT         AS faq_count
  FROM public.merchant_faqs mf
  WHERE mf.faq_type <> 'insight_derived'
  GROUP BY mf.question_intent;
$$;

COMMENT ON FUNCTION public.faq_index_intent_counts() IS
  'Single-scan intent histogram for /api/faq/index. Replaces 11 sequential exact COUNTs over merchant_faqs (~2.52M rows). Excludes faq_type=''insight_derived'' broadcast pollution. NULL intent row is returned on purpose so callers can derive the global total. SECURITY INVOKER — RLS still applies.';

-- 3. service_role is what the API route actually uses (RLS bypass by role, not by
--    this GRANT). anon/authenticated are granted EXECUTE for API consistency with
--    other public RPCs, but since merchant_faqs has zero SELECT policies, calling
--    this function as anon/authenticated returns an empty set today — the GRANT
--    is inert until/unless a SELECT policy is later added to merchant_faqs.
GRANT EXECUTE ON FUNCTION public.faq_index_intent_counts() TO service_role;
GRANT EXECUTE ON FUNCTION public.faq_index_intent_counts() TO anon, authenticated;

-- ── Verification (run manually after applying) ──────────────────────────────
--   SELECT * FROM public.faq_index_intent_counts() ORDER BY faq_count DESC;
--   -- total_faqs equivalent:
--   SELECT SUM(faq_count) FROM public.faq_index_intent_counts();
--   -- must equal the old query:
--   SELECT COUNT(*) FROM merchant_faqs WHERE faq_type <> 'insight_derived';
