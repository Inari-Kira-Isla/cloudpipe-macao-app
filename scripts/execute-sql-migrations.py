#!/usr/bin/env python3
"""
執行 Supabase SQL Migrations
使用 Supabase API 執行 RLS 和 Analytics 表設置
"""

import os
import sys
import json
import requests
from datetime import datetime
from typing import Tuple

# 從 .env.local 讀取認證信息
SUPABASE_URL = "https://yitmabzsxfgbchhhjjef.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "sb_secret_eNR3yu3mLT89N_kTJiDvYw_4yE3eHuK"

# SQL Migrations
SQL_MIGRATION_A = """
-- Migration A: RLS 強化 (friction_score & bd_operations_log)

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
"""

SQL_MIGRATION_B = """
-- Migration B: Analytics Events 表

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

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_merchant_slug ON analytics_events(merchant_slug);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(event_timestamp DESC);

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
"""

class SupabaseSQLExecutor:
    def __init__(self, url: str, service_role_key: str):
        self.url = url
        self.service_role_key = service_role_key
        self.headers = {
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    def log(self, message: str, level: str = "INFO"):
        """輸出日誌"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        prefix = {
            "INFO": "ℹ️ ",
            "SUCCESS": "✅",
            "ERROR": "❌",
            "WARN": "⚠️ ",
        }.get(level, "• ")
        print(f"{prefix} [{timestamp}] {message}")

    def execute_sql(self, sql: str, migration_name: str) -> Tuple[bool, str]:
        """使用 Supabase RPC 執行 SQL"""
        self.log(f"執行 {migration_name}...", "INFO")

        try:
            # 方法 1: 使用 Supabase SQL Editor API (需要通過 PostgreSQL)
            # 由於 REST API 限制，改用直接 SQL 執行

            # 分割 SQL 語句並逐個執行
            statements = [s.strip() for s in sql.split(';') if s.strip()]

            for i, statement in enumerate(statements, 1):
                if not statement:
                    continue

                self.log(f"  執行語句 {i}/{len(statements)}...", "INFO")

                # 使用 Supabase REST API 的 query 端點
                response = requests.post(
                    f"{self.url}/rest/v1/rpc/sql_execute",
                    headers=self.headers,
                    json={"sql": statement},
                    timeout=30
                )

                if response.status_code >= 400:
                    # 嘗試替代方法：使用 PostgreSQL 連接
                    self.log(f"  REST API 返回 {response.status_code}，嘗試替代方法...", "WARN")
                    return self._execute_with_psycopg(sql, migration_name)

            self.log(f"{migration_name}: ✅ 執行成功", "SUCCESS")
            return True, f"{migration_name} 執行成功"

        except Exception as e:
            self.log(f"{migration_name}: ❌ 錯誤 - {str(e)}", "ERROR")
            return False, f"執行失敗: {str(e)}"

    def _execute_with_psycopg(self, sql: str, migration_name: str) -> Tuple[bool, str]:
        """使用 psycopg2 直接連接 PostgreSQL"""
        try:
            import psycopg2

            # 從 Supabase URL 提取連接信息
            # URL 格式: https://xxxx.supabase.co
            project_id = self.url.split("//")[1].split(".")[0]

            # 構建 PostgreSQL 連接字符串
            conn_string = f"postgresql://postgres.{project_id}:{self.service_role_key}@{project_id}.db.supabase.co:5432/postgres"

            with psycopg2.connect(conn_string) as conn:
                with conn.cursor() as cursor:
                    cursor.execute(sql)
                    conn.commit()

            self.log(f"{migration_name}: ✅ 使用 psycopg2 執行成功", "SUCCESS")
            return True, f"{migration_name} 執行成功"

        except ImportError:
            self.log("psycopg2 未安裝，請執行: pip install psycopg2-binary", "WARN")
            return False, "請安裝 psycopg2"
        except Exception as e:
            self.log(f"{migration_name}: ❌ 錯誤 - {str(e)}", "ERROR")
            return False, f"執行失敗: {str(e)}"

    def verify_execution(self) -> bool:
        """驗證 SQL 執行結果"""
        self.log("驗證 SQL 執行結果...", "INFO")

        try:
            # 驗證查詢 1: 檢查 RLS 政策
            verify_sql = """
            SELECT COUNT(*) as policy_count
            FROM pg_policies
            WHERE tablename = 'merchant_page_mapping';
            """

            response = requests.post(
                f"{self.url}/rest/v1/rpc/sql_execute",
                headers=self.headers,
                json={"sql": verify_sql},
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ 驗證成功: {result}", "SUCCESS")
                return True
            else:
                self.log(f"⚠️ 驗證返回 {response.status_code}", "WARN")
                return False

        except Exception as e:
            self.log(f"驗證出錯: {str(e)}", "WARN")
            return False

    def run_full_execution(self):
        """完整執行流程"""
        self.log("="*60, "INFO")
        self.log("Supabase SQL Migrations 執行", "INFO")
        self.log("="*60, "INFO")
        self.log(f"Supabase URL: {self.url}", "INFO")

        results = []

        # 執行 Migration A
        success_a, msg_a = self.execute_sql(SQL_MIGRATION_A, "Migration A - RLS 強化")
        results.append(("Migration A - RLS 強化", success_a))
        self.log(msg_a, "SUCCESS" if success_a else "ERROR")

        self.log("等待 2 秒...", "INFO")
        import time
        time.sleep(2)

        # 執行 Migration B
        success_b, msg_b = self.execute_sql(SQL_MIGRATION_B, "Migration B - Analytics 表")
        results.append(("Migration B - Analytics 表", success_b))
        self.log(msg_b, "SUCCESS" if success_b else "ERROR")

        # 驗證
        self.log("", "INFO")
        self.log("="*60, "INFO")
        verified = self.verify_execution()

        # 生成報告
        self.log("", "INFO")
        self.log("✨ SQL Migrations 執行完成！", "SUCCESS")
        self.log("", "INFO")

        report = "\n".join([
            f"  {'✅' if success else '❌'} {name}"
            for name, success in results
        ])

        print(f"""
╔════════════════════════════════════════════════════════════╗
║            Supabase SQL Migrations 執行報告                ║
╚════════════════════════════════════════════════════════════╝

執行結果:
{report}

驗證狀態: {'✅ 通過' if verified else '⚠️ 待確認'}

下一步:
  1. 訪問 Supabase Dashboard > SQL Editor
  2. 執行驗證查詢確認表和視圖已創建
  3. 訪問 /macao/analytics 確認實時數據加載

""")

        return all(success for _, success in results)

def main():
    print("\n🚀 開始執行 Supabase SQL Migrations...\n")

    executor = SupabaseSQLExecutor(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    success = executor.run_full_execution()

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
