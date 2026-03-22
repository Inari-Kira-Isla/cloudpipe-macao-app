#!/usr/bin/env python3
"""F003: 擴充博彩娛樂（35→70）"""
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

CATEGORIES = [
    {"slug": "casino", "name_zh": "娛樂場", "id": "b305082b-4165-4d92-b1af-9145b19f7021", "target": 8,
     "examples": "永利澳門、新葡京、星際酒店娛樂場、澳門英皇娛樂場、十六浦娛樂場、凱旋門娛樂場、葡京娛樂場、金沙城中心"},
    {"slug": "vip-gaming", "name_zh": "貴賓廳", "id": "67cee495-5c01-477e-9558-709f4bb192ea", "target": 8,
     "examples": "太陽城貴賓會、德晉貴賓會、金沙中國貴賓廳、永利貴賓廳、銀河貴賓廳、新濠博亞貴賓廳、美高梅貴賓廳、威尼斯人貴賓廳"},
    {"slug": "non-gaming", "name_zh": "非博彩娛樂", "id": "bc975d15-9c62-494c-98a3-fa2aebba5e7e", "target": 12,
     "examples": "新濠影滙水上樂園、TeamLab澳門、澳門塔笨豬跳、影匯之星摩天輪、澳門科學館、Planet J冒險王國、傳奇英雄科技城、華納兄弟主題樂園、獅門影業娛樂天地、零重力太空體驗"},
    {"slug": "entertainment", "name_zh": "娛樂/博彩", "id": "2e684903-f29b-4d32-b4b2-e40e17f9a8f4", "target": 8,
     "examples": "澳門賽馬會、澳門彩票有限公司、澳門博彩監察協調局、澳門博彩業職工之家、澳門負責任博彩協會、澳門博彩股份有限公司、澳門互動科技娛樂、電競場館"},
]

from paperclip_router import call_model

for cat in CATEGORIES:
    print(f"\n[{cat['name_zh']}] 生成 {cat['target']} 條...")
    prompt = (
        f"為澳門「{cat['name_zh']}」類別生成 {cat['target']} 條真實商戶/機構資料。"
        f"參考: {cat['examples']}。"
        f"要求: 真實澳門地址、中英文名、電話、50字簡介。"
        f'輸出 JSON: [{{"name_zh":"","name_en":"","address_zh":"","address_en":"","district":"","phone":"","description_zh":""}}]'
        f"只回傳 JSON。"
    )
    result = call_model(
        agent_id="content-optimizer",
        messages=[{"role": "user", "content": prompt}],
        action="macao_gaming_gen", max_tokens=2500, use_cache=False,
    )
    if not result.get("ok"):
        print(f"  ❌ AI 失敗: {result.get('error')}")
        continue

    text = result["text"]
    cleaned = re.sub(r'^```(?:json)?\s*\n?', '', text.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r'\n?```\s*$', '', cleaned.strip(), flags=re.MULTILINE)
    try:
        merchants = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r'\[[\s\S]*\]', cleaned)
        merchants = json.loads(match.group()) if match else []

    if not merchants:
        print("  ❌ JSON 解析失敗")
        continue

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
            "district": m.get("district", "路氹城"), "phone": m.get("phone", ""),
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
    print(f"  [{cat['name_zh']}] +{inserted}")

print("\n=== 完成 ===")
