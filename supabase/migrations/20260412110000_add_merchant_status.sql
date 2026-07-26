-- Migration: Add status field to merchants
-- Date: 2026-04-12
-- Purpose: Add status field required by cleanup migration

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
CHECK (status IN ('active', 'closed', 'pending', 'suspended'));

CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants(status);
