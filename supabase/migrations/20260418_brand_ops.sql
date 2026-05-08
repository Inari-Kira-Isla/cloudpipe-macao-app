-- Brand Ops Hub — 品牌操作台三張表
-- 2026-04-18

-- 品牌上傳資料庫（待審核 → 啟用 → 同步到本地 brand_knowledge）
CREATE TABLE IF NOT EXISTS brand_ops_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_slug TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT DEFAULT 'manual',  -- manual / pdf / url
  status TEXT DEFAULT 'pending',      -- pending / active / rejected
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bok_brand_status ON brand_ops_knowledge(brand_slug, status);

-- 內容方向設定（UI 寫入 → brand_brain_weekly 讀取）
CREATE TABLE IF NOT EXISTS brand_ops_content_plan (
  brand_slug TEXT PRIMARY KEY,
  commercial_goal TEXT,
  content_pillars JSONB DEFAULT '[]',
  avoid_topics TEXT[] DEFAULT '{}',
  next_focus TEXT,
  context_posts JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 近期發文快取（本地 SQLite fb_posts 每日同步）
CREATE TABLE IF NOT EXISTS brand_ops_posts_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_slug TEXT NOT NULL,
  local_post_id INTEGER,
  content TEXT NOT NULL,
  hook_type TEXT,
  published_at TIMESTAMPTZ,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_slug, local_post_id)
);

CREATE INDEX IF NOT EXISTS idx_bopc_brand ON brand_ops_posts_cache(brand_slug, published_at DESC);

-- RLS
ALTER TABLE brand_ops_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_ops_content_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_ops_posts_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_ops_knowledge_read" ON brand_ops_knowledge FOR SELECT USING (true);
CREATE POLICY "brand_ops_content_plan_read" ON brand_ops_content_plan FOR SELECT USING (true);
CREATE POLICY "brand_ops_posts_cache_read" ON brand_ops_posts_cache FOR SELECT USING (true);
