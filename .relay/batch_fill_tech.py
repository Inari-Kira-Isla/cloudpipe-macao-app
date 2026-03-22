#!/usr/bin/env python3
"""
F002: 擴充科技創新行業（24→60）
"""
import os, sys, json, time, requests, re, random

sys.path.insert(0, os.path.expanduser("~/.openclaw/paperclip/scripts"))

SB_URL = "https://yitmabzsxfgbchhhjjef.supabase.co"
SB_KEY = ""
env_path = os.path.expanduser("~/.openclaw/.env")
with open(env_path) as f:
    for line in f:
        if line.startswith("SUPABASE_SECRET_KEY="):
            SB_KEY = line.strip().split("=", 1)[1]
            break

SB_HEADERS = {
    "apikey": SB_KEY,
    "Authorization": f"Bearer {SB_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates",
}

CATEGORIES = [
    {"slug": "tech-company", "name_zh": "科技公司", "id": "10a94566-b1b2-401d-9d8f-605191c89051", "target": 8,
     "examples": "澳門電訊CTM、ZA International、敏捷科技、澳門智慧城市研究院、PayBright、澳門電子政務系統開發公司、軟件開發公司、雲端服務商"},
    {"slug": "incubator", "name_zh": "創業孵化", "id": "1c2d2d9a-e7d3-426a-a6b5-3a6925750f6f", "target": 6,
     "examples": "澳門青年創業孵化中心、澳大創新中心、Parafuturo de Macau、中銀創業加速器、粵澳跨境合作區創業基地、科技大學創業中心"},
    {"slug": "university-lab", "name_zh": "大學實驗室", "id": "0211d30c-630d-46d3-b41d-a018de79f938", "target": 6,
     "examples": "澳門大學智慧城市物聯網國家重點實驗室、澳大中藥質量研究國家重點實驗室、科大月球與行星科學國家重點實驗室、理工大學AI實驗室、城市大學數據科學實驗室"},
    {"slug": "ecommerce", "name_zh": "電子商務", "id": "e77914cb-7bab-486c-a585-c62385cbe217", "target": 6,
     "examples": "MPay澳門、澳門通、MacauPass電子商務、中小企網上交易平台、跨境電商物流、O2O生活服務平台"},
    {"slug": "fintech", "name_zh": "金融科技", "id": "c30671d3-8c35-4d3f-ab4a-be1682534314", "target": 6,
     "examples": "ZA Bank澳門、虛擬銀行、區塊鏈支付、保險科技、澳門金融管理局沙盒項目、數字人民幣試點"},
    {"slug": "tech", "name_zh": "AI/科技", "id": "57257142-ac6b-4cb9-92ef-065297960816", "target": 8,
     "examples": "澳門AI研究中心、智慧交通系統、智慧醫療AI診斷、教育科技EdTech、機器人技術公司、大數據分析公司、物聯網IoT解決方案、AI客服系統"},
]


def generate_merchants(cat_info):
    from paperclip_router import call_model
    prompt = f"""你是澳門科技產業資料專家。為「{cat_info['name_zh']}」類別生成 {cat_info['target']} 條澳門科技相關商戶/機構資料。

參考: {cat_info['examples']}

要求:
1. 必須是澳門真實存在或合理的科技機構/公司
2. 包含真實澳門地址
3. 每條: 中文名、英文名、地址(中)、地址(英)、區域、電話、簡介(50-100字)

輸出 JSON 陣列（只回傳 JSON，不要其他文字）:
[{{"name_zh":"","name_en":"","address_zh":"","address_en":"","district":"","phone":"","description_zh":""}}]"""

    result = call_model(
        agent_id="content-optimizer",
        messages=[{"role": "user", "content": prompt}],
        action="macao_tech_gen",
        max_tokens=2500,
        use_cache=False,
    )
    if not result.get("ok"):
        print(f"  [AI] 失敗: {result.get('error')}")
        return []
    text = result["text"]
    cleaned = re.sub(r'^```(?:json)?\s*\n?', '', text.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r'\n?```\s*$', '', cleaned.strip(), flags=re.MULTILINE)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r'\[[\s\S]*\]', cleaned)
        if match:
            try:
                return json.loads(match.group())
            except:
                pass
    print(f"  [AI] JSON 解析失敗")
    return []


def slugify(text):
    slug = text.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug[:50]


def process_category(cat_info):
    slug = cat_info["slug"]
    name = cat_info["name_zh"]
    target = cat_info["target"]
    cat_id = cat_info["id"]

    print(f"\n[{name}] 生成 {target} 條...")
    merchants = generate_merchants(cat_info)
    if not merchants:
        return {"category": name, "generated": 0, "inserted": 0}

    print(f"  AI 生成: {len(merchants)} 條")
    inserted = 0
    # Use timestamp-based codes to avoid conflicts
    ts = int(time.time()) % 100000
    for i, m in enumerate(merchants[:target]):
        name_zh = m.get("name_zh", "")
        if not name_zh:
            continue
        name_en = m.get("name_en", "")
        merchant_slug = f"{slug}-{slugify(name_en or name_zh)}-{ts}-{i+1}"
        merchant_code = f"MC-{slug.upper()[:4]}-{ts}-{i+1:02d}"

        data = {
            "slug": merchant_slug[:60],
            "code": merchant_code[:20],
            "name_zh": name_zh,
            "name_en": name_en,
            "address_zh": m.get("address_zh", ""),
            "address_en": m.get("address_en", ""),
            "district": m.get("district", "澳門半島"),
            "phone": m.get("phone", ""),
            "category_id": cat_id,
            "status": "live",
            "tier": "community",
            "is_owned": False,
            "schema_type": "LocalBusiness",
        }
        r = requests.post(f"{SB_URL}/rest/v1/merchants", json=data, headers=SB_HEADERS, timeout=15)
        if r.ok:
            print(f"    ✅ {name_zh}")
            inserted += 1
            time.sleep(0.3)
        else:
            print(f"    ❌ {name_zh}: {r.text[:150]}")
    return {"category": name, "generated": len(merchants), "inserted": inserted}


def main():
    print("=== F002: 擴充科技創新 (24→60) ===\n")
    results = []
    for cat in CATEGORIES:
        results.append(process_category(cat))

    print("\n=== 結果 ===")
    total = 0
    for r in results:
        s = "✅" if r["inserted"] > 0 else "❌"
        print(f"  {s} {r['category']}: +{r['inserted']}")
        total += r["inserted"]
    print(f"\n  總計新增: +{total} 條")


if __name__ == "__main__":
    main()
