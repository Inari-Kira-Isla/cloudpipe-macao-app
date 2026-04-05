#!/usr/bin/env python3
"""
一鍵創建 Insights Google Sheet + 自動配置
無需手動 API 申請，完全自動化
"""

import os
import sys
import json
from pathlib import Path
import subprocess

def install_deps():
    """自動安裝依賴"""
    try:
        from google.oauth2.credentials import Credentials
    except ImportError:
        print("📦 安裝 Google API 依賴...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-q",
                       "google-auth-oauthlib", "google-auth-httplib2",
                       "google-api-python-client"], check=True)

def create_sheet_with_oauth():
    """使用 OAuth 創建 Sheet（自動打開瀏覽器）"""
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets',
              'https://www.googleapis.com/auth/drive.file']
    
    # 內置 OAuth 配置（無需申請）
    credentials_config = {
        "installed": {
            "client_id": "406911293872-vv3h3vhglekst5qbg9g8dnjmfjkd8g7c.apps.googleusercontent.com",
            "client_secret": "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",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "redirect_uris": ["http://localhost"]
        }
    }
    
    # 保存臨時配置
    config_file = Path("/tmp/client_secret_temp.json")
    with open(config_file, 'w') as f:
        json.dump(credentials_config, f)
    
    print("🔐 打開瀏覽器進行 OAuth 認證...")
    print("   (如果沒有自動打開，請手動訪問認證連結)")
    
    flow = InstalledAppFlow.from_client_secrets_file(str(config_file), SCOPES)
    creds = flow.run_local_server(port=8080, open_browser=True)
    
    config_file.unlink()
    
    # 建立 API 客戶端
    sheets_api = build('sheets', 'v4', credentials=creds)
    drive_api = build('drive', 'v3', credentials=creds)
    
    # 創建 Spreadsheet
    print("📝 創建 Spreadsheet...")
    
    spreadsheet = {
        'properties': {'title': 'CloudPipe Insights Database'},
        'sheets': [{'properties': {'title': 'Insights'}}]
    }
    
    result = sheets_api.spreadsheets().create(body=spreadsheet).execute()
    spreadsheet_id = result['spreadsheetId']
    
    # 添加標題列
    headers = ['insight_slug', 'title_zh', 'title_en', 'industry', 'category',
               'region', 'visit_count', 'bot_visits', 'unique_sessions', 'last_updated']
    
    sheets_api.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range='Insights!A1:J1',
        valueInputOption='RAW',
        body={'values': [headers]}
    ).execute()
    
    # 設置分享（公開閱讀）
    drive_api.permissions().create(
        fileId=spreadsheet_id,
        body={'type': 'anyone', 'role': 'reader'},
        fields='id'
    ).execute()
    
    return spreadsheet_id

def update_env_and_deploy(sheet_id):
    """更新環境變量並推送到 Vercel"""
    env_file = Path.home() / "Documents/cloudpipe-macao-app/.env.local"
    sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"
    
    # 添加到 .env.local
    with open(env_file, 'a') as f:
        f.write(f"\n# Insights 資料庫 (Google Sheet)\n")
        f.write(f"NEXT_PUBLIC_INSIGHTS_GOOGLE_SHEET_URL={sheet_url}\n")
        f.write(f"NEXT_PUBLIC_INSIGHTS_SPREADSHEET_ID={sheet_id}\n")
    
    print(f"\n✅ .env.local 已更新")
    print(f"   URL: {sheet_url}")
    
    # 推送到 Git/Vercel
    os.chdir(Path.home() / "Documents/cloudpipe-macao-app")
    
    subprocess.run(["git", "add", ".env.local"], check=False)
    subprocess.run(["git", "commit", "-m", 
                   f"config: add Insights Google Sheet\n\n- Sheet ID: {sheet_id}\n- URL: {sheet_url}"],
                  check=False)
    result = subprocess.run(["git", "push"], capture_output=True, text=True)
    
    if result.returncode == 0:
        print(f"✅ 已推送到 Vercel（2-3 分鐘後部署）")
    else:
        print(f"⚠️  推送失敗: {result.stderr[:100]}")
    
    return sheet_url

def main():
    print("╔════════════════════════════════════════╗")
    print("║  🚀 CloudPipe Insights Google Sheet   ║")
    print("║     一鍵自動創建 + 配置               ║")
    print("╚════════════════════════════════════════╝\n")
    
    try:
        install_deps()
        sheet_id = create_sheet_with_oauth()
        sheet_url = update_env_and_deploy(sheet_id)
        
        print("\n" + "="*50)
        print("✅ 完成！")
        print("="*50)
        print(f"\n📊 Google Sheet:")
        print(f"   {sheet_url}")
        print(f"\n🌐 Dashboard:")
        print(f"   https://cloudpipe-macao-app.vercel.app/macao/crawler-dashboard")
        print(f"\n⏳ Vercel 部署中... (2-3 分鐘)")
        
    except Exception as e:
        print(f"\n❌ 錯誤: {e}")
        print("\n👉 使用手動方式（見上面 API 步驟）")
        sys.exit(1)

if __name__ == "__main__":
    main()
