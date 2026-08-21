-- Migration: Add Stripe payment fields to sea_urchin_orders
-- Run this in Supabase SQL Editor

-- Add Stripe-related columns for auto-checkout
ALTER TABLE sea_urchin_orders
ADD COLUMN IF NOT EXISTS stripe_session_id text,
ADD COLUMN IF NOT EXISTS stripe_payment_intent text,
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sue_orders_stripe_session
  ON sea_urchin_orders(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sue_orders_payment_status
  ON sea_urchin_orders(payment_status)
  WHERE payment_status IS NOT NULL;

-- Update function to handle payment status changes
CREATE OR REPLACE FUNCTION mark_order_paid(order_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE sea_urchin_orders
  SET status = 'paid',
      payment_status = 'paid',
      paid_at = now(),
      updated_at = now()
  WHERE id = order_uuid;
END;
$$ LANGUAGE plpgsql;

-- RLS: Allow service role to update payment status
-- (Anon can only read their own order via session lookup)
