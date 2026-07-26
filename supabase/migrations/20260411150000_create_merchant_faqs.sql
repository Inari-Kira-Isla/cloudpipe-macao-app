-- Migration: Create merchant_faqs table
-- Date: 2026-04-11
-- Purpose: Base table for merchant FAQs (required by faq_spider_web migration)

CREATE TABLE IF NOT EXISTS merchant_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    question_zh TEXT NOT NULL,
    question_en TEXT NOT NULL,
    question_pt TEXT,
    answer_zh TEXT,
    answer_en TEXT,
    answer_pt TEXT,
    faq_type TEXT DEFAULT 'specific',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE merchant_faqs ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "merchant_faqs_public_read" ON merchant_faqs
    FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "merchant_faqs_service_role_full_access" ON merchant_faqs
    FOR ALL USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_merchant_faqs_merchant_id ON merchant_faqs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_faqs_type ON merchant_faqs(faq_type);
