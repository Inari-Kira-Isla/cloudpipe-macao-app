#!/usr/bin/env python3
"""
部署驗證和 Supabase SQL 執行自動化腳本
用於 CloudPipe 澳門商業知識圖譜 A/B 測試 + Analytics + RLS 部署

使用方式:
  python3 scripts/deploy-verify.py --verify-only          # 只驗證部署
  python3 scripts/deploy-verify.py --execute-sql          # 執行 SQL migrations
  python3 scripts/deploy-verify.py --full                 # 完整部署驗證 + SQL 執行
"""

import os
import sys
import json
import time
import requests
from datetime import datetime
from typing import Dict, List, Tuple

# 配置
BASE_URL = "https://cloudpipe-macao-app.vercel.app"
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_SERVICE_ROLE = os.getenv("SUPABASE_SERVICE_ROLE", "")

# SQL Migrations
SQL_MIGRATION_A = """
-- RLS 強化 (friction_score & bd_operations_log)
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
-- Analytics Events 表
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
"""

class DeploymentVerifier:
    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "base_url": BASE_URL,
            "tests": []
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

    def verify_endpoints(self) -> Dict[str, bool]:
        """驗證所有部署端點"""
        self.log("開始驗證部署端點...", "INFO")

        endpoints = {
            "pricing_variant_a": f"{BASE_URL}/macao/pricing?variant=a",
            "pricing_variant_b": f"{BASE_URL}/macao/pricing?variant=b",
            "pricing_variant_c": f"{BASE_URL}/macao/pricing?variant=c",
            "pricing_default": f"{BASE_URL}/macao/pricing",
            "analytics": f"{BASE_URL}/macao/analytics",
        }

        results = {}
        for name, url in endpoints.items():
            try:
                response = requests.get(url, timeout=10)
                is_ok = response.status_code == 200
                results[name] = is_ok

                status = "✅ 成功" if is_ok else f"❌ HTTP {response.status_code}"
                self.log(f"{name}: {status}", "SUCCESS" if is_ok else "ERROR")

                # 檢查關鍵內容
                if is_ok:
                    checks = self._check_content(name, response.text)
                    for check_name, passed in checks.items():
                        check_status = "✅" if passed else "⚠️"
                        self.log(f"  {check_status} {check_name}")

            except Exception as e:
                results[name] = False
                self.log(f"{name}: ❌ 錯誤 - {str(e)}", "ERROR")

        return results

    def _check_content(self, endpoint: str, content: str) -> Dict[str, bool]:
        """檢查頁面內容"""
        checks = {}

        if "variant_a" in endpoint:
            checks["PREMIUM 高亮標籤"] = "🎯 最受歡迎" in content or "PREMIUM" in content
        elif "variant_b" in endpoint:
            checks["ENTERPRISE 突出"] = "ENTERPRISE" in content and "👑" in content
        elif "variant_c" in endpoint:
            checks["場景分組"] = "內容創作者" in content and "澳門商戶" in content
        elif "pricing_default" in endpoint:
            checks["自動 variant 分配"] = "PREMIUM" in content or "FREE" in content
        elif "analytics" in endpoint:
            checks["KPI 卡片"] = "LLMC" in content and "LLMR" in content
            checks["轉化漏斗"] = "LLMCF" in content

        return checks

    def execute_sql_migration(self, migration_name: str, sql: str) -> bool:
        """執行 Supabase SQL migration"""
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE:
            self.log(f"跳過 {migration_name}: 未配置 SUPABASE 認證", "WARN")
            return False

        self.log(f"執行 SQL Migration: {migration_name}...", "INFO")

        try:
            headers = {
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE}",
                "Content-Type": "application/json",
            }

            # Supabase SQL 執行 API
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/rpc/sql_execute",
                headers=headers,
                json={"sql": sql},
                timeout=30
            )

            if response.status_code in [200, 201]:
                self.log(f"{migration_name}: ✅ 成功執行", "SUCCESS")
                return True
            else:
                self.log(f"{migration_name}: ❌ 執行失敗 - {response.status_code}", "ERROR")
                self.log(f"  Response: {response.text[:200]}", "ERROR")
                return False

        except Exception as e:
            self.log(f"{migration_name}: ❌ 錯誤 - {str(e)}", "ERROR")
            return False

    def generate_report(self) -> str:
        """生成部署報告"""
        report = f"""
╔════════════════════════════════════════════════════════════╗
║     CloudPipe 澳門商業知識圖譜 — 部署驗證報告              ║
╚════════════════════════════════════════════════════════════╝

⏰ 時間: {self.results['timestamp']}
🔗 Base URL: {self.results['base_url']}

🧪 部署驗證結果:
"""

        # 添加詳細結果
        for test in self.results['tests']:
            status = "✅" if test['passed'] else "❌"
            report += f"\n  {status} {test['name']}"
            if 'details' in test:
                for detail in test['details']:
                    report += f"\n     • {detail}"

        report += f"""

📋 後續步驟:
  1. ✅ 訪問 Supabase Dashboard
     https://supabase.com/dashboard

  2. 執行 SQL Migration A (RLS 強化)
     • SQL Editor > New Query
     • 複製文件: supabase/migrations/rls-friction-score-bd-ops.sql
     • 執行 (Ctrl+Enter)

  3. 執行 SQL Migration B (Analytics)
     • SQL Editor > New Query
     • 複製文件: supabase/migrations/analytics-events-table.sql
     • 執行 (Ctrl+Enter)

✨ 驗證完成！
"""
        return report

    def run_full_verification(self):
        """完整驗證流程"""
        self.log("="*60, "INFO")
        self.log("CloudPipe 部署驗證開始", "INFO")
        self.log("="*60, "INFO")

        # 1. 驗證端點
        endpoints_ok = self.verify_endpoints()
        self.results['endpoint_tests'] = endpoints_ok

        all_passed = all(endpoints_ok.values())
        if all_passed:
            self.log("✅ 所有端點驗證通過！", "SUCCESS")
        else:
            self.log("⚠️ 部分端點驗證失敗，請檢查部署", "WARN")

        # 2. 生成報告
        report = self.generate_report()
        self.log(report, "INFO")

        # 保存報告
        with open('DEPLOYMENT_REPORT.txt', 'w', encoding='utf-8') as f:
            f.write(report)
        self.log("報告已保存到 DEPLOYMENT_REPORT.txt", "SUCCESS")

def main():
    import argparse

    parser = argparse.ArgumentParser(description="CloudPipe 部署驗證")
    parser.add_argument("--verify-only", action="store_true", help="只驗證部署")
    parser.add_argument("--execute-sql", action="store_true", help="執行 SQL migrations")
    parser.add_argument("--full", action="store_true", help="完整驗證")

    args = parser.parse_args()

    verifier = DeploymentVerifier()

    if args.verify_only or args.full:
        verifier.run_full_verification()

    if args.execute_sql or args.full:
        verifier.log("", "INFO")
        verifier.log("="*60, "INFO")
        verifier.log("SQL Migration 執行", "INFO")
        verifier.log("="*60, "INFO")

        verifier.execute_sql_migration("Migration A - RLS 強化", SQL_MIGRATION_A)
        time.sleep(2)
        verifier.execute_sql_migration("Migration B - Analytics", SQL_MIGRATION_B)

if __name__ == "__main__":
    main()
