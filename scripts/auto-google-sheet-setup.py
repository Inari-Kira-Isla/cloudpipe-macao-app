#!/usr/bin/env python3
"""
完整自動化：Google API 申請 + Google Sheet 創建 + 配置
使用 Playwright 瀏覽器自動化
"""

import os
import sys
import json
import time
from pathlib import Path
import subprocess

def install_playwright():
    """安裝 Playwright"""
    try:
        import playwright
    except ImportError:
        print("📦 安裝 Playwright...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "playwright"], check=True)
        subprocess.run([sys.executable, "-m", "playwright", "install"], check=True)

def google_cloud_api_setup():
    """使用 Playwright 自動化 Google Cloud API 申請"""
    from playwright.sync_api import sync_playwright
    
    print("🌐 啟動瀏覽器自動化...")
    print("   步驟: 創建 Google Cloud 專案 → 啟用 Sheets/Drive API → 創建 OAuth 認證")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # 顯示瀏覽器窗口
        page = browser.new_page()
        
        try:
            # 步驟 1: 創建 Google Cloud 專案
            print("\n⏳ 步驟 1: 創建 Google Cloud 專案...")
            page.goto("https://console.cloud.google.com/projectcreate")
            page.wait_for_load_state("networkidle")
            
            # 填入專案名稱
            page.fill('input[aria-label="Project name"]', "CloudPipe Sheets")
            time.sleep(1)
            
            # 點擊建立
            page.click('button:has-text("Create")')
            time.sleep(3)
            
            # 等待專案建立
            print("   ⏳ 等待專案創建... (1-2 分鐘)")
            page.wait_for_timeout(60000)
            
            # 步驟 2: 啟用 Sheets API
            print("✅ 步驟 2: 啟用 Google Sheets API...")
            page.goto("https://console.cloud.google.com/apis/library/sheets.googleapis.com")
            page.wait_for_load_state("networkidle")
            
            # 點擊啟用
            enable_btn = page.locator('button:has-text("Enable")').first
            if enable_btn.is_visible():
                enable_btn.click()
                page.wait_for_timeout(5000)
            
            print("✅ Sheets API 已啟用")
            
            # 步驟 3: 啟用 Drive API
            print("✅ 步驟 3: 啟用 Google Drive API...")
            page.goto("https://console.cloud.google.com/apis/library/drive.googleapis.com")
            page.wait_for_load_state("networkidle")
            
            enable_btn = page.locator('button:has-text("Enable")').first
            if enable_btn.is_visible():
                enable_btn.click()
                page.wait_for_timeout(5000)
            
            print("✅ Drive API 已啟用")
            
            # 步驟 4: 創建 OAuth 認證
            print("✅ 步驟 4: 創建 OAuth 2.0 認證...")
            page.goto("https://console.cloud.google.com/apis/credentials")
            page.wait_for_load_state("networkidle")
            
            # 點擊建立認證
            create_btn = page.locator('button:has-text("Create Credentials")').first
            if create_btn.is_visible():
                create_btn.click()
                page.wait_for_timeout(2000)
            
            # 選擇 OAuth Client ID
            oauth_btn = page.locator('button:has-text("OAuth client ID")').first
            if oauth_btn.is_visible():
                oauth_btn.click()
                page.wait_for_timeout(2000)
            
            # 選擇應用類型為桌面
            desktop_btn = page.locator('button:has-text("Desktop")').first
            if desktop_btn.is_visible():
                desktop_btn.click()
                page.wait_for_timeout(2000)
            
            # 點擊建立
            page.click('button:has-text("Create")')
            page.wait_for_timeout(3000)
            
            # 步驟 5: 下載 JSON
            print("✅ 步驟 5: 下載認證文件...")
            print("   📥 請在彈出窗口中點擊下載按鈕")
            
            # 等待用戶下載（提示）
            page.wait_for_timeout(10000)
            
            print("\n✅ API 申請完成")
            print("   請確保已下載 google-credentials.json 到 ~/Downloads/")
            
            input("\n👉 按 Enter 繼續... (確保已下載認證文件)")
            
            browser.close()
            
        except Exception as e:
            print(f"\n⚠️  自動化中止: {e}")
            print("   請手動完成 API 申請（見上方步驟）")
            browser.close()
            return False
    
    return True

def setup_credentials():
    """設置本地認證"""
    download_file = Path.home() / "Downloads/google-credentials.json"
    creds_dir = Path.home() / ".credentials"
    creds_file = creds_dir / "google-credentials.json"
    
    if not download_file.exists():
        print("❌ google-credentials.json 未找到")
        print("   位置: ~/Downloads/google-credentials.json")
        return False
    
    print("📋 移動認證文件...")
    creds_dir.mkdir(exist_ok=True)
    download_file.rename(creds_file)
    print(f"✅ 已保存到: {creds_file}")
    
    return True

def create_sheet_with_api():
    """使用 Google Sheets API 創建 Sheet"""
    from google.auth.transport.requests import Request
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    
    print("🔐 Google OAuth 認證...")
    
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets',
              'https://www.googleapis.com/auth/drive.file']
    
    creds_file = Path.home() / ".credentials/google-credentials.json"
    token_file = Path.home() / ".credentials/token.json"
    
    creds = None
    if token_file.exists():
        creds = Credentials.from_authorized_user_file(str(token_file), SCOPES)
    
    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(str(creds_file), SCOPES)
        creds = flow.run_local_server(port=0)
        
        with open(token_file, 'w') as f:
            f.write(creds.to_json())
    
    print("✅ 認證成功")
    
    # 創建 Spreadsheet
    print("📝 創建 Google Sheet...")
    
    sheets_api = build('sheets', 'v4', credentials=creds)
    drive_api = build('drive', 'v3', credentials=creds)
    
    spreadsheet = {
        'properties': {'title': 'CloudPipe Insights Database'},
        'sheets': [{'properties': {'title': 'Insights'}}]
    }
    
    result = sheets_api.spreadsheets().create(body=spreadsheet).execute()
    spreadsheet_id = result['spreadsheetId']
    
    print(f"✅ Sheet 已創建: {spreadsheet_id}")
    
    # 添加標題列
    headers = ['insight_slug', 'title_zh', 'title_en', 'industry', 'category',
               'region', 'visit_count', 'bot_visits', 'unique_sessions', 'last_updated']
    
    sheets_api.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range='Insights!A1:J1',
        valueInputOption='RAW',
        body={'values': [headers]}
    ).execute()
    
    # 設置分享
    drive_api.permissions().create(
        fileId=spreadsheet_id,
        body={'type': 'anyone', 'role': 'reader'},
        fields='id'
    ).execute()
    
    return spreadsheet_id

def update_env_and_deploy(sheet_id):
    """更新環境變量並部署"""
    env_file = Path.home() / "Documents/cloudpipe-macao-app/.env.local"
    sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"
    
    with open(env_file, 'a') as f:
        f.write(f"\n# Insights 資料庫\n")
        f.write(f"NEXT_PUBLIC_INSIGHTS_GOOGLE_SHEET_URL={sheet_url}\n")
        f.write(f"NEXT_PUBLIC_INSIGHTS_SPREADSHEET_ID={sheet_id}\n")
    
    print(f"✅ .env.local 已更新")
    
    # 推送到 Git
    os.chdir(Path.home() / "Documents/cloudpipe-macao-app")
    subprocess.run(["git", "add", ".env.local"], check=False)
    subprocess.run(["git", "commit", "-m", 
                   f"config: add Insights Google Sheet (auto-created)\n\n- Sheet ID: {sheet_id}\n- URL: {sheet_url}"],
                  check=False)
    subprocess.run(["git", "push"], check=False)
    
    return sheet_url

def main():
    print("╔═══════════════════════════════════════════════════╗")
    print("║  🤖 完整自動化：Google API 申請 + Sheet 創建    ║")
    print("║     使用 Playwright 瀏覽器自動化                 ║")
    print("╚═══════════════════════════════════════════════════╝\n")
    
    try:
        # 安裝依賴
        install_playwright()
        
        # API 申請
        if not google_cloud_api_setup():
            print("⚠️  自動化申請失敗，請手動申請（見上方步驟）")
            return
        
        # 設置本地認證
        if not setup_credentials():
            return
        
        # 創建 Sheet
        sheet_id = create_sheet_with_api()
        
        # 部署
        sheet_url = update_env_and_deploy(sheet_id)
        
        print("\n" + "="*60)
        print("✅ 完全自動化完成！")
        print("="*60)
        print(f"\n📊 Google Sheet:")
        print(f"   {sheet_url}")
        print(f"\n🌐 Crawler Dashboard:")
        print(f"   https://cloudpipe-macao-app.vercel.app/macao/crawler-dashboard")
        print(f"\n⏳ Vercel 部署中... (2-3 分鐘)")
        
    except Exception as e:
        print(f"\n❌ 錯誤: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
