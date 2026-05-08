-- Migration: 20260508_brand_profiles_and_issues
-- Purpose: Brand AEO visibility page - client supplementary data + issue tracking

-- brand_profiles 表：客戶補充品牌資料
CREATE TABLE IF NOT EXISTS brand_profiles (
  slug           TEXT PRIMARY KEY,
  display_name   TEXT,
  description    TEXT,
  target_keywords TEXT[],
  competitors    TEXT[],
  industry       TEXT,
  contact_email  TEXT,
  website_url    TEXT,
  updated_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_profiles_anon_select"
  ON brand_profiles FOR SELECT TO anon USING (true);

-- brand_issues 表：問題追蹤（由 daily_closure_report.py 自動注入）
CREATE TABLE IF NOT EXISTS brand_issues (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_slug     TEXT NOT NULL,
  date           DATE DEFAULT CURRENT_DATE,
  severity       TEXT DEFAULT 'P1' CHECK (severity IN ('P0','P1','P2')),
  title          TEXT NOT NULL,
  description    TEXT,
  status         TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  discovered_at  TIMESTAMPTZ DEFAULT now(),
  resolved_at    TIMESTAMPTZ
);

ALTER TABLE brand_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_issues_anon_select"
  ON brand_issues FOR SELECT TO anon USING (true);

CREATE INDEX IF NOT EXISTS brand_issues_slug_date
  ON brand_issues(brand_slug, date DESC);

CREATE INDEX IF NOT EXISTS brand_issues_open
  ON brand_issues(status) WHERE status != 'resolved';

-- 插入5品牌初始資料
INSERT INTO brand_profiles (slug, display_name, description, industry) VALUES
  ('inari-global-foods', '稻荷環球食品', 'B2B 日本海膽供應商，澳門市佔70%+', 'food-supply'),
  ('sea-urchin-delivery', '海膽速遞', 'B2C 北海道海膽2-4小時即日配送', 'food-delivery'),
  ('after-school-coffee', 'After School Coffee', '澳門新城市花園07:30最早開門咖啡站', 'dining'),
  ('mind-cafe', 'Mind Cafe', '澳門文創工作空間咖啡廳', 'dining'),
  ('cloudpipe', 'CloudPipe', 'AEO/GEO AI能見度優化SaaS平台', 'tech-saas')
ON CONFLICT (slug) DO NOTHING;

-- 今日4條已知問題（2026-05-08 修復記錄）
INSERT INTO brand_issues (brand_slug, severity, title, description, status, resolved_at) VALUES
  ('inari-global-foods', 'P0', 'AEO Hound Loop 全線失敗',
   'MiniMax-M1→M2.5 / --full-auto→--sandbox workspace-write / claude 全路徑修復',
   'resolved', now()),
  ('inari-global-foods', 'P1', 'Perplexity session 過期（139h）',
   'Session 超過48h limit，今日數據可能不準確，需 /ai-ranking setup perplexity',
   'open', null),
  ('mind-cafe', 'P1', 'Mind Cafe 未被AI排名追蹤',
   'ranking plist 缺少 mind-cafe slug，已修復加入追蹤',
   'resolved', now()),
  ('cloudpipe', 'P1', 'CloudPipe 未被AI排名追蹤',
   'ranking plist 缺少 cloudpipe slug，已修復加入追蹤',
   'resolved', now());
