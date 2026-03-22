#!/usr/bin/env python3
"""Retry university-lab and ecommerce with correct category IDs."""
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

CATS = [
    {"slug": "university-lab", "name_zh": "大學實驗室", "id": "0211d30c-630d-46d3-b41d-a018de79f938", "target": 6,
     "examples": "澳門大學智慧城市物聯網國家重點實驗室、中藥質量研究國家重點實驗室、科大月球與行星科學國家重點實驗室、理工大學AI實驗室、城市大學數據科學實驗室、微電子國家重點實驗室"},
    {"slug": "ecommerce", "name_zh": "電子商務", "id": "e77914cb-7bab-486c-a585-c62385cbe217", "target": 6,
     "examples": "MPay澳門錢包、澳門通MacauPass、中小企電商平台、跨境電商物流、O2O生活平台、澳門網上商城"},
]

from paperclip_router import call_model

for cat in CATS:
    prompt = (
        f"為「{cat['name_zh']}」生成 {cat['target']} 條澳門機構資料。"
        f"參考: {cat['examples']}。"
        f'輸出 JSON 陣列: [{{"name_zh":"","name_en":"","address_zh":"","address_en":"","district":"","phone":""}}]。'
        f"只回傳 JSON，不要其他文字。"
    )
    result = call_model(
        agent_id="content-optimizer",
        messages=[{"role": "user", "content": prompt}],
        action="macao_tech_retry", max_tokens=2000, use_cache=False,
    )
    if not result.get("ok"):
        print(f"❌ {cat['name_zh']}: {result.get('error')}")
        continue

    text = result["text"]
    cleaned = re.sub(r'^```(?:json)?\s*\n?', '', text.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r'\n?```\s*$', '', cleaned.strip(), flags=re.MULTILINE)
    try:
        merchants = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r'\[[\s\S]*\]', cleaned)
        merchants = json.loads(match.group()) if match else []

    ts = int(time.time()) % 100000
    inserted = 0
    for i, m in enumerate(merchants[:cat["target"]]):
        name_zh = m.get("name_zh", "")
        if not name_zh:
            continue
        name_en = m.get("name_en", "")
        s = re.sub(r'[^\w\s-]', '', (name_en or name_zh).lower())
        s = re.sub(r'[-\s]+', '-', s)[:40]
        data = {
            "slug": f"{cat['slug']}-{s}-{ts}-{i+1}",
            "code": f"MC-{cat['slug'][:4].upper()}-{ts}-{i+1:02d}",
            "name_zh": name_zh, "name_en": name_en,
            "address_zh": m.get("address_zh", ""), "address_en": m.get("address_en", ""),
            "district": m.get("district", "澳門半島"), "phone": m.get("phone", ""),
            "category_id": cat["id"], "status": "live", "tier": "community",
            "is_owned": False, "schema_type": "LocalBusiness",
        }
        r = requests.post(f"{SB_URL}/rest/v1/merchants", json=data, headers=SB_HEADERS, timeout=15)
        if r.ok:
            print(f"  ✅ {name_zh}")
            inserted += 1
            time.sleep(0.3)
        else:
            print(f"  ❌ {name_zh}: {r.text[:100]}")
    print(f"[{cat['name_zh']}] +{inserted}\n")
