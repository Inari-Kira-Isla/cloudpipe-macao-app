-- Migration: Add remaining core tables for CloudPipe schema
-- Date: 2026-04-13
-- Purpose: Add core tables required by later migrations

-- Categories table (must be created first for FK reference)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name_zh TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_pt TEXT,
    parent_id UUID REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON categories FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- Add category_id to merchants (references categories table above)
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);

CREATE INDEX IF NOT EXISTS idx_merchants_category ON merchants(category_id);

-- Add priority_score to merchant_faqs if not exists
ALTER TABLE merchant_faqs ADD COLUMN IF NOT EXISTS priority_score DECIMAL(3,2) DEFAULT 5.0;

-- Add generic question column (used by later migrations)
ALTER TABLE merchant_faqs ADD COLUMN IF NOT EXISTS question TEXT;

-- Add certification_sources to merchants (used by later migrations)
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS certification_sources JSONB DEFAULT '[]'::jsonb;

-- Crawler visits table (used by later migrations)
CREATE TABLE IF NOT EXISTS crawler_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    merchant_slug TEXT,
    visited_at TIMESTAMPTZ DEFAULT NOW(),
    status_code INTEGER DEFAULT 200,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE crawler_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crawler_visits_public_read" ON crawler_visits FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_crawler_visits_merchant ON crawler_visits(merchant_slug);
CREATE INDEX IF NOT EXISTS idx_crawler_visits_visited_at ON crawler_visits(visited_at);

-- Insights table
CREATE TABLE IF NOT EXISTS insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    trust_score INTEGER,
    last_verified_at TIMESTAMPTZ,
    verification_sources JSONB DEFAULT '[]'::jsonb,
    fact_check JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insights_public_read" ON insights FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_insights_slug ON insights(slug);

-- AI Referrals table
CREATE TABLE IF NOT EXISTS ai_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_slug TEXT,
    referrer_url TEXT,
    click_count INTEGER DEFAULT 0,
    search_query TEXT,
    ai_platform TEXT,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_referrals_public_read" ON ai_referrals FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_ai_referrals_brand ON ai_referrals(brand_slug);

-- Add ts column to ai_referrals
ALTER TABLE ai_referrals ADD COLUMN IF NOT EXISTS ts TIMESTAMPTZ DEFAULT NOW();

-- Add ts column alias to crawler_visits (used by later migrations/views)
ALTER TABLE crawler_visits ADD COLUMN IF NOT EXISTS ts TIMESTAMPTZ;
