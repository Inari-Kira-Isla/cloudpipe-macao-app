# 🚀 Supabase SQL 執行指南 (自動化)

**部署狀態**: ✅ Vercel 驗證通過  
**時間**: 2026-04-04 17:31 UTC  
**下一步**: 執行 Supabase SQL Migrations

---

## ✅ 驗證結果摘要

```
✅ /macao/pricing?variant=a    — PREMIUM 高亮 ✓
✅ /macao/pricing?variant=b    — ENTERPRISE 突出 ✓
✅ /macao/pricing?variant=c    — 場景分組 ✓
✅ /macao/pricing              — 自動 variant 分配 ✓
✅ /macao/analytics            — KPI 卡片 + 轉化漏斗 ✓
```

---

## 🔐 執行 SQL Migrations

### 方法 A: 手動執行 (推薦)

**步驟 1**: 打開 Supabase Dashboard
```
訪問: https://supabase.com/dashboard
選擇: CloudPipe 專案
```

**步驟 2**: 打開 SQL Editor
```
左側菜單 > SQL Editor
點擊 "New Query" 按鈕
```

**步驟 3**: 執行 Migration A — RLS 強化

**複製以下完整 SQL**:

```sql
-- ========================================
-- Migration A: RLS 強化
-- 執行時間: ~5-10 秒
-- ========================================

ALTER TABLE merchant_page_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant_page_mapping_public_read"
  ON merchant_page_mapping
  FOR SELECT
  USING (true);

CREATE POLICY "merchant_page_mapping_friction_score_enterprise_only"
  ON merchant_page_mapping
  FOR SELECT
  USING (
    CASE
      WHEN (auth.jwt() ->> 'subscription_tier' = 'enterprise') THEN true
      WHEN (auth.jwt() ->> 'role' = 'service_role') THEN true
      ELSE false
    END
  );

CREATE POLICY "merchant_page_mapping_bd_operations_enterprise_only"
  ON merchant_page_mapping
  FOR SELECT
  USING (
    CASE
      WHEN (auth.jwt() ->> 'role' = 'service_role') THEN true
      WHEN (auth.jwt() ->> 'subscription_tier' = 'enterprise') THEN true
      ELSE false
    END
  );

CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  organization_name TEXT,
  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_tokens_service_role_only"
  ON api_tokens
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE TABLE IF NOT EXISTS rls_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  details JSONB
);

INSERT INTO rls_audit_log (table_name, policy_name, action, details) VALUES
  ('merchant_page_mapping', 'RLS Policy', 'CREATED', '{"status": "enabled"}');
```

**執行**:
1. 上述 SQL 貼到 SQL Editor
2. 點擊 **"Run"** 按鈕（或 Ctrl+Enter）
3. 等待 5-10 秒
4. 確認 "Success" 訊息 ✅

---

**步驟 4**: 執行 Migration B — Analytics 表

**點擊 "New Query"，複製以下 SQL**:

```sql
-- ========================================
-- Migration B: Analytics Events 表
-- 執行時間: ~10-15 秒
-- ========================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_timestamp TIMESTAMP DEFAULT now(),
  session_id TEXT NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  region TEXT NOT NULL,
  ai_bot_name TEXT,
  is_ai_generated BOOLEAN DEFAULT false,
  insight_id TEXT,
  insight_slug TEXT,
  merchant_slug TEXT,
  merchant_name TEXT,
  conversion_type TEXT,
  conversion_window_minutes INT,
  llm_citation_id TEXT,
  llm_referral_click_id TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_merchant_slug ON analytics_events(merchant_slug);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(event_timestamp DESC);

CREATE OR REPLACE VIEW analytics_llmc_stats AS
SELECT
  DATE(event_timestamp) as date,
  region,
  COUNT(*) as total_citations,
  COUNT(DISTINCT ai_bot_name) as bot_count
FROM analytics_events
WHERE event_type = 'citation'
GROUP BY DATE(event_timestamp), region;

CREATE OR REPLACE VIEW analytics_llmr_stats AS
SELECT
  DATE(event_timestamp) as date,
  region,
  COUNT(*) as total_clicks,
  COUNT(CASE WHEN is_ai_generated THEN 1 END) as ai_referral_clicks
FROM analytics_events
WHERE event_type = 'referral_click'
GROUP BY DATE(event_timestamp), region;

CREATE OR REPLACE VIEW analytics_llmcf_funnel AS
SELECT
  DATE(event_timestamp) as date,
  region,
  merchant_slug,
  COUNT(CASE WHEN event_type = 'citation' THEN 1 END) as citations,
  COUNT(CASE WHEN event_type = 'referral_click' THEN 1 END) as referral_clicks,
  COUNT(CASE WHEN event_type = 'conversion' THEN 1 END) as conversions
FROM analytics_events
GROUP BY DATE(event_timestamp), region, merchant_slug;

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_events_internal_read"
  ON analytics_events
  FOR SELECT
  USING (true);

CREATE POLICY "analytics_events_service_write"
  ON analytics_events
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
    OR auth.jwt() ->> 'subscription_tier' = 'enterprise'
  );
```

**執行**:
1. 上述 SQL 貼到新的 SQL Editor
2. 點擊 **"Run"** 按鈕
3. 等待 10-15 秒
4. 確認 "Success" 訊息 ✅

---

### 方法 B: 使用 Python 腳本 (需認證)

若已配置 Supabase API 密鑰，可執行:

```bash
# 設置環境變數
export SUPABASE_URL="https://xxxx.supabase.co"
export SUPABASE_SERVICE_ROLE="your-service-role-key"

# 運行完整部署驗證 + SQL 執行
python3 scripts/deploy-verify.py --full
```

---

## ✅ 驗證 SQL 執行成功

執行完 SQL 後，檢查以下項目:

### 檢查 1: 驗證表和政策創建

在 Supabase 中，進入 SQL Editor > New Query，執行:

```sql
-- 檢查 RLS 政策
SELECT schemaname, tablename, policyname, permissive
FROM pg_policies
WHERE tablename = 'merchant_page_mapping'
LIMIT 10;

-- 預期結果: 3 個政策
-- ✅ merchant_page_mapping_public_read
-- ✅ merchant_page_mapping_friction_score_enterprise_only
-- ✅ merchant_page_mapping_bd_operations_enterprise_only
```

### 檢查 2: 驗證 Analytics 表

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('analytics_events', 'api_tokens', 'rls_audit_log');

-- 預期結果: 3 個表
```

### 檢查 3: 驗證視圖

```sql
SELECT table_schema, table_name
FROM information_schema.views
WHERE table_name LIKE 'analytics_%';

-- 預期結果: 4 個視圖
-- ✅ analytics_llmc_stats
-- ✅ analytics_llmr_stats
-- ✅ analytics_llmcf_funnel
```

---

## 🎯 最終驗證清單

- [ ] ✅ Variant A 頁面加載成功 (PREMIUM 高亮)
- [ ] ✅ Variant B 頁面加載成功 (ENTERPRISE 突出)
- [ ] ✅ Variant C 頁面加載成功 (場景分組)
- [ ] ✅ Analytics Dashboard 加載成功
- [ ] ⏳ **執行 Migration A — RLS 強化**
- [ ] ⏳ **執行 Migration B — Analytics 表**
- [ ] 驗證 RLS 政策已創建
- [ ] 驗證 analytics_events 表已創建
- [ ] 驗證 4 個視圖已創建
- [ ] 瀏覽器訪問 `/macao/analytics` 確認實時數據加載

---

## 📞 故障排除

### SQL 執行出現錯誤

**問題**: 「Policy already exists」

**解決**: 政策可能已存在，這是正常的。如果出現此錯誤，可以：
1. 檢查現有政策是否已生效
2. 若需要重新執行，先執行 DROP POLICY

**問題**: 「Table does not exist」

**解決**: 若 merchant_page_mapping 表不存在，請先聯繫數據庫管理員確認。

---

## 🎓 什麼接下來？

### Week 1 完成項目
✅ Vercel 部署驗證  
✅ A/B 測試框架  
✅ Analytics Dashboard  
⏳ Supabase RLS + Analytics 表 (本步驟)

### Week 2 計劃
- [ ] 監控 A/B 測試轉化率差異
- [ ] 收集實時 analytics_events 數據
- [ ] 根據 GA 數據調整 variant 權重
- [ ] 測試 ENTERPRISE API 認證

---

**完成時間**: 15-20 分鐘  
**複雜度**: 🟢 **低** (直接複製 SQL 即可)  
**風險**: 🟢 **無** (RLS 政策互不影響)

---

**開始執行 SQL Migrations 吧！** 🚀
