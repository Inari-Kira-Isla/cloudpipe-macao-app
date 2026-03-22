#!/usr/bin/env python3
"""
大規模擴充：按澳門實際商業規模，每個子分類批量生成
目標：1142 → 3000+
"""
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
READ_HEADERS = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}

# Realistic targets per subcategory based on Macau's actual commercial landscape
# Macau: 680K residents, 30M tourists/year, ~40K registered businesses
TARGETS = {
    # 餐飲美食 — 澳門有 4000+ 餐飲商戶
    "餐飲": 150, "快餐": 60, "葡國菜": 50, "火鍋": 40, "日本料理": 40,
    "甜品": 35, "中菜": 50, "咖啡/茶飲": 40, "街頭小食": 40, "西餐": 25,
    "烘焙": 25,
    # 酒店住宿 — 澳門有 120+ 酒店
    "酒店/住宿": 80, "度假村": 15, "經濟住宿": 20, "服務式公寓": 15,
    # 景點文化
    "旅遊/觀光": 50, "公園": 25, "廟宇": 15, "博物館": 15,
    # 購物零售 — 澳門有 3000+ 零售商
    "購物中心": 30, "藥房": 40, "免稅店": 15, "零售/購物": 20, "時裝": 20,
    # 夜生活
    "酒吧": 20, "KTV": 15, "夜店": 15, "表演": 10, "酒廊": 12, "水療桑拿": 8,
    # 博彩
    "娛樂場": 25, "貴賓廳": 20, "非博彩娛樂": 25, "娛樂/博彩": 15,
    # 會展
    "會展中心": 15, "商貿展覽": 15, "節慶活動": 12, "年度盛事": 10, "體育賽事": 10,
    # 交通
    "渡輪": 12, "巴士": 10, "的士": 10, "輕軌": 8, "租車": 8, "穿梭巴士": 8, "機場": 4, "口岸": 8,
    # 食品供應鏈
    "冷鏈物流": 12, "食品貿易/進口": 12, "海鮮進口": 10, "外賣/配送": 15,
    "肉類供應": 8, "蔬果批發": 8, "食品加工": 8, "飲品": 8,
    # 教育
    "語言學校": 15, "職業培訓": 12, "幼稚園": 15, "國際學校": 8,
    "大學": 8, "中學": 10, "小學": 15, "教育/培訓": 8,
    # 金融
    "銀行": 15, "保險": 12, "支付服務": 10, "金融公司": 8, "證券": 6,
    "找換店": 10, "會計服務": 8,
    # 奢侈品
    "珠寶腕錶": 15, "名牌時裝": 15, "高端餐飲": 12, "豪華水療": 8, "豪車": 8, "藝術拍賣": 5,
    # 健康
    "水療": 15, "健身中心": 15, "中醫": 15, "美容/健康": 12, "診所": 15, "牙科": 10, "藥房": 20,
    # 專業服務
    "顧問": 15, "律師事務所": 12, "會計師事務所": 12, "IT 服務": 10,
    "翻譯": 8, "人力資源": 8, "設計公司": 8, "公證": 5, "專業服務": 8,
    # 房地產
    "商業地產": 15, "地產代理": 15, "裝修": 15, "物業管理": 12, "建材": 10,
    # 文化遺產
    "世界文化遺產": 12, "歷史建築": 20, "文化遺址": 15,
    # 媒體
    "廣告": 12, "網絡媒體": 10, "報紙": 6, "電視/電台": 6, "印刷": 6, "攝影": 8,
    # 科技
    "AI/科技": 15, "大學實驗室": 12, "科技公司": 12, "電子商務": 10,
    "金融科技": 8, "創業孵化": 8,
    # 政府
    "政府部門": 20, "公共服務": 12, "緊急服務": 10, "出入境": 8,
    # 社區
    "宗教場所": 15, "社團協會": 15, "體育場館": 10, "圖書館": 10,
    "休閒公園": 10, "街市": 10, "郵政": 5,
}

from paperclip_router import call_model


def get_all_cats():
    r = requests.get(f"{SB_URL}/rest/v1/categories?select=id,slug,name_zh&limit=200", headers=READ_HEADERS, timeout=15)
    return {c["name_zh"]: c for c in r.json()}


def get_count(cat_id):
    r = requests.get(f"{SB_URL}/rest/v1/merchants?select=id&category_id=eq.{cat_id}&status=eq.live",
                     headers={**READ_HEADERS, "Prefer": "count=exact", "Range": "0-0"}, timeout=10)
    return int(r.headers.get("content-range", "*/0").split("/")[-1])


def generate_batch(name_zh, count, batch_num):
    """Generate a batch of merchants. Each batch up to 15."""
    prompt = (
        f"為澳門「{name_zh}」類別生成 {count} 條商戶/機構資料。"
        f"要求：1)真實或合理的澳門商戶 2)真實澳門地址（含街道門牌）3)中英文名 4)電話 "
        f"5)不要和之前的重複，這是第 {batch_num} 批。"
        f'只回傳 JSON: [{{"name_zh":"","name_en":"","address_zh":"","address_en":"","district":"","phone":""}}]'
    )
    result = call_model(
        agent_id="content-optimizer",
        messages=[{"role": "user", "content": prompt}],
        action=f"mass_{name_zh}_{batch_num}", max_tokens=3000, use_cache=False,
    )
    if not result.get("ok"):
        return []
    text = result["text"]
    cleaned = re.sub(r'^```(?:json)?\s*\n?', '', text.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r'\n?```\s*$', '', cleaned.strip(), flags=re.MULTILINE)
    try:
        return json.loads(cleaned)
    except:
        match = re.search(r'\[[\s\S]*\]', cleaned)
        if match:
            try:
                return json.loads(match.group())
            except:
                pass
    return []


def insert_merchants(merchants, cat_id, slug_prefix):
    ts = int(time.time()) % 100000
    inserted = 0
    for i, m in enumerate(merchants):
        n = m.get("name_zh", "")
        if not n:
            continue
        ne = m.get("name_en", "")
        s = re.sub(r'[^\w\s-]', '', (ne or n).lower())
        s = re.sub(r'[-\s]+', '-', s)[:35]
        data = {
            "slug": f"{slug_prefix}-{s}-{ts}-{i+1}",
            "code": f"MC-{slug_prefix[:4].upper()}-{ts}-{i+1:02d}",
            "name_zh": n, "name_en": ne,
            "address_zh": m.get("address_zh", ""), "address_en": m.get("address_en", ""),
            "district": m.get("district", "澳門半島"), "phone": m.get("phone", ""),
            "category_id": cat_id, "status": "live", "tier": "community",
            "is_owned": False, "schema_type": "LocalBusiness",
        }
        r = requests.post(f"{SB_URL}/rest/v1/merchants", json=data, headers=SB_HEADERS, timeout=15)
        if r.ok:
            inserted += 1
        time.sleep(0.15)
    return inserted


def main():
    cats = get_all_cats()
    grand_total = 0
    batch_num = 0

    for name_zh, target in sorted(TARGETS.items(), key=lambda x: -x[1]):
        if name_zh not in cats:
            continue
        cat = cats[name_zh]
        current = get_count(cat["id"])
        needed = target - current
        if needed <= 0:
            continue

        print(f"\n[{name_zh}] {current}→{target} (需+{needed})")

        # Generate in batches of up to 15
        remaining = needed
        while remaining > 0:
            batch_size = min(remaining, 15)
            batch_num += 1
            merchants = generate_batch(name_zh, batch_size, batch_num)
            if not merchants:
                print(f"  ❌ batch {batch_num} failed, skip")
                break
            inserted = insert_merchants(merchants, cat["id"], cat["slug"])
            print(f"  batch {batch_num}: +{inserted}/{len(merchants)}")
            grand_total += inserted
            remaining -= inserted
            if inserted == 0:
                break  # avoid infinite loop

    print(f"\n{'='*40}")
    print(f"總計新增: +{grand_total}")

    # Final count
    r = requests.get(f"{SB_URL}/rest/v1/merchants?select=id&status=eq.live",
                     headers={**READ_HEADERS, "Prefer": "count=exact", "Range": "0-0"}, timeout=15)
    total = r.headers.get("content-range", "").split("/")[-1]
    print(f"全站商戶: {total}")


if __name__ == "__main__":
    main()
