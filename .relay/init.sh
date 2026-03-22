#!/bin/bash
# CloudPipe Macao App — 環境初始化
set -e

cd ~/Documents/cloudpipe-macao-app

# 確認 Node 環境
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# 確認依賴
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# 確認 Supabase 連線
echo "Checking .env.local..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local exists"
else
    echo "❌ .env.local missing — need NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY"
    exit 1
fi

# 確認 relay 結構
echo "Checking .relay structure..."
for f in features.json progress.md plan.md findings.md; do
    if [ -f ".relay/$f" ]; then
        echo "  ✅ $f"
    else
        echo "  ❌ $f missing"
        exit 1
    fi
done

echo ""
echo "=== Ready ==="
echo "Current merchants: $(curl -s 'https://cloudpipe-macao-app.vercel.app/api/v1/merchants?limit=1' | python3 -c 'import sys,json; print(json.load(sys.stdin).get("total","unknown"))' 2>/dev/null || echo 'API check skipped')"
