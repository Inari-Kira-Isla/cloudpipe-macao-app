-- Supports merchant_faq_generator.py's keyset scan:
--   WHERE merchant_id IN (...)
--   ORDER BY merchant_id, id
--
-- This index already exists in production as of 2026-07-27. Keep this
-- idempotent migration in source control so fresh environments do not regress
-- to statement timeouts while scanning the multi-million-row table.
CREATE INDEX IF NOT EXISTS idx_merchant_faqs_merchant_id_id
  ON public.merchant_faqs (merchant_id, id);
