-- Migration: Add tier and subscription columns to merchants
-- Date: 2026-08-20
-- Purpose: Support CloudNote paid features (tier/entitlement)
-- Note: Run this SQL via Supabase Dashboard SQL Editor or `supabase db push`
-- The 'tier' column already exists on remote, only adding missing columns

-- Add subscription_status column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'merchants' AND column_name = 'subscription_status') THEN
        ALTER TABLE merchants ADD COLUMN subscription_status TEXT DEFAULT 'inactive' 
            CHECK (subscription_status IN ('inactive', 'active', 'cancelled', 'past_due'));
    END IF;
END $$;

-- Add subscription_start date (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'merchants' AND column_name = 'subscription_start') THEN
        ALTER TABLE merchants ADD COLUMN subscription_start TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add subscription_end date (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'merchants' AND column_name = 'subscription_end') THEN
        ALTER TABLE merchants ADD COLUMN subscription_end TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add entitlements as JSONB (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'merchants' AND column_name = 'entitlements') THEN
        ALTER TABLE merchants ADD COLUMN entitlements JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Add index on subscription_status (if not exists)
CREATE INDEX IF NOT EXISTS idx_merchants_subscription_status ON merchants(subscription_status);
