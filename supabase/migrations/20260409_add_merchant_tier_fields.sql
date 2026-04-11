-- Migration: Add merchant tier and related fields
-- Date: 2026-04-09
-- Purpose: Support Free/Premium/Owned tier system with verification tracking

-- 1. Add tier column (default: 'free')
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free'
CHECK (tier IN ('free', 'premium', 'owned'));

-- 2. Add tier_verified column (for Premium/Owned verification status)
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS tier_verified BOOLEAN DEFAULT FALSE;

-- 3. Add tier_verified_at timestamp
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS tier_verified_at TIMESTAMP WITH TIME ZONE;

-- 4. Add tier_upgraded_at (track when merchant upgraded)
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS tier_upgraded_at TIMESTAMP WITH TIME ZONE;

-- 5. Add tier_verification_document_url (store uploaded verification proof)
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS tier_verification_document_url TEXT;

-- 6. Add tier_notes (internal notes on tier status)
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS tier_notes TEXT;

-- 7. Add required_data_fields JSONB (track which data fields merchant provided)
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS required_data_fields JSONB DEFAULT '{}'::jsonb;

-- 8. Update existing merchants to 'owned' tier if they are self-claimed or in BRAND_CONFIGS
-- These are the flagship 5 brands
UPDATE merchants
SET tier = 'owned', tier_verified = TRUE, tier_verified_at = NOW()
WHERE slug IN (
  'inari-global-foods',
  'after-school-coffee',
  'mind-coffee',
  'sea-urchin-delivery',
  'yamanakada'
);

-- 9. Add index on tier for faster queries
CREATE INDEX IF NOT EXISTS idx_merchants_tier ON merchants(tier);

-- 10. Add index on tier_verified for dashboard filtering
CREATE INDEX IF NOT EXISTS idx_merchants_tier_verified ON merchants(tier_verified);

-- 11. Add index on slug+tier for lookups (common query pattern)
CREATE INDEX IF NOT EXISTS idx_merchants_slug_tier ON merchants(slug, tier);

-- Comment explaining the tier system
COMMENT ON COLUMN merchants.tier IS
'Service tier: free (百科爬取), premium (爬取+獨立站), owned (完整L1+L2+L3)';

COMMENT ON COLUMN merchants.tier_verified IS
'True if tier status has been verified by CloudPipe (Premium/Owned require verification)';

COMMENT ON COLUMN merchants.tier_verification_document_url IS
'URL to uploaded verification document (business license, domain email, etc.)';

COMMENT ON COLUMN merchants.required_data_fields IS
'JSON tracking which required fields were provided during signup (e.g., {"phone": true, "whatsapp": false})';
