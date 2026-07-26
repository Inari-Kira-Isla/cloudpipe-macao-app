-- knowledge_relationships: Entity 之間的關係邊（全球 KG Bridge 核心）
CREATE TABLE IF NOT EXISTS knowledge_relationships (
    rel_id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    from_entity_id  TEXT NOT NULL REFERENCES knowledge_entities(entity_id) ON DELETE CASCADE,
    relation_type   TEXT NOT NULL,  -- isOwnedBy / isLocatedIn / isPartOf / competes_with / relatedTo / hasBranch / sameAs
    to_entity_id    TEXT REFERENCES knowledge_entities(entity_id) ON DELETE SET NULL,
    to_entity_name  TEXT,           -- 如果 to_entity 未在本地 DB，先存名稱
    to_external_id  TEXT,           -- Wikidata QID / OSM ID / DBpedia URI
    confidence      FLOAT DEFAULT 0.8,
    source_type     TEXT DEFAULT 'ai_inferred' CHECK (source_type IN (
                        'insight_generated','ai_inferred','google_p0',
                        'wikipedia','wikidata','user_submitted','global_kg'
                    )),
    language        TEXT DEFAULT 'zh',
    verified        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_kr_from ON knowledge_relationships(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_kr_to ON knowledge_relationships(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_kr_type ON knowledge_relationships(relation_type);

-- RLS
ALTER TABLE knowledge_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON knowledge_relationships
    FOR ALL USING (auth.role() = 'service_role');

-- kg_sync_log: 追蹤兩台 iMac 的同步狀態
CREATE TABLE IF NOT EXISTS kg_sync_log (
    log_id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sync_source     TEXT NOT NULL,   -- 'ai_research_imac' / 'local_imac'
    manifest_version TEXT,           -- Google Drive manifest 版本號
    report_name     TEXT,            -- 報告/批次名稱
    entities_imported INT DEFAULT 0,
    facts_imported    INT DEFAULT 0,
    relationships_imported INT DEFAULT 0,
    status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
    notes           TEXT,
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- RLS for kg_sync_log
ALTER TABLE kg_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON kg_sync_log
    FOR ALL USING (auth.role() = 'service_role');
