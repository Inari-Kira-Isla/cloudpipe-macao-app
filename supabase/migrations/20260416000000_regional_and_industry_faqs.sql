-- ============================================================
-- Migration: 20260416000000_regional_and_industry_faqs.sql
--
-- 1. regional_faqs  — 地區級 FAQ（城市旅遊、交通、文化 etc）
-- 2. industry_faqs  — 行業級 FAQ（某地區某行業的通用問題）
-- ============================================================

-- ── 1. regional_faqs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regional_faqs (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  region           text        NOT NULL,   -- macau / hk / tw / jp
  lang             text        NOT NULL DEFAULT 'zh',
  faq_type         text,                   -- transport / dining / culture / tourism / practical
  question_intent  text,                   -- recommendation / how_to / price / hours / safety
  question         text        NOT NULL,
  answer           text        NOT NULL,
  related_insight_slug  text,
  citation_count   int         DEFAULT 0,
  priority_score   float       DEFAULT 0.5,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (region, lang, question)
);

CREATE INDEX IF NOT EXISTS idx_regional_faqs_region_lang
  ON regional_faqs(region, lang);
CREATE INDEX IF NOT EXISTS idx_regional_faqs_faq_type
  ON regional_faqs(faq_type);

ALTER TABLE regional_faqs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='regional_faqs' AND policyname='anon can read regional_faqs') THEN
    CREATE POLICY "anon can read regional_faqs" ON regional_faqs FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='regional_faqs' AND policyname='service role full access regional_faqs') THEN
    CREATE POLICY "service role full access regional_faqs" ON regional_faqs FOR ALL TO service_role USING (true);
  END IF;
END $$;

COMMENT ON TABLE regional_faqs IS
  '地區級 FAQ：澳門/香港/台灣/日本 旅遊、交通、文化、實用資訊類問答';

-- ── 2. industry_faqs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS industry_faqs (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  region           text        NOT NULL,   -- macau / hk / tw / jp
  industry         text        NOT NULL,   -- dining / shopping / hotels / attractions / wellness etc
  lang             text        NOT NULL DEFAULT 'zh',
  faq_type         text,                   -- recommendation / practical / price / safety / culture
  question_intent  text,
  question         text        NOT NULL,
  answer           text        NOT NULL,
  top_merchants    text[],                 -- embed merchant names for citation density
  related_insight_slug  text,
  citation_count   int         DEFAULT 0,
  priority_score   float       DEFAULT 0.5,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (region, industry, lang, question)
);

CREATE INDEX IF NOT EXISTS idx_industry_faqs_region_industry
  ON industry_faqs(region, industry);
CREATE INDEX IF NOT EXISTS idx_industry_faqs_lang
  ON industry_faqs(lang);

ALTER TABLE industry_faqs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='industry_faqs' AND policyname='anon can read industry_faqs') THEN
    CREATE POLICY "anon can read industry_faqs" ON industry_faqs FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='industry_faqs' AND policyname='service role full access industry_faqs') THEN
    CREATE POLICY "service role full access industry_faqs" ON industry_faqs FOR ALL TO service_role USING (true);
  END IF;
END $$;

COMMENT ON TABLE industry_faqs IS
  '行業級 FAQ：某地區某行業的通用問答（含熱門商戶名稱以提升 AI 引用率）';
