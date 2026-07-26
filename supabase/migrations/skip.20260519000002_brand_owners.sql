-- Brand AI Portal Phase 1: brand_owners + brand_auth_tokens
-- 2026-05-19

CREATE TABLE IF NOT EXISTS brand_owners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  brand_slug TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);

ALTER TABLE brand_owners ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (no public access)
CREATE POLICY "service_role_all" ON brand_owners
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS brand_owners_brand_slug_idx ON brand_owners (brand_slug);
CREATE INDEX IF NOT EXISTS brand_owners_email_idx ON brand_owners (email);

-- Seed 2 pilot brand owners
INSERT INTO brand_owners (email, brand_slug, display_name) VALUES
  ('inari@cloudpipe.ai', 'inari-global-foods', '稻荷環球食品'),
  ('hello@cloudpipe.ai', 'cloudpipe', 'CloudPipe')
ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- brand_auth_tokens: short-lived magic link tokens
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS brand_auth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  brand_slug TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

ALTER TABLE brand_auth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON brand_auth_tokens
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS brand_auth_tokens_token_idx ON brand_auth_tokens (token);
CREATE INDEX IF NOT EXISTS brand_auth_tokens_email_idx ON brand_auth_tokens (email);
