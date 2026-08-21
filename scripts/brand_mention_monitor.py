#!/usr/bin/env python3
"""
Brand Mention Monitor
Monitors off-site brand mentions on social media, news, and forums.
Stores results in Supabase for display in the CloudPipe dashboard.

Search Types:
- news: News articles and press releases
- social: Social media mentions (X, Facebook, Instagram, etc.)
- forum: Forum discussions (Reddit, discussion boards, etc.)
- general: General web search
"""
import os
import json
import re
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

# Search type configurations
SEARCH_CONFIGS = {
    "news": {
        "query_template": "{brand} 澳門 OR {brand} Macau",
        "description": "News and media"
    },
    "social": {
        "query_template": "{brand} 澳門 OR {brand} Macau",
        "description": "Social media"
    },
    "forum": {
        "query_template": "{brand} 澳門 OR {brand} Macau",
        "description": "Forums and discussions"
    },
    "general": {
        "query_template": "{brand} 澳門 OR {brand} Macau",
        "description": "General web"
    }
}

def get_brands_from_db(supabase: Client) -> list:
    """Fetch brands from brand_profiles table."""
    try:
        response = supabase.from_('brand_profiles').select('brand_slug').execute()
        if response.data:
            return [b['brand_slug'] for b in response.data]
    except Exception as e:
        print(f"Error fetching brands: {e}")
    return DEFAULT_BRANDS

def is_false_positive(brand: str, title: str, url: str) -> bool:
    """Check if result is a false positive (e.g., dictionary definitions, unrelated terms)."""
    brand_lower = brand.lower()
    title_lower = title.lower()
    url_lower = url.lower()
    
    # Skip if brand name is too short (< 4 chars) - too ambiguous
    if len(brand) < 4:
        return True
    
    # Special handling for brand-specific false positives
    if brand_lower in ["mind", "mind-cafe", "mind cafe"]:
        # Skip if title is about mental health, dictionary, mind map
        mind_patterns = [r"mental health", r"dictionary", r"mind map", r"xmind", 
                        r"meaning", r"definition", r"thesaurus", r"brain", r"psychology"]
        for p in mind_patterns:
            if re.search(p, title_lower):
                return True
    
    if brand_lower in ["inari", "稻荷"]:
        inari_patterns = [r"inari m06", r"inari m12", r"originalmind", r"inari \["]
        for p in inari_patterns:
            if re.search(p, title_lower) or re.search(p.replace("inari ", ""), url_lower):
                return True
    
    if brand_lower in ["after", "after-school", "after-school-coffee"]:
        # "after" is too common
        after_patterns = [r"after \w+", r"before and after", r"after\\s+meaning", 
                         r"after\\s+usage", r"how to use after", r"difference before after"]
        for p in after_patterns:
            if re.search(p, title_lower):
                return True
    
    if brand_lower == "cloudpipe":
        # Skip Facebook/Instagram related (pipe confusion)
        if "facebook" in url_lower or "instagram" in url_lower:
            # Only allow if CloudPipe is actually mentioned
            if "cloudpipe" not in title_lower and "cloudpipe" not in url_lower:
                return True
    
    # Exclude common false positive sources
    false_positive_domains = [
        "wikipedia.org", "dictionary.cambridge.org", "dictionary.reverso.net",
        "weblio.jp", "ejje.weblio.jp", "merriam-webster.com", "oxfordlearnersdictionaries.com",
        "translate.google.com", "context.reverso.net", "wordreference.com",
        "originalmind.co.jp", "britannica.com",
        "xmind.com", "mindplus.dfrobot.com",
        "e-grammar.info", "alc.co.jp", "eow.alc.co.jp",  # English grammar sites
        "difference.com", "winners-english.com"  # English learning
    ]
    
    for domain in false_positive_domains:
        if domain in url_lower:
            return True
    
    # Check for false positive title patterns
    false_title_patterns = [
        r"^mind$", r"^inari$", r"^after$", r"^cloud$",
        r"mind meaning", r"mind definition", r"xmind", r"mind map",
        r"after meaning", r"after usage", r"before and after"
    ]
    
    for pattern in false_title_patterns:
        if re.search(pattern, title_lower):
            return True
    
    return False


def search_brand_mentions(brand: str, query_type: str = "general") -> list:
    """Search for brand mentions using DuckDuckGo with improved queries."""
    config = SEARCH_CONFIGS.get(query_type, SEARCH_CONFIGS["general"])
    query = config["query_template"].format(brand=brand)
    
    try:
        ddgs = DDGS()
        results = list(ddgs.text(query, max_results=10))
        mentions = []
        for r in results:
            title = r.get("title", "")
            url = r.get("href", "")
            
            # Filter out false positives
            if is_false_positive(brand, title, url):
                continue
                
            mentions.append({
                "title": title,
                "url": url,
                "snippet": r.get("body", ""),
                "source": url.split("/")[2] if url and "://" in url else ""
            })
        return mentions
    except Exception as e:
        print(f"  Search error ({query_type}): {e}")
        return []

def ensure_table_exists(supabase: Client) -> bool:
    """Check if brand_mentions table exists."""
    try:
        # Try to query the table
        response = supabase.from_('brand_mentions').select('id').limit(1).execute()
        print("✓ brand_mentions table exists")
        return True
    except Exception as e:
        error_msg = str(e).lower()
        if "relation" in error_msg and "does not exist" in error_msg:
            print("⚠️  brand_mentions table not found - using JSON fallback")
        else:
            print(f"⚠️  Table check error: {e}")
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
            print(f"  ✓ Stored {len(records)} {mention_type} mentions for {brand}")
        except Exception as e:
            print(f"  ✗ Error storing mentions: {e}")
            # Fallback to JSON
            _store_json_fallback(brand, mentions, mention_type)
    else:
        _store_json_fallback(brand, mentions, mention_type)

def _store_json_fallback(brand: str, mentions: list, mention_type: str):
    """Store mentions in JSON file as fallback."""
    json_path = Path(__file__).parent / 'brand_mentions.json'
    existing = []
    if json_path.exists():
        try:
            existing = json.loads(json_path.read_text())
        except:
            existing = []
    
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
    print(f"  ✓ Saved {len(mentions)} mentions to JSON ({mention_type})")

def main():
    """Main monitoring function."""
    print(f"🔍 Brand Mention Monitor - {datetime.now().isoformat()}")
    print(f"   Monitors: news, social media, forums, general web\n")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Missing Supabase configuration")
        return
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Ensure table exists
    table_exists = ensure_table_exists(supabase)
    
    # Get brands to monitor
    brands = get_brands_from_db(supabase)
    print(f"📋 Monitoring {len(brands)} brands: {', '.join(brands[:5])}...")
    
    # Search for mentions across all types
    search_types = ["news", "social", "forum", "general"]
    total_mentions = 0
    
    for brand in brands:
        print(f"\n🔎 {brand}:")
        
        for search_type in search_types:
            mentions = search_brand_mentions(brand, search_type)
            if mentions:
                print(f"   {search_type}: {len(mentions)} mentions found")
                store_mentions(supabase, brand, mentions, search_type, table_exists)
                total_mentions += len(mentions)
    
    print(f"\n✅ Monitoring complete! Total mentions: {total_mentions}")

if __name__ == "__main__":
    main()
