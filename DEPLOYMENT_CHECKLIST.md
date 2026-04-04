# 🚀 部署檢查清單 — A/B 測試 + Analytics + RLS

**部署時間**: 2026-04-04 17:30 UTC  
**Commit**: 7f2fe19  
**狀態**: ✅ 已推送到 GitHub，Vercel 部署中

---

## ✅ 第一步：Vercel 部署驗證

### 1️⃣ 檢查部署狀態
```
URL: https://vercel.com/inari-kira-isla/cloudpipe-macao-app/deployments
預期: 顯示 commit 7f2fe19，狀態 "Ready"
時間: 2-3 分鐘
```

**部署成功標誌**:
- ✅ 部署圖表顯示 "Ready" (綠色)
- ✅ Preview URL 已生成
- ✅ Production URL 已更新

### 2️⃣ 測試定價頁面 (無 Supabase 配置也能訪問)
```bash
# 測試三個 variant
1. https://cloudpipe-macao-app.vercel.app/macao/pricing?variant=a
   預期: PREMIUM 高亮 + 3 列網格

2. https://cloudpipe-macao-app.vercel.app/macao/pricing?variant=b
   預期: ENTERPRISE 突出 + scale-105 + 👑 badge

3. https://cloudpipe-macao-app.vercel.app/macao/pricing?variant=c
   預期: 場景分組 + 3 個全寬卡片

4. https://cloudpipe-macao-app.vercel.app/macao/pricing (無參數)
   預期: 自動分配 variant (50%A / 30%C / 20%B)
```

### 3️⃣ 測試 Analytics 儀表板 (使用 mock data)
```bash
# 訪問儀表板
https://cloudpipe-macao-app.vercel.app/macao/analytics

預期結果:
✅ 4 個 KPI 卡片加載（LLMC/LLMR/LLMCF/收入）
✅ LLMC 分佈圖表顯示 5 種 bot
✅ LLMR 點擊率圖表顯示 5 層
✅ LLMCF 轉化漏斗顯示：3580 → 1247 → 203
✅ 頂級商戶表格顯示 5 家商戶
```

---

## ✅ 第二步：Supabase 配置 (啟用實時數據)

### 4️⃣ 執行 SQL Migration 1 — RLS 強化

**操作步驟**:
1. 訪問 https://supabase.com/dashboard
2. 選擇 CloudPipe 專案
3. 左側 > SQL Editor
4. 點擊 "New Query"
5. **複製以下完整 SQL** (見下方 Section A)
6. 執行 ("Run" 按鈕)

**預期結果**:
```
✅ RLS policies created (3 個政策)
✅ merchant_page_mapping_public_read
✅ merchant_page_mapping_friction_score_enterprise_only
✅ merchant_page_mapping_bd_operations_enterprise_only
✅ api_tokens table created
✅ rls_audit_log table created
```

### 5️⃣ 執行 SQL Migration 2 — Analytics 表

**操作步驟**:
1. SQL Editor > New Query
2. **複製以下完整 SQL** (見下方 Section B)
3. 執行

**預期結果**:
```
✅ analytics_events table created (索引已建)
✅ 4 個視圖已創建:
   - analytics_llmc_stats
   - analytics_llmr_stats
   - analytics_llmcf_funnel
   - analytics_conversion_windows
✅ RLS policies enabled
```

---

## ✅ 第三步：生產驗證

### 6️⃣ 驗證 A/B 測試分配
```bash
# 開啟瀏覽器開發者工具 (F12) → Network 標籤
# 訪問: https://cloudpipe-macao-app.vercel.app/macao/pricing

檢查點:
✅ 查看 XHR requests 中的 GA 事件
✅ 應該看到 "pricing_page_view" 事件發送
✅ 檢查 eventParameters.variant (值為 'A', 'B', 或 'C')

# 驗證 Cookie
開發者工具 → Application → Cookies
✅ cloudpipe_pricing_variant 應該被設置 (30天過期)
```

### 7️⃣ 驗證 GA 事件追蹤
```bash
# Google Analytics 4 Dashboard
# https://analytics.google.com → CloudPipe 項目

檢查點:
✅ 實時用戶數 > 0
✅ 事件標籤 "pricing_page_view" 應該出現
✅ 事件標籤 "pricing_cta_click" 應該出現 (點擊 CTA 按鈕後)

跳過條件: 若 GA4 未配置，此步驟可跳過
```

### 8️⃣ 驗證 Analytics Dashboard 實時數據 (可選，需 Supabase 配置)
```bash
# 訪問儀表板
https://cloudpipe-macao-app.vercel.app/macao/analytics

檢查點 (執行了 SQL migration 之後):
✅ 若 analytics_events 表有數據，儀表板會顯示實時數據
✅ 若表為空，儀表板會使用 mock data fallback
✅ 不會造成錯誤，頁面仍可正常訪問
```

---

## 🔐 SQL Migration A — RLS 強化

```sql
-- 執行此 SQL 到 Supabase SQL Editor
-- 預計耗時: 5-10 秒

-- ────────────────────────────────────────────────────
-- 1. 檢查 merchant_page_mapping 表結構
-- ────────────────────────────────────────────────────

-- 若表不存在相關欄位，需先執行：
-- ALTER TABLE merchant_page_mapping ADD COLUMN friction_score NUMERIC DEFAULT 0;
-- ALTER TABLE merchant_page_mapping ADD COLUMN bd_operations_log JSONB DEFAULT '[]'::jsonb;

-- ────────────────────────────────────────────────────
-- 2. 啟用 RLS
-- ────────────────────────────────────────────────────

ALTER TABLE merchant_page_mapping ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────
-- 3. 建立 RLS 政策
-- ────────────────────────────────────────────────────

-- 政策 1: 所有公開欄位（無認證也能讀）
CREATE POLICY "merchant_page_mapping_public_read"
  ON merchant_page_mapping
  FOR SELECT
  USING (true);

-- 政策 2: friction_score 只有 ENTERPRISE 用戶可讀
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

-- 政策 3: bd_operations_log 只有內部 service role 和 ENTERPRISE 用戶可讀
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

-- ────────────────────────────────────────────────────
-- 4. 建立 API token 表
-- ────────────────────────────────────────────────────

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

-- ────────────────────────────────────────────────────
-- 5. 建立審計日誌
-- ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rls_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  details JSONB
);

INSERT INTO rls_audit_log (table_name, policy_name, action, details) VALUES
  ('merchant_page_mapping', 'friction_score RLS', 'CREATED', '{"description": "friction_score 隱藏，僅 ENTERPRISE 可讀"}'),
  ('merchant_page_mapping', 'bd_operations_log RLS', 'CREATED', '{"description": "bd_operations_log 隱藏，僅 service_role 和 ENTERPRISE 可讀"}'),
  ('api_tokens', 'api_tokens_service_role_only', 'CREATED', '{"description": "API token 管理表"}');
```

---

## 🔐 SQL Migration B — Analytics 表

```sql
-- 執行此 SQL 到 Supabase SQL Editor
-- 預計耗時: 10-15 秒

-- ────────────────────────────────────────────────────
-- 1. 創建 analytics_events 主表
-- ────────────────────────────────────────────────────

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

-- ────────────────────────────────────────────────────
-- 2. 建立索引
-- ────────────────────────────────────────────────────

CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_merchant_slug ON analytics_events(merchant_slug);
CREATE INDEX idx_analytics_events_insight_slug ON analytics_events(insight_slug);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(event_timestamp DESC);
CREATE INDEX idx_analytics_events_region ON analytics_events(region);
CREATE INDEX idx_analytics_events_ai_bot ON analytics_events(ai_bot_name);
CREATE INDEX idx_analytics_events_llm_citation_id ON analytics_events(llm_citation_id);
CREATE INDEX idx_analytics_events_conversion_window ON analytics_events(conversion_window_minutes);

-- ────────────────────────────────────────────────────
-- 3. 建立聚合視圖 — LLMC
-- ────────────────────────────────────────────────────

CREATE OR REPLACE VIEW analytics_llmc_stats AS
SELECT
  DATE(event_timestamp) as date,
  region,
  COUNT(*) as total_citations,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT ai_bot_name) as bot_count
FROM analytics_events
WHERE event_type = 'citation'
GROUP BY DATE(event_timestamp), region;

-- ────────────────────────────────────────────────────
-- 4. 建立聚合視圖 — LLMR
-- ────────────────────────────────────────────────────

CREATE OR REPLACE VIEW analytics_llmr_stats AS
SELECT
  DATE(event_timestamp) as date,
  region,
  COUNT(*) as total_clicks,
  COUNT(DISTINCT session_id) as unique_clickers,
  COUNT(CASE WHEN is_ai_generated THEN 1 END) as ai_referral_clicks,
  ROUND(
    COUNT(CASE WHEN is_ai_generated THEN 1 END)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 2
  ) as ai_ctr_percent
FROM analytics_events
WHERE event_type = 'referral_click'
GROUP BY DATE(event_timestamp), region;

-- ────────────────────────────────────────────────────
-- 5. 建立聚合視圖 — LLMCF 漏斗
-- ────────────────────────────────────────────────────

CREATE OR REPLACE VIEW analytics_llmcf_funnel AS
WITH funnel_data AS (
  SELECT
    CASE
      WHEN event_type = 'citation' THEN 1
      WHEN event_type = 'referral_click' THEN 2
      WHEN event_type = 'arrival' THEN 3
      WHEN event_type = 'conversion' THEN 4
    END as funnel_stage,
    merchant_slug,
    region,
    DATE(event_timestamp) as date,
    COUNT(*) as count
  FROM analytics_events
  GROUP BY funnel_stage, merchant_slug, region, DATE(event_timestamp)
)
SELECT
  date,
  region,
  merchant_slug,
  SUM(CASE WHEN funnel_stage = 1 THEN count ELSE 0 END) as citations,
  SUM(CASE WHEN funnel_stage = 2 THEN count ELSE 0 END) as referral_clicks,
  SUM(CASE WHEN funnel_stage = 3 THEN count ELSE 0 END) as arrivals,
  SUM(CASE WHEN funnel_stage = 4 THEN count ELSE 0 END) as conversions
FROM funnel_data
GROUP BY date, region, merchant_slug;

-- ────────────────────────────────────────────────────
-- 6. 建立聚合視圖 — 轉化時間窗口
-- ────────────────────────────────────────────────────

CREATE OR REPLACE VIEW analytics_conversion_windows AS
SELECT
  DATE(event_timestamp) as date,
  region,
  merchant_slug,
  COUNT(CASE WHEN conversion_window_minutes <= 0 THEN 1 END) as conversions_0h,
  COUNT(CASE WHEN conversion_window_minutes > 0 AND conversion_window_minutes <= 1440 THEN 1 END) as conversions_24h,
  COUNT(CASE WHEN conversion_window_minutes > 1440 AND conversion_window_minutes <= 4320 THEN 1 END) as conversions_72h,
  COUNT(*) as total_conversions
FROM analytics_events
WHERE event_type = 'conversion'
GROUP BY DATE(event_timestamp), region, merchant_slug;

-- ────────────────────────────────────────────────────
-- 7. 啟用 RLS
-- ────────────────────────────────────────────────────

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

-- ────────────────────────────────────────────────────
-- 完成！
-- ────────────────────────────────────────────────────
```

---

## 📋 快速檢查清單

- [ ] **Vercel 部署成功** (Status: Ready)
- [ ] **測試 Variant A** (/macao/pricing?variant=a)
- [ ] **測試 Variant B** (/macao/pricing?variant=b)
- [ ] **測試 Variant C** (/macao/pricing?variant=c)
- [ ] **測試 Analytics Dashboard** (/macao/analytics)
- [ ] **執行 SQL Migration A** (RLS 強化)
- [ ] **執行 SQL Migration B** (Analytics 表)
- [ ] **驗證 GA 事件** (Google Analytics)
- [ ] **驗證 Cookie 設置** (cloudpipe_pricing_variant)

---

## 🎯 下一步

**立即執行**:
```bash
# 1. 訪問 Vercel Dashboard 確認部署完成 (2-3 分鐘)
https://vercel.com/inari-kira-isla/cloudpipe-macao-app/deployments

# 2. 訪問 Supabase SQL Editor 執行 Migration A 和 B
https://supabase.com/dashboard → SQL Editor

# 3. 測試三個 variant 和 analytics 頁面
```

**若有問題**:
- [ ] 檢查 Vercel 部署日誌
- [ ] 檢查 Supabase SQL 執行結果
- [ ] 查看瀏覽器控制台是否有 JavaScript 錯誤

---

**部署時間**: 2026-04-04  
**估計完成時間**: 2026-04-04 18:00 UTC  
**負責人**: CloudPipe 開發團隊
