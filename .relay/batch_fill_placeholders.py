#!/usr/bin/env python3
"""
F001: 批量填充佔位子分類
為每個只有 1 條記錄的子分類生成 4-5 條真實澳門商戶資料
"""
import os
import sys
import json
import time
import requests
import re
import random

sys.path.insert(0, os.path.expanduser("~/.openclaw/paperclip/scripts"))

# ── Config ────────────────────────────────────────────────────────
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

# ── 佔位子分類清單（count=1）────────────────────────────────────
PLACEHOLDERS = [
    {"slug": "bakery", "name_zh": "烘焙", "id": "5a0d4580-7da6-4e4f-9d27-0d43b035f4fa", "target": 5,
     "examples": "澳門知名餅店如安德魯、瑪嘉烈蛋撻、荷蘭園餅店、鉅記餅家、晃記餅家"},
    {"slug": "resort", "name_zh": "度假村", "id": "94df1c49-5eb6-43bf-af56-82cec5d3b6f9", "target": 5,
     "examples": "澳門銀河度假城、新濠影滙、澳門巴黎人、上葡京、永利皇宮"},
    {"slug": "budget-hotel", "name_zh": "經濟住宿", "id": "803ee94d-fb2b-4aae-9398-5f75ba4b933a", "target": 5,
     "examples": "澳門旅遊學院教學酒店、澳門新新酒店、東望洋酒店、京都酒店、假期酒店"},
    {"slug": "serviced-apartment", "name_zh": "服務式公寓", "id": "2864f3cf-1ea2-4283-afa8-8b179d5de8a5", "target": 5,
     "examples": "澳門雅辰酒店公寓、Studio City 公寓、濠璟酒店、皇都酒店、利澳酒店"},
    {"slug": "retail", "name_zh": "零售/購物", "id": "ab002945-ebd5-46a4-9be6-dc03d6f3af12", "target": 5,
     "examples": "澳門紅街市、三盞燈、議事亭前地商圈、官也街手信街、新馬路商業區"},
    {"slug": "fashion", "name_zh": "時裝", "id": "0af3ee4c-7a62-4350-9dce-3d562a2b9a51", "target": 5,
     "examples": "ZARA澳門、H&M威尼斯人、UNIQLO新八佰伴、本地設計師品牌、澳門時裝廊"},
    {"slug": "museum", "name_zh": "博物館", "id": "1ac516a4-cdbf-494e-a07a-5c2070c5558f", "target": 5,
     "examples": "澳門博物館、大賽車博物館、海事博物館、消防博物館、藝術博物館"},
    {"slug": "art-auction", "name_zh": "藝術拍賣", "id": "1e599356-35e5-4c6f-95af-347e7553c6ec", "target": 3,
     "examples": "保利澳門拍賣、中信國際拍賣澳門、澳門藝術品拍賣會"},
    {"slug": "dental", "name_zh": "牙科", "id": "317112e5-e035-4b42-b71e-68719559b9a4", "target": 5,
     "examples": "澳門仁伯爵口腔科、科大醫院牙科、維健牙科中心、澳門牙醫學會推薦診所、鏡湖牙科"},
    {"slug": "notary", "name_zh": "公證", "id": "7414a6c5-9f02-450d-b08b-5c54c77fdbe1", "target": 3,
     "examples": "私人公證員事務所、澳門法務局公證署、商業及動產登記局"},
    {"slug": "design-agency", "name_zh": "設計公司", "id": "5bd8ac3e-5119-4c2d-aec1-71900fae2ed9", "target": 5,
     "examples": "澳門本地設計工作室、品牌設計公司、室內設計事務所、平面設計studio、UI/UX設計"},
    {"slug": "border-gate", "name_zh": "口岸", "id": "09ee67ba-b836-442a-81fd-96fa7bd89f03", "target": 5,
     "examples": "關閘口岸、港珠澳大橋口岸、蓮花口岸(橫琴)、內港客運碼頭、氹仔客運碼頭"},
    {"slug": "primary-school", "name_zh": "小學", "id": "9fcb3076-5668-446f-bf58-3ed8cbeab8f8", "target": 5,
     "examples": "培正中學附屬小學、濠江中學附屬小學、聖若瑟教區學校、嘉諾撒聖心學校、坊眾學校"},
    {"slug": "post-office", "name_zh": "郵政", "id": "67d46b1b-503d-436e-b119-b4fd02ab23b7", "target": 3,
     "examples": "澳門郵政總局、氹仔郵政分局、路環郵政分局"},
    {"slug": "market", "name_zh": "街市", "id": "b08e635a-6205-4396-9549-c1fd34c0fef2", "target": 5,
     "examples": "紅街市、祐漢街市、下環街市、台山街市、氹仔街市"},
    {"slug": "beverage", "name_zh": "飲品", "id": "1c3411a1-9197-4b61-bf52-5614659f2d22", "target": 5,
     "examples": "澳門啤酒廠、本地涼茶品牌、飲品批發商、果汁供應商、茶葉進口商"},
    {"slug": "professional", "name_zh": "專業服務", "id": "9bd46fb7-fd56-4434-acd1-8a1579d3fe06", "target": 4,
     "examples": "澳門管理顧問公司、企業服務中心、商業登記代辦、知識產權事務所"},
]

# ── Macau districts for realistic addresses ──────────────────────
DISTRICTS = [
    "澳門半島", "氹仔", "路環", "路氹城",
    "大堂區", "望德堂區", "風順堂區", "花地瑪堂區", "聖安多尼堂區",
]


def generate_merchants_for_category(cat_info: dict) -> list:
    """Use AI to generate realistic Macao merchant data for a category."""
    from paperclip_router import call_model

    prompt = f"""你是澳門商戶資料專家。為「{cat_info['name_zh']}」類別生成 {cat_info['target']} 條真實的澳門商戶資料。

參考範例: {cat_info['examples']}

要求:
1. 商戶名稱必須是真實存在或合理的澳門商戶
2. 地址必須是澳門真實地址
3. 每條資料包含: 中文名、英文名、地址(中)、地址(英)、區域、電話、簡介(50-100字)
4. 不要重複已有資料

輸出 JSON 陣列:
[
  {{
    "name_zh": "中文名",
    "name_en": "English Name",
    "address_zh": "澳門XX區XX街XX號",
    "address_en": "No. XX, Rua de XX, Macau",
    "district": "澳門半島/氹仔/路環/路氹城",
    "phone": "+853 XXXX XXXX",
    "description_zh": "簡介"
  }}
]
只回傳 JSON 陣列，不要其他文字。"""

    result = call_model(
        agent_id="content-optimizer",
        messages=[{"role": "user", "content": prompt}],
        action="macao_merchant_gen",
        max_tokens=2000,
        use_cache=False,
    )

    if not result.get("ok"):
        print(f"  [AI] 生成失敗: {result.get('error')}")
        return []

    text = result["text"]
    # Strip markdown fences
    cleaned = re.sub(r'^```(?:json)?\s*\n?', '', text.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r'\n?```\s*$', '', cleaned.strip(), flags=re.MULTILINE)

    try:
        merchants = json.loads(cleaned)
        if isinstance(merchants, list):
            return merchants
    except json.JSONDecodeError:
        # Try to extract JSON array
        match = re.search(r'\[[\s\S]*\]', cleaned)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    print(f"  [AI] JSON 解析失敗")
    return []


def slugify(text: str) -> str:
    """Convert text to URL-safe slug."""
    import unicodedata
    # Simple transliteration for common chars
    slug = text.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug[:50]


def upsert_merchant(merchant_data: dict) -> bool:
    """Insert/upsert a merchant to Supabase."""
    r = requests.post(
        f"{SB_URL}/rest/v1/merchants",
        json=merchant_data,
        headers=SB_HEADERS,
        timeout=15,
    )
    if not r.ok:
        print(f"    [ERROR] {r.status_code}: {r.text[:200]}")
        return False
    return True


def process_category(cat_info: dict, dry_run: bool = False) -> dict:
    """Generate and insert merchants for one category."""
    slug = cat_info["slug"]
    name = cat_info["name_zh"]
    target = cat_info["target"]
    cat_id = cat_info["id"]

    print(f"\n[{name}] 生成 {target} 條商戶...")

    merchants = generate_merchants_for_category(cat_info)
    if not merchants:
        return {"category": name, "generated": 0, "inserted": 0, "error": "generation_failed"}

    print(f"  AI 生成: {len(merchants)} 條")

    inserted = 0
    for i, m in enumerate(merchants[:target]):
        name_zh = m.get("name_zh", "")
        name_en = m.get("name_en", "")
        if not name_zh:
            continue

        merchant_slug = f"{slug}-{slugify(name_en or name_zh)}-{i+1}"
        merchant_code = f"MC-{slug.upper()[:4]}-{i+1:03d}"

        data = {
            "slug": merchant_slug,
            "code": merchant_code,
            "name_zh": name_zh,
            "name_en": name_en,
            "address_zh": m.get("address_zh", ""),
            "address_en": m.get("address_en", ""),
            "district": m.get("district", random.choice(DISTRICTS)),
            "phone": m.get("phone", ""),
            "category_id": cat_id,
            "status": "live",
            "tier": "community",
            "is_owned": False,
            "schema_type": "LocalBusiness",
        }

        if dry_run:
            print(f"    [dry-run] {name_zh} ({merchant_slug})")
            inserted += 1
        else:
            if upsert_merchant(data):
                print(f"    ✅ {name_zh}")
                inserted += 1
                time.sleep(0.3)  # Rate limit
            else:
                print(f"    ❌ {name_zh}")

    return {"category": name, "generated": len(merchants), "inserted": inserted}


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--category", type=str, help="Only process this category slug")
    args = parser.parse_args()

    print("=== F001: 修復佔位子分類 ===")
    print(f"  模式: {'dry-run' if args.dry_run else 'LIVE'}")
    print(f"  子分類: {len(PLACEHOLDERS)}")
    total_target = sum(p["target"] for p in PLACEHOLDERS)
    print(f"  目標新增: {total_target} 條\n")

    results = []
    for cat in PLACEHOLDERS:
        if args.category and cat["slug"] != args.category:
            continue
        result = process_category(cat, dry_run=args.dry_run)
        results.append(result)

    print("\n=== 結果 ===")
    total_inserted = 0
    for r in results:
        status = "✅" if r["inserted"] > 0 else "❌"
        print(f"  {status} {r['category']}: {r['inserted']}/{r.get('generated', 0)} 條")
        total_inserted += r["inserted"]
    print(f"\n  總計新增: {total_inserted} 條")


if __name__ == "__main__":
    main()
