#!/usr/bin/env python3
"""Create brand_mentions table in Supabase."""
import os
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not url or not key:
    print("Missing env vars")
    exit(1)

supabase = create_client(url, key)

# Create the table using postgrest
try:
    # Try inserting to trigger table creation via RPC if exists
    # Since we can't run raw SQL, we'll use the REST API directly
    import requests
    
    # Create table via SQL
    response = requests.post(
        f"{url}/rest/v1/rpc/exec_sql",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        },
        json={"query": """
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
            CREATE INDEX IF NOT EXISTS idx_brand_mentions_type ON brand_mentions(mention_type);
            CREATE INDEX IF NOT EXISTS idx_brand_mentions_detected ON brand_mentions(detected_at DESC);
        """}
    )
    print(f"Response: {response.status_code} - {response.text}")
except Exception as e:
    print(f"Note: {e}")
    print("\nManual SQL required. Run this in Supabase SQL Editor:")
    print("""
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
CREATE INDEX IF NOT EXISTS idx_brand_mentions_type ON brand_mentions(mention_type);
CREATE INDEX IF NOT EXISTS idx_brand_mentions_detected ON brand_mentions(detected_at DESC);

ALTER TABLE brand_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON brand_mentions FOR SELECT USING (true);
CREATE POLICY "Allow service role" ON brand_mentions FOR ALL USING (true);
    """)
