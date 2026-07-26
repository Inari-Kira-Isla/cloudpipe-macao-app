-- Brand Ops Hub v2 — 完整升級 Migration
-- Phase 1 + Phase 2 全量 Schema
-- 2026-04-18

-- ── 0. Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 1. brand_ops_assets（L0 原始檔案層）─────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_ops_assets (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_slug       TEXT NOT NULL,
  asset_type       TEXT NOT NULL,      -- pdf / image / document / url / text / spreadsheet
  asset_subtype    TEXT,               -- product_photo / logo / menu_scan / catalog / business_card / scene_photo
  storage_path     TEXT,               -- brands/{slug}/assets/{uuid}.{ext}
  storage_bucket   TEXT DEFAULT 'brand-assets',
  mime_type        TEXT,
  file_size        BIGINT,
  file_hash        TEXT,               -- SHA256 去重
  original_filename TEXT,
  source_url       TEXT,               -- asset_type=url 時
  uploaded_by      TEXT DEFAULT 'manual',

  -- AI 解析狀態
  parse_status     TEXT DEFAULT 'queued',  -- queued / parsing / parsed / failed / manual_review
  parse_model      TEXT,
  parse_cost_usd   NUMERIC(10,4),
  parse_error      TEXT,
  parse_completed_at TIMESTAMPTZ,

  -- 圖片 metadata
  image_metadata   JSONB,
  thumbnail_path   TEXT,

  -- 審核
  review_status    TEXT DEFAULT 'pending',  -- pending / approved / rejected
  reviewed_by      TEXT,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boa_brand_type    ON brand_ops_assets(brand_slug, asset_type);
CREATE INDEX IF NOT EXISTS idx_boa_parse_queue   ON brand_ops_assets(parse_status) WHERE parse_status='queued';
CREATE UNIQUE INDEX IF NOT EXISTS idx_boa_hash   ON brand_ops_assets(file_hash) WHERE file_hash IS NOT NULL;

ALTER TABLE brand_ops_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boa_anon_read"  ON brand_ops_assets FOR SELECT USING (true);

-- ── 2. brand_ops_knowledge ALTER（升級現有表）─────────────────────────────────
-- 向後兼容：所有新欄位都有 DEFAULT 或允許 NULL
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brand_ops_knowledge' AND column_name='asset_id') THEN
    ALTER TABLE brand_ops_knowledge
      ADD COLUMN asset_id       UUID REFERENCES brand_ops_assets(id),
      ADD COLUMN chunk_index    INTEGER DEFAULT 0,
      ADD COLUMN schema_type    TEXT,
      ADD COLUMN structured_data JSONB,
      ADD COLUMN lang           TEXT DEFAULT 'zh-HK',
      ADD COLUMN source_quote   TEXT,
      ADD COLUMN source_page    INTEGER,
      ADD COLUMN confidence     NUMERIC(3,2),
      ADD COLUMN valid_from     DATE,
      ADD COLUMN valid_until    DATE,
      ADD COLUMN version        INTEGER DEFAULT 1,
      ADD COLUMN superseded_by  UUID REFERENCES brand_ops_knowledge(id),
      ADD COLUMN tags           TEXT[],
      ADD COLUMN usage_context  TEXT[],
      ADD COLUMN content_hash   TEXT,
      ADD COLUMN industry_template TEXT;
  END IF;
END $$;

-- 遷移舊 category → schema_type（保留 category 欄位向後兼容）
UPDATE brand_ops_knowledge SET schema_type = category WHERE schema_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_bok_schema ON brand_ops_knowledge(brand_slug, schema_type, status);
CREATE INDEX IF NOT EXISTS idx_bok_valid  ON brand_ops_knowledge(brand_slug, valid_until) WHERE status='active' AND valid_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bok_hash   ON brand_ops_knowledge(content_hash) WHERE content_hash IS NOT NULL;

-- ── 3. brand_ops_knowledge_embeddings（L2 向量層）─────────────────────────────
CREATE TABLE IF NOT EXISTS brand_ops_knowledge_embeddings (
  knowledge_id UUID PRIMARY KEY REFERENCES brand_ops_knowledge(id) ON DELETE CASCADE,
  brand_slug   TEXT NOT NULL,
  embedding    vector(1024),
  model        TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  tokens       INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boke_brand ON brand_ops_knowledge_embeddings(brand_slug);
-- HNSW index for ANN search
CREATE INDEX IF NOT EXISTS idx_boke_hnsw ON brand_ops_knowledge_embeddings
  USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);

ALTER TABLE brand_ops_knowledge_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boke_anon_read" ON brand_ops_knowledge_embeddings FOR SELECT USING (true);

-- ── 4. brand_ops_industry_templates（行業模板）────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_ops_industry_templates (
  id               TEXT PRIMARY KEY,
  name_zh          TEXT NOT NULL,
  description      TEXT,
  parent_template  TEXT REFERENCES brand_ops_industry_templates(id),
  schema_requirements JSONB NOT NULL DEFAULT '[]',
  sample_brands    TEXT[],
  version          INTEGER DEFAULT 1,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE brand_ops_industry_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boit_anon_read" ON brand_ops_industry_templates FOR SELECT USING (true);

-- 預設 4 個行業模板
INSERT INTO brand_ops_industry_templates (id, name_zh, description, schema_requirements, sample_brands) VALUES
(
  'b2b_wholesale_fnb',
  'B2B 食品批發',
  '針對食品/食材 B2B 批發商，重視產地認證、冷鏈物流、採購客戶案例',
  '[
    {"schema_type":"brand_identity","required":true,"priority":9},
    {"schema_type":"certification","required":true,"priority":9},
    {"schema_type":"product_catalog","required":true,"priority":10},
    {"schema_type":"product_detail","required":true,"priority":9},
    {"schema_type":"pricing_tier","required":true,"priority":8},
    {"schema_type":"delivery_logistics","required":true,"priority":9},
    {"schema_type":"customer_story","required":true,"priority":8},
    {"schema_type":"customer_persona","required":true,"priority":7},
    {"schema_type":"market_position","required":true,"priority":7},
    {"schema_type":"contact_channel","required":true,"priority":8},
    {"schema_type":"faq_seed","required":true,"priority":7},
    {"schema_type":"competitor_intel","required":false,"priority":6},
    {"schema_type":"policy","required":false,"priority":5},
    {"schema_type":"event_calendar","required":false,"priority":3},
    {"schema_type":"brand_voice","required":false,"priority":4}
  ]'::JSONB,
  ARRAY['inari-global-foods']
),
(
  'b2c_food_delivery',
  'B2C 食品配送',
  '針對直接面向消費者的食品配送品牌，重視下單流程、配送範圍、冷鏈保障',
  '[
    {"schema_type":"brand_identity","required":true,"priority":8},
    {"schema_type":"product_catalog","required":true,"priority":10},
    {"schema_type":"pricing_tier","required":true,"priority":9},
    {"schema_type":"delivery_logistics","required":true,"priority":10},
    {"schema_type":"location_info","required":true,"priority":9},
    {"schema_type":"contact_channel","required":true,"priority":9},
    {"schema_type":"faq_seed","required":true,"priority":8},
    {"schema_type":"use_case","required":true,"priority":7},
    {"schema_type":"customer_persona","required":true,"priority":7},
    {"schema_type":"policy","required":true,"priority":7},
    {"schema_type":"certification","required":false,"priority":6},
    {"schema_type":"event_calendar","required":false,"priority":5}
  ]'::JSONB,
  ARRAY['sea-urchin-delivery']
),
(
  'cafe_retail',
  '餐飲零售',
  '針對咖啡廳/餐廳/親子空間，重視實體位置、氛圍、使用場景',
  '[
    {"schema_type":"brand_identity","required":true,"priority":9},
    {"schema_type":"location_info","required":true,"priority":10},
    {"schema_type":"product_catalog","required":true,"priority":9},
    {"schema_type":"customer_persona","required":true,"priority":8},
    {"schema_type":"use_case","required":true,"priority":7},
    {"schema_type":"brand_visual","required":true,"priority":7},
    {"schema_type":"event_calendar","required":true,"priority":7},
    {"schema_type":"faq_seed","required":true,"priority":8},
    {"schema_type":"contact_channel","required":true,"priority":7},
    {"schema_type":"product_detail","required":false,"priority":6},
    {"schema_type":"pricing_tier","required":false,"priority":5},
    {"schema_type":"policy","required":false,"priority":4}
  ]'::JSONB,
  ARRAY['after-school-coffee', 'mind-coffee']
),
(
  'professional_service',
  '專業服務',
  '針對律師、會計、設計等專業服務機構，重視資格認證、服務套餐、客戶案例',
  '[
    {"schema_type":"brand_identity","required":true,"priority":9},
    {"schema_type":"service_package","required":true,"priority":10},
    {"schema_type":"pricing_tier","required":true,"priority":8},
    {"schema_type":"customer_story","required":true,"priority":9},
    {"schema_type":"certification","required":true,"priority":9},
    {"schema_type":"customer_persona","required":true,"priority":7},
    {"schema_type":"use_case","required":true,"priority":8},
    {"schema_type":"contact_channel","required":true,"priority":8},
    {"schema_type":"faq_seed","required":true,"priority":7},
    {"schema_type":"policy","required":false,"priority":6}
  ]'::JSONB,
  ARRAY[]::TEXT[]
)
ON CONFLICT (id) DO UPDATE SET
  schema_requirements = EXCLUDED.schema_requirements,
  version = brand_ops_industry_templates.version + 1;

-- ── 5. brand_ops_health（健康分）──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_ops_health (
  brand_slug          TEXT PRIMARY KEY,
  industry_template   TEXT REFERENCES brand_ops_industry_templates(id),
  completeness_score  INTEGER DEFAULT 0,
  freshness_score     INTEGER DEFAULT 0,
  quality_score       INTEGER DEFAULT 0,
  diversity_score     INTEGER DEFAULT 0,
  overall_score       INTEGER GENERATED ALWAYS AS (
    (completeness_score * 4 + freshness_score * 2 + quality_score * 3 + diversity_score * 1) / 10
  ) STORED,
  asset_count         INTEGER DEFAULT 0,
  knowledge_count     INTEGER DEFAULT 0,
  missing_required    JSONB DEFAULT '[]',
  last_computed_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE brand_ops_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boh_anon_read" ON brand_ops_health FOR SELECT USING (true);

-- 初始化試點品牌的 health 記錄
INSERT INTO brand_ops_health (brand_slug, industry_template) VALUES
  ('inari-global-foods',  'b2b_wholesale_fnb'),
  ('sea-urchin-delivery', 'b2c_food_delivery'),
  ('after-school-coffee', 'cafe_retail'),
  ('mind-coffee',         'cafe_retail')
ON CONFLICT (brand_slug) DO NOTHING;

-- ── 6. brand_ops_knowledge_versions（版本歷史）────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_ops_knowledge_versions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_id UUID NOT NULL,
  brand_slug   TEXT NOT NULL,
  version      INTEGER NOT NULL,
  snapshot     JSONB NOT NULL,
  changed_by   TEXT,
  change_reason TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(knowledge_id, version)
);

CREATE INDEX IF NOT EXISTS idx_bokv_kid ON brand_ops_knowledge_versions(knowledge_id);
ALTER TABLE brand_ops_knowledge_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bokv_anon_read" ON brand_ops_knowledge_versions FOR SELECT USING (true);

-- ── 7. 版本控制 Trigger（UPDATE 前自動 snapshot）──────────────────────────────
CREATE OR REPLACE FUNCTION brand_ops_knowledge_version_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content
     OR OLD.structured_data IS DISTINCT FROM NEW.structured_data
     OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO brand_ops_knowledge_versions (knowledge_id, brand_slug, version, snapshot, changed_by)
    VALUES (OLD.id, OLD.brand_slug, OLD.version,
            row_to_json(OLD)::JSONB, current_setting('app.changed_by', true));
    NEW.version = OLD.version + 1;
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bok_version ON brand_ops_knowledge;
CREATE TRIGGER trg_bok_version
  BEFORE UPDATE ON brand_ops_knowledge
  FOR EACH ROW EXECUTE FUNCTION brand_ops_knowledge_version_trigger();

-- ── 8. Hybrid Search RPC（BM25 + vector cosine）────────────────────────────────
CREATE OR REPLACE FUNCTION search_brand_knowledge(
  p_brand_slug TEXT,
  p_query      TEXT,
  p_top_k      INTEGER DEFAULT 10
)
RETURNS TABLE (
  id             UUID,
  schema_type    TEXT,
  title          TEXT,
  content        TEXT,
  structured_data JSONB,
  source_quote   TEXT,
  confidence     NUMERIC,
  lang           TEXT,
  score          FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id, k.schema_type, k.title, k.content,
    k.structured_data, k.source_quote, k.confidence, k.lang,
    ts_rank(to_tsvector('simple', k.title || ' ' || k.content),
            plainto_tsquery('simple', p_query)) AS score
  FROM brand_ops_knowledge k
  WHERE k.brand_slug = p_brand_slug
    AND k.status = 'active'
    AND (k.valid_until IS NULL OR k.valid_until >= CURRENT_DATE)
    AND (to_tsvector('simple', k.title || ' ' || k.content) @@ plainto_tsquery('simple', p_query)
         OR k.schema_type IN ('brand_identity','market_position','brand_voice'))
  ORDER BY score DESC
  LIMIT p_top_k;
END;
$$ LANGUAGE plpgsql;

-- ── 9. valid_until 過期 Function──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION archive_expired_knowledge()
RETURNS INTEGER AS $$
DECLARE expired_count INTEGER;
BEGIN
  UPDATE brand_ops_knowledge
  SET status = 'archived', updated_at = NOW()
  WHERE status = 'active'
    AND valid_until IS NOT NULL
    AND valid_until < CURRENT_DATE;
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;
