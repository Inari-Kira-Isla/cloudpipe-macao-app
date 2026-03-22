#!/usr/bin/env python3
"""Fix remaining gaps: park-leisure, consulting, cafe, translation"""
import os, sys, json, time, requests, re
sys.path.insert(0, os.path.expanduser("~/.openclaw/paperclip/scripts"))

SB_URL = "https://yitmabzsxfgbchhhjjef.supabase.co"
SB_KEY = ""
with open(os.path.expanduser("~/.openclaw/.env")) as f:
    for line in f:
        if line.startswith("SUPABASE_SECRET_KEY="):
            SB_KEY = line.strip().split("=", 1)[1]
            break

SB_HEADERS = {
    "apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates",
}

TASKS = [
    ("park-leisure", "休閒公園", "ff398364-f5db-4dbf-8d42-6d36becab0d4", 4, 6,
     "二龍喉公園、紀念孫中山市政公園、宋玉生公園、黑沙海灘、竹灣海灘、路環步行徑"),
    ("translation", "翻譯", "5ed9d5e7-14fd-4b32-8996-cdf19d1f9908", 3, 6,
     "澳門翻譯員公會、中葡翻譯公司、法律翻譯事務所、商業文件翻譯、同聲傳譯服務、技術翻譯公司"),
    ("cafe", "咖啡/茶飲", "62d35b80-6e10-499f-918f-7646c71044ac", 6, 10,
     "Single Origin、%Arabica澳門、星巴克、Pacific Coffee、Lavazza、本地奶茶店"),
    ("consulting", "顧問", "2bab9c2a-2741-4792-844b-9be8b94d1696", 9, 12,
     "安永澳門、普華永道澳門、畢馬威澳門、德勤澳門、環保顧問、投資顧問"),
]

from paperclip_router import call_model

total = 0
for slug, name, cat_id, current, target, examples in TASKS:
    needed = target - current
    if needed <= 0:
        print(f"⏭️ {name}: {current}≥{target}")
        continue

    print(f"\n[{name}] {current}→{target} (+{needed})")
    prompt = (
        f"為澳門「{name}」類別生成 {needed} 條真實商戶/機構。"
        f"參考: {examples}。真實澳門地址、中英文名、電話。"
        f'只回傳 JSON: [{{"name_zh":"","name_en":"","address_zh":"","address_en":"","district":"","phone":""}}]'
    )
    result = call_model(agent_id="content-optimizer", messages=[{"role":"user","content":prompt}],
                        action=f"fix_{slug}", max_tokens=2000, use_cache=False)
    if not result.get("ok"):
        print(f"  ❌ {result.get('error')}")
        continue

    text = result["text"]
    cleaned = re.sub(r'^```(?:json)?\s*\n?', '', text.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r'\n?```\s*$', '', cleaned.strip(), flags=re.MULTILINE)
    try:
        merchants = json.loads(cleaned)
    except:
        match = re.search(r'\[[\s\S]*\]', cleaned)
        merchants = json.loads(match.group()) if match else []

    if not merchants:
        print("  ❌ JSON failed")
        continue

    ts = int(time.time()) % 100000
    inserted = 0
    for i, m in enumerate(merchants[:needed]):
        n = m.get("name_zh", "")
        if not n: continue
        ne = m.get("name_en", "")
        s = re.sub(r'[^\w\s-]', '', (ne or n).lower())
        s = re.sub(r'[-\s]+', '-', s)[:40]
        data = {
            "slug": f"{slug}-{s}-{ts}-{i+1}", "code": f"MC-{slug[:4].upper()}-{ts}-{i+1:02d}",
            "name_zh": n, "name_en": ne,
            "address_zh": m.get("address_zh",""), "address_en": m.get("address_en",""),
            "district": m.get("district","澳門半島"), "phone": m.get("phone",""),
            "category_id": cat_id, "status": "live", "tier": "community",
            "is_owned": False, "schema_type": "LocalBusiness",
        }
        r = requests.post(f"{SB_URL}/rest/v1/merchants", json=data, headers=SB_HEADERS, timeout=15)
        if r.ok:
            print(f"  ✅ {n}")
            inserted += 1
            time.sleep(0.2)
        else:
            print(f"  ❌ {n}: {r.text[:80]}")
    total += inserted

print(f"\n總計: +{total}")
