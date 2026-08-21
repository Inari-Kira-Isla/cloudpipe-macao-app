-- Migration: auto_create_brand_profiles_from_merchants
-- Trigger to automatically create brand_profiles entry when a new merchant is inserted into merchants table
-- This will in turn trigger the existing generate_default_brand_faqs() trigger via the brand_profiles INSERT
-- Run this in Supabase SQL Editor

-- Function to create brand_profiles entry from new merchant
CREATE OR REPLACE FUNCTION create_brand_profile_from_merchant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create brand_profile if one doesn't already exist
  INSERT INTO brand_profiles (brand_slug, name_zh, name_en, industry, status, created_at)
  SELECT NEW.slug, NEW.name_zh, NEW.name_en, 
         (SELECT slug FROM categories WHERE id = NEW.category_id LIMIT 1),
         'active',
         NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM brand_profiles WHERE brand_slug = NEW.slug
  )
  ON CONFLICT (brand_slug) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to fire after insert on merchants
DROP TRIGGER IF EXISTS trigger_create_brand_profile_from_merchant ON merchants;

CREATE TRIGGER trigger_create_brand_profile_from_merchant
AFTER INSERT ON merchants
FOR EACH ROW
EXECUTE FUNCTION create_brand_profile_from_merchant();

-- Also create brand_profiles for existing merchants that don't have one (one-time migration)
INSERT INTO brand_profiles (brand_slug, name_zh, name_en, industry, status, created_at)
SELECT 
  m.slug,
  m.name_zh,
  m.name_en,
  c.slug,
  'active',
  NOW()
FROM merchants m
LEFT JOIN categories c ON m.category_id = c.id
WHERE NOT EXISTS (
  SELECT 1 FROM brand_profiles WHERE brand_profiles.brand_slug = m.slug
)
ON CONFLICT (brand_slug) DO NOTHING;

-- Verify the trigger exists and log results
SELECT 
  tgname as trigger_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'trigger_create_brand_profile_from_merchant';
