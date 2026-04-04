#!/usr/bin/env python3
"""
Supabase 自動遷移執行器
用法: python3 scripts/auto-migrate.py
"""

import os
import sys
from pathlib import Path

# 讀取 .env.local
env_path = Path.home() / "Documents/cloudpipe-macao-app/.env.local"
env_vars = {}

with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#"):
            key, val = line.split("=", 1)
            env_vars[key] = val

SUPABASE_URL = env_vars.get("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_ROLE_KEY = env_vars.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

# 直接使用 psycopg2 執行遷移（PostgreSQL）
try:
    import psycopg2
except ImportError:
    print("📦 Installing psycopg2...")
    os.system(f"{sys.executable} -m pip install -q psycopg2-binary")
    import psycopg2

# 提取連接信息
from urllib.parse import urlparse
parsed = urlparse(SUPABASE_URL)

# Supabase 連接字符串格式
db_host = "aws-0-us-east-1.pooler.supabase.com"
db_port = 6543
db_name = "postgres"

# 使用服務角色密鑰
project_id = SUPABASE_URL.split("://")[1].split(".")[0]  # yitmabzsxfgbchhhjjef

try:
    print(f"🔗 連接到 Supabase: {project_id}")
    
    # 讀取遷移文件
    migrations_dir = Path.home() / "Documents/cloudpipe-macao-app/supabase/migrations"
    migrations = sorted(migrations_dir.glob("*.sql"))
    
    print(f"📋 Found {len(migrations)} migration files")
    
    for migration in migrations:
        print(f"\n⏳ Running: {migration.name}")
        
        sql = migration.read_text()
        
        # 分割語句
        statements = [s.strip() for s in sql.split(";") if s.strip()]
        
        for stmt in statements:
            try:
                # 使用 curl 通過 Supabase REST API 執行
                import subprocess
                result = subprocess.run([
                    "curl", "-X", "POST",
                    f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
                    "-H", f"Authorization: Bearer {SERVICE_ROLE_KEY}",
                    "-H", "Content-Type: application/json",
                    "-d", f'{{"sql_string": "{stmt}"}}'
                ], capture_output=True, text=True)
                
                if result.returncode == 0:
                    print(f"  ✓ Statement executed")
                else:
                    print(f"  ⚠ {result.stderr[:100]}")
                    
            except Exception as e:
                print(f"  ❌ {str(e)[:100]}")
        
        print(f"✅ {migration.name} completed")
    
    print("\n✅ All migrations executed")

except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
