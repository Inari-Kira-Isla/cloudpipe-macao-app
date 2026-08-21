-- STALE — do not run manually. brand_mentions is now owned by
-- supabase/migrations/20260818000000_brand_mentions.sql (the migration system),
-- which also has the corrected "service role full access" policy (TO service_role).
-- This file is kept only for historical reference and has the same RLS bug the
-- migration had (2026-08-20 security audit) — never copy/paste it into SQL Editor.
--
-- Table for storing off-site brand mentions from social media, news, and forums

CREATE TABLE IF NOT EXISTS brand_mentions (
    id BIGSERIAL PRIMARY KEY,
    brand_slug TEXT NOT NULL,
    mention_type TEXT NOT NULL DEFAULT 'general',
    title TEXT,
    url TEXT,
    snippet TEXT,
    source TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_brand_mentions_brand ON brand_mentions(brand_slug);
CREATE INDEX IF NOT EXISTS idx_brand_mentions_type ON brand_mentions(mention_type);
CREATE INDEX IF NOT EXISTS idx_brand_mentions_detected ON brand_mentions(detected_at DESC);

-- Enable RLS
ALTER TABLE brand_mentions ENABLE ROW LEVEL SECURITY;

-- Allow public read access for dashboard
CREATE POLICY "Allow public read access to brand_mentions" 
ON brand_mentions FOR SELECT 
USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access to brand_mentions" 
ON brand_mentions FOR ALL 
USING (true);

-- Optional: Add foreign key to brand_profiles (uncomment if brand_profiles exists)
-- ALTER TABLE brand_mentions ADD CONSTRAINT fk_brand_mentions_brand 
-- FOREIGN KEY (brand_slug) REFERENCES brand_profiles(brand_slug) ON DELETE CASCADE;
