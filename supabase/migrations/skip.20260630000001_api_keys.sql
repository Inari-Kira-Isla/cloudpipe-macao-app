CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key_hash text NOT NULL UNIQUE,        -- SHA-256 of actual key (never store plaintext)
  tier text NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard', 'premium')),
  owner_email text,
  owner_name text,
  description text,
  calls_today integer DEFAULT 0,
  calls_total bigint DEFAULT 0,
  rate_limit_per_day integer DEFAULT 1000,
  last_reset_date date DEFAULT CURRENT_DATE,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write api_keys (no public access)
CREATE POLICY "service_only" ON public.api_keys
  USING (false);  -- blocks all anon/authenticated access; service role bypasses RLS

CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON public.api_keys(active, tier);
