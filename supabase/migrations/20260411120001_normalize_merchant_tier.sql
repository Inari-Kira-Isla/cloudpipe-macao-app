-- Migration: Normalize merchant tier values
-- Date: 2026-04-11
-- Purpose: Rename basic/community → free, drop old CHECK, add new CHECK (free/premium/owned)

-- Step 1: Drop existing CHECK constraint
ALTER TABLE merchants DROP CONSTRAINT IF EXISTS merchants_tier_check;

-- Step 2: Rename basic → free
UPDATE merchants SET tier = 'free' WHERE tier = 'basic';

-- Step 3: Rename community → free
UPDATE merchants SET tier = 'free' WHERE tier = 'community';

-- Step 4: Add new CHECK constraint with clean 3-tier schema
ALTER TABLE merchants
ADD CONSTRAINT merchants_tier_check
CHECK (tier IN ('free', 'premium', 'owned'));

-- Verification
-- SELECT tier, COUNT(*) FROM merchants GROUP BY tier ORDER BY COUNT(*) DESC;
