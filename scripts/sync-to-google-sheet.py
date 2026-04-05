#!/usr/bin/env python3
"""
Supabase → Google Sheet 自動同步
每次執行都將最新數據推送到 Google Sheet
"""

import os
import sys
from pathlib import Path
from datetime import datetime

def get_supabase_data():
    """從 Supabase 讀取數據"""
    env_path = Path.home() / "Documents/cloudpipe-macao-app/.env.local"
    env_vars = {}
    
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                key, val = line.split("=", 1)
                env_vars[key] = val
    
    from supabase import create_client
    
    url = env_vars.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env_vars.get("SUPABASE_SERVICE_ROLE_KEY")
    sheet_id = env_vars.get("NEXT_PUBLIC_INSIGHTS_SPREADSHEET_ID")
    
    if not all([url, key, sheet_id]):
        print("❌ 缺少 Supabase 或 Google Sheet 配置")
        sys.exit(1)
    
    supabase = create_client(url, key)
    
    print("📊 從 Supabase 讀取數據...")
    
    # 查詢訪問統計（按日期）
    result = supabase.table("user_visits").select("*").order("created_at", desc=True).limit(1000).execute()
    
    print(f"   📋 獲得 {len(result.data)} 條記錄")
    
    # 轉換為 Google Sheet 格式
    rows = [
        ["日期", "訪客類型", "Bot 名稱", "頁面", "業界", "設備", "來源", "來源域名", "訪問時間"]
    ]
    
    for record in result.data:
        created_at = record.get("created_at", "")
        date_str = created_at.split("T")[0] if created_at else ""
        
        visitor_type = "Bot" if record.get("is_bot") else "真實用戶"
        bot_name = record.get("bot_name") or "-"
        page = record.get("path", "-")
        industry = record.get("industry") or "-"
        device = record.get("device_type") or "-"
        utm_source = record.get("utm_source") or "-"
        domain = record.get("referer_domain") or "-"
        
        rows.append([
            date_str,
            visitor_type,
            bot_name,
            page,
            industry,
            device,
            utm_source,
            domain,
            created_at
        ])
    
    return rows, sheet_id

def push_to_google_sheet(rows, sheet_id):
    """推送數據到 Google Sheet"""
    print(f"\n📤 推送數據到 Google Sheet...")
    
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
    except ImportError:
        print("❌ Google API 庫未安裝")
        print("   運行: pip install google-auth-oauthlib google-api-python-client")
        return False
    
    # 使用緩存的認證
    creds_file = Path.home() / ".credentials/token.json"
    
    if not creds_file.exists():
        print("❌ Google 認證未設置")
        print("   需要運行: python3 scripts/auto-google-sheet-setup.py")
        return False
    
    creds = Credentials.from_authorized_user_file(str(creds_file))
    sheets_api = build('sheets', 'v4', credentials=creds)
    
    # 寫入新數據
    print(f"   ✍️  寫入 {len(rows)} 行新數據...")
    sheets_api.spreadsheets().values().update(
        spreadsheetId=sheet_id,
        range='A1',
        valueInputOption='RAW',
        body={'values': rows}
    ).execute()
    
    print(f"✅ 同步完成！")
    print(f"   📊 Google Sheet: https://docs.google.com/spreadsheets/d/{sheet_id}/edit")
    
    return True

def main():
    print("╔═══════════════════════════════════════════════╗")
    print("║  📊 Supabase → Google Sheet 自動同步        ║")
    print("╚═══════════════════════════════════════════════╝\n")
    
    try:
        rows, sheet_id = get_supabase_data()
        push_to_google_sheet(rows, sheet_id)
        
    except Exception as e:
        print(f"\n❌ 同步失敗: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
