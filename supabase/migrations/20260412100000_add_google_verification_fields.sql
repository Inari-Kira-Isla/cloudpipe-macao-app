-- Migration: Add Google verification fields to merchants
-- Date: 2026-04-12
-- Purpose: Add google_place_id and google_rating fields required by cleanup migration

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1),
ADD COLUMN IF NOT EXISTS google_reviews INTEGER,
ADD COLUMN IF NOT EXISTS google_last_verified TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_merchants_google_place_id ON merchants(google_place_id);
