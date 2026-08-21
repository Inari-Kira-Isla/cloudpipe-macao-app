-- Fix merchants table - add missing industry column if not exists
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchants' AND column_name = 'industry') THEN
       ALTER TABLE merchants ADD COLUMN industry TEXT;
   END IF;
END $$;

-- Add missing indexes if not exist
CREATE INDEX IF NOT EXISTS idx_merchants_industry ON merchants(industry);
CREATE INDEX IF NOT EXISTS idx_merchants_slug ON merchants(slug);
CREATE INDEX IF NOT EXISTS idx_merchants_district ON merchants(district);
