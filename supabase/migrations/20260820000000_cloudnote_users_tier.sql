-- CloudNote Users Tier System
-- Enables tier-based access control and subscription management

-- Create cloudnote_users table
CREATE TABLE IF NOT EXISTS cloudnote_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  
  -- Subscription fields
  subscription_id TEXT,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  subscription_auto_renew BOOLEAN DEFAULT true,
  
  -- Feature entitlements (JSONB for flexibility)
  entitlements JSONB DEFAULT '{"notes": "unlimited", "team_members": 1, "api_access": false, "cloud_sync": false}'::jsonb,
  
  -- Usage tracking
  notes_count INTEGER DEFAULT 0,
  notes_limit INTEGER DEFAULT 100,
  storage_used_mb INTEGER DEFAULT 0,
  storage_limit_mb INTEGER DEFAULT 100,
  
  -- Payment
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  payment_method TEXT,
  last_payment_date TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  
  -- Metadata
  source TEXT DEFAULT 'direct',
  utm_source TEXT,
  utm_medium TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cloudnote_users_email ON cloudnote_users(email);
CREATE INDEX IF NOT EXISTS idx_cloudnote_users_tier ON cloudnote_users(tier);
CREATE INDEX IF NOT EXISTS idx_cloudnote_users_status ON cloudnote_users(status);

-- Enable RLS
ALTER TABLE cloudnote_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own profile" ON cloudnote_users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Service role can manage all" ON cloudnote_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create audit log for subscription changes
CREATE TABLE IF NOT EXISTS cloudnote_subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES cloudnote_users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'upgraded', 'downgraded', 'cancelled', 'payment_succeeded', 'payment_failed', 'renewed')),
  old_tier TEXT,
  new_tier TEXT,
  amount_paid INTEGER,  -- in cents
  currency TEXT DEFAULT 'mop',
  payment_provider TEXT,
  external_event_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cloudnote_subscription_events_user ON cloudnote_subscription_events(user_id);

-- Enable RLS: this is an internal payment/audit log (amount_paid, payment_provider,
-- external_event_id) — no anon/authenticated direct access, service_role only.
ALTER TABLE cloudnote_subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage subscription events" ON cloudnote_subscription_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add to audit log trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_cloudnote_users_updated_at ON cloudnote_users;
CREATE TRIGGER update_cloudnote_users_updated_at
  BEFORE UPDATE ON cloudnote_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
