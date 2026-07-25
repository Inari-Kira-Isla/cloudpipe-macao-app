-- Migration: Create base merchants table
-- Date: 2026-04-08
-- Purpose: Base table for merchant data (required by later migrations)

CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name_zh TEXT,
    name_en TEXT,
    industry TEXT,
    district TEXT,
    website TEXT,
    phone TEXT,
    address TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "merchants_public_read" ON merchants
    FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "merchants_service_role_full_access" ON merchants
    FOR ALL USING (auth.role() = 'service_role');

-- Add index on slug
CREATE INDEX IF NOT EXISTS idx_merchants_slug ON merchants(slug);

-- Add index on industry
CREATE INDEX IF NOT EXISTS idx_merchants_industry ON merchants(industry);

-- Add index on district
CREATE INDEX IF NOT EXISTS idx_merchants_district ON merchants(district);
