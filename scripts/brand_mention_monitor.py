#!/usr/bin/env python3
"""
Brand Mention Monitor
Monitors off-site brand mentions on social media, news, and forums.
Stores results in Supabase for display in the CloudPipe dashboard.
"""
import os
import json
from pathlib import Path
from datetime import datetime, timedelta
from supabase import create_client, Client
from duckduckgo_search import DDGS
from dotenv import load_dotenv

# Load environment variables from .env.local
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

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
    """Search for brand mentions using DuckDuckGo."""
    queries = {
        "social": f"{brand} 澳門 OR {brand} Macau",
        "news": f"{brand} 澳門 OR {brand} Macau",
        "general": f"{brand} 澳門 OR {brand} Macau"
    }
    
    query = queries.get(query_type, queries["general"])
    
    try:
        ddgs = DDGS()
        results = list(ddgs.text(query, max_results=10))
        mentions = []
        for r in results:
            mentions.append({
                "title": r.get("title", ""),
                "url": r.get("href", ""),
                "snippet": r.get("body", ""),
                "source": r.get("href", "").split("/")[2] if r.get("href") else ""
            })
        return mentions
    except Exception as e:
        print(f"Search error for {brand}: {e}")
        return []

def ensure_table_exists(supabase: Client):
    """Check if brand_mentions table exists."""
    # Check if table exists
    try:
        supabase.from_('brand_mentions').select('id').limit(1).execute()
        print("✓ brand_mentions table exists")
        return True
    except:
        print("⚠️  brand_mentions table not found - storing mentions in JSON file instead")
        return False

def store_mentions(supabase: Client, brand: str, mentions: list, mention_type: str, table_exists: bool):
    """Store mentions in database or JSON file."""
    if not mentions:
        return
    
    if table_exists:
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
    else:
        # Fallback: save to JSON file
        import json
        from pathlib import Path
        
        json_path = Path(__file__).parent / 'brand_mentions.json'
        existing = []
        if json_path.exists():
            existing = json.loads(json_path.read_text())
        
        for m in mentions:
            existing.append({
                "brand_slug": brand,
                "mention_type": mention_type,
                "title": m.get("title", ""),
                "url": m.get("url", ""),
                "snippet": m.get("snippet", ""),
                "source": m.get("source", ""),
                "detected_at": datetime.now().isoformat()
            })
        
        json_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2))
        print(f"  Saved {len(mentions)} mentions to JSON")

def main():
    """Main monitoring function."""
    print(f"🔍 Brand Mention Monitor - {datetime.now().isoformat()}")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Missing Supabase configuration")
        return
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Ensure table exists
    table_exists = ensure_table_exists(supabase)
    
    # Get brands to monitor
    brands = get_brands_from_db(supabase)
    print(f"📋 Monitoring {len(brands)} brands: {', '.join(brands[:5])}...")
    
    # Search for mentions
    for brand in brands:
        print(f"\n🔎 Searching for: {brand}")
        
        # General search
        mentions = search_brand_mentions(brand, "general")
        if mentions:
            store_mentions(supabase, brand, mentions, "general", table_exists)
        
        # Social media search (commented out - can be enabled later)
        # mentions = search_brand_mentions(brand, "social")
        # if mentions:
        #     store_mentions(supabase, brand, mentions, "social", table_exists)
    
    print(f"\n✅ Monitoring complete!")

if __name__ == "__main__":
    main()
