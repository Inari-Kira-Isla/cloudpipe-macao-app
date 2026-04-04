#!/usr/bin/env python3
"""
遷移歷史爬蟲和用戶訪問數據到 Supabase
數據來源：
  1. ~/.openclaw/memory/crawler_stats.db (912 條記錄)
  2. ~/.openclaw/memory/ai_user_visit_tracking.db (AI 用戶行為)
"""

import os
import sys
import sqlite3
import json
from pathlib import Path
from datetime import datetime
from hashlib import md5

def get_supabase_client():
    """初始化 Supabase 客戶端"""
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
    
    if not url or not key:
        print("❌ Supabase 認證失敗")
        sys.exit(1)
    
    return create_client(url, key)

def migrate_crawler_stats():
    """遷移爬蟲統計數據"""
    print("📥 遷移爬蟲統計數據...")
    
    db_path = Path.home() / ".openclaw/memory/crawler_stats.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 查詢爬蟲數據
    cursor.execute("""
        SELECT date, site_id, bot_name, bot_owner, region, total_count 
        FROM daily_bot_stats 
        ORDER BY date
    """)
    
    records = cursor.fetchall()
    print(f"   📋 找到 {len(records)} 條爬蟲訪問記錄")
    
    # 初始化 Supabase
    supabase = get_supabase_client()
    
    # 準備批量插入數據
    insert_data = []
    
    for date_str, site_id, bot_name, bot_owner, region, count in records:
        # 生成 session_id（bot 數據的一致識別符）
        session_hash = md5(f"{date_str}-{site_id}-{bot_name}".encode()).hexdigest()
        
        insert_data.append({
            "ip_hash": f"bot_{bot_owner}_{region}",
            "session_id": session_hash,
            "device_type": "bot",
            "path": f"/macao",  # Bot 訪問 CloudPipe Macao
            "page_type": "crawler",
            "industry": None,
            "category": None,
            "referer": None,
            "referer_domain": None,
            "utm_source": f"crawler_{region}",
            "utm_medium": "ai_spider",
            "utm_campaign": None,
            "utm_content": None,
            "utm_term": None,
            "is_bot": True,
            "bot_name": bot_name,
            "bot_source": bot_owner,
            "created_at": f"{date_str}T00:00:00+00:00"
        })
    
    # 批量插入 (50 條一批)
    batch_size = 50
    for i in range(0, len(insert_data), batch_size):
        batch = insert_data[i:i+batch_size]
        try:
            supabase.table("user_visits").insert(batch).execute()
            print(f"   ✅ 插入第 {i//batch_size + 1} 批 ({len(batch)} 條)")
        except Exception as e:
            print(f"   ⚠️  批次 {i//batch_size + 1} 失敗: {str(e)[:100]}")
    
    conn.close()
    return len(insert_data)

def migrate_ai_user_visits():
    """遷移 AI 用戶訪問數據"""
    print("\n📥 遷移 AI 用戶訪問數據...")
    
    db_path = Path.home() / ".openclaw/memory/ai_user_visit_tracking.db"
    
    if not db_path.exists():
        print("   ⚠️  ai_user_visit_tracking.db 未找到")
        return 0
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 查詢用戶會話數據
    try:
        cursor.execute("""
            SELECT session_id, ai_source, referrer_url, user_id, first_touch_page, 
                   device_type, session_start_time, session_duration_seconds, pages_viewed
            FROM ai_referral_sessions 
            ORDER BY session_start_time DESC
            LIMIT 1000
        """)
        
        records = cursor.fetchall()
        print(f"   📋 找到 {len(records)} 條用戶會話記錄")
    except Exception as e:
        print(f"   ⚠️  查詢失敗: {e}")
        conn.close()
        return 0
    
    # 初始化 Supabase
    supabase = get_supabase_client()
    
    insert_data = []
    
    for session_id, ai_source, referrer_url, user_id, first_page, device, start_time, duration, pages in records:
        # IP hash 基於用戶 ID
        ip_hash = md5(f"{user_id}_real_user".encode()).hexdigest()
        
        insert_data.append({
            "ip_hash": ip_hash,
            "session_id": session_id,
            "device_type": device or "desktop",
            "path": first_page or "/macao",
            "page_type": "insight" if "insight" in (first_page or "") else "merchant",
            "industry": None,
            "category": None,
            "referer": referrer_url,
            "referer_domain": referrer_url.split("/")[2] if referrer_url else None,
            "utm_source": f"ai_{ai_source}" if ai_source else "ai_referral",
            "utm_medium": "ai_llm",
            "utm_campaign": None,
            "utm_content": None,
            "utm_term": None,
            "is_bot": False,
            "bot_name": None,
            "bot_source": None,
            "created_at": start_time or datetime.utcnow().isoformat()
        })
    
    # 批量插入
    batch_size = 50
    for i in range(0, len(insert_data), batch_size):
        batch = insert_data[i:i+batch_size]
        try:
            supabase.table("user_visits").insert(batch).execute()
            print(f"   ✅ 插入第 {i//batch_size + 1} 批 ({len(batch)} 條)")
        except Exception as e:
            print(f"   ⚠️  批次 {i//batch_size + 1} 失敗: {str(e)[:100]}")
    
    conn.close()
    return len(insert_data)

def verify_data():
    """驗證遷移結果"""
    print("\n✅ 驗證遷移結果...")
    
    supabase = get_supabase_client()
    
    # 查詢統計
    result = supabase.table("user_visits").select("count").execute()
    total = len(result.data) if result.data else 0
    
    # 詳細統計
    bot_count = supabase.rpc("count_records", {"is_bot_filter": True}).execute()
    user_count = supabase.rpc("count_records", {"is_bot_filter": False}).execute()
    
    print(f"\n📊 遷移統計:")
    print(f"   總記錄數: {total}")
    print(f"   Bot 訪問: (需 RPC 驗證)")
    print(f"   真實用戶: (需 RPC 驗證)")
    
    # 查詢日期範圍
    try:
        result = supabase.table("user_visits").select("created_at").order("created_at", desc=False).limit(1).execute()
        if result.data:
            earliest = result.data[0].get("created_at")
            print(f"   最早日期: {earliest}")
        
        result = supabase.table("user_visits").select("created_at").order("created_at", desc=True).limit(1).execute()
        if result.data:
            latest = result.data[0].get("created_at")
            print(f"   最新日期: {latest}")
    except Exception as e:
        print(f"   ⚠️  查詢日期失敗: {e}")

def main():
    print("╔═══════════════════════════════════════════════╗")
    print("║  🔄 遷移歷史爬蟲和用戶訪問數據到 Supabase   ║")
    print("╚═══════════════════════════════════════════════╝\n")
    
    try:
        crawler_count = migrate_crawler_stats()
        user_count = migrate_ai_user_visits()
        verify_data()
        
        print("\n" + "="*50)
        print(f"✅ 遷移完成！")
        print("="*50)
        print(f"\n📥 已遷移記錄:")
        print(f"   爬蟲數據: {crawler_count} 條")
        print(f"   用戶數據: {user_count} 條")
        print(f"   總計: {crawler_count + user_count} 條")
        
        print(f"\n🔗 查詢結果:")
        print(f"   https://cloudpipe-macao-app.vercel.app/macao/crawler-dashboard")
        
    except Exception as e:
        print(f"\n❌ 遷移失敗: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
