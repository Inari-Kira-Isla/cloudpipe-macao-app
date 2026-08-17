#!/usr/bin/env python3
"""
Brand Mention Monitor
Monitors off-site brand mentions on social media, news, and forums.
Stores results in Supabase for display in the CloudPipe dashboard.
"""
import os
import json
from datetime import datetime, timedelta
from supabase import create_client, Client
from web_search import search

# Configuration
SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
SEARCH_QUERY_LIMIT = 20

# Brands to monitor (will be loaded from database if available)
DEFAULT_BRANDS = [
    "稻荷環球食品",
    "海膽速遞", 
    "CloudPipe",
    "Mind Cafe",
    "課後咖啡"
]

def get_brands_from_db(supabase: Client) -> list:
    """Fetch brands from brand_profiles table."""
    try:
        response = supabase.from_('brand_profiles').select('brand_slug').execute()
        if response.data:
            return [b['brand_slug'] for b in response.data]
    except Exception as e:
        print(f"Error fetching brands: {e}")
    return DEFAULT_BRANDS

def search_brand_mentions(brand: str, query_type: str = "news") -> list:
    """Search for brand mentions using web search."""
    queries = {
        "social": f"{brand} 澳門 OR {brand} Macau site:x.com OR site:twitter.com OR site:instagram.com",
        "news": f"{brand} 澳門 OR {brand} Macau site:news OR site:blog OR site:forum",
        "general": f"{brand} 澳門 OR {brand} Macau"
    }
    
    query = queries.get(query_type, queries["general"])
    
    try:
        results = search(query, count=10)
        mentions = []
        for r in results:
            mentions.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "snippet": r.get("description", ""),
                "source": r.get("source", "")
            })
        return mentions
    except Exception as e:
        print(f"Search error for {brand}: {e}")
        return []

def ensure_table_exists(supabase: Client):
    """Create brand_mentions table if it doesn't exist."""
    # Check if table exists
    try:
        supabase.from_('brand_mentions').select('id').limit(1).execute()
        return True
    except:
        pass
    
    # Table doesn't exist - create it via SQL
    # Note: In production, this should be a proper migration
    print("Creating brand_mentions table...")
    sql = """
    CREATE TABLE IF NOT EXISTS brand_mentions (
        id BIGSERIAL PRIMARY KEY,
        brand_slug TEXT NOT NULL,
        mention_type TEXT NOT NULL DEFAULT 'general',
        title TEXT,
        url TEXT,
        snippet TEXT,
        source TEXT,
        detected_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_brand_mentions_brand ON brand_mentions(brand_slug);
    CREATE INDEX IF NOT EXISTS idx_brand_mentions_detected ON brand_mentions(detected_at);
    """
    
    try:
        supabase.postgrest.execute(sql)
        print("Table created successfully")
    except Exception as e:
        print(f"Note: {e}")
        # Table may already exist, continue
    return True

def store_mentions(supabase: Client, brand: str, mentions: list, mention_type: str):
    """Store mentions in database."""
    if not mentions:
        return
    
    records = []
    for m in mentions:
        records.append({
            "brand_slug": brand,
            "mention_type": mention_type,
            "title": m.get("title", ""),
            "url": m.get("url", ""),
            "snippet": m.get("snippet", ""),
            "source": m.get("source", "")
        })
    
    try:
        supabase.from_('brand_mentions').insert(records).execute()
        print(f"  Stored {len(records)} {mention_type} mentions for {brand}")
    except Exception as e:
        print(f"  Error storing mentions: {e}")

def main():
    """Main monitoring function."""
    print(f"🔍 Brand Mention Monitor - {datetime.now().isoformat()}")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Missing Supabase configuration")
        return
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Ensure table exists
    ensure_table_exists(supabase)
    
    # Get brands to monitor
    brands = get_brands_from_db(supabase)
    print(f"📋 Monitoring {len(brands)} brands: {', '.join(brands[:5])}...")
    
    # Search for mentions
    for brand in brands:
        print(f"\n🔎 Searching for: {brand}")
        
        # General search
        mentions = search_brand_mentions(brand, "general")
        if mentions:
            store_mentions(supabase, brand, mentions, "general")
        
        # Social media search (reduced frequency)
        # mentions = search_brand_mentions(brand, "social")
        # if mentions:
        #     store_mentions(supabase, brand, mentions, "social")
    
    print(f"\n✅ Monitoring complete!")

if __name__ == "__main__":
    main()
