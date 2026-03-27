#!/usr/bin/env python3
"""
深化商戶內容：
- 第二層：知名商戶 → 個性化 FAQ + 描述
- 第三層：社區商戶 → 行業模板 FAQ + 通用描述
"""
import os, sys, json, time, requests, re, uuid
from collections import defaultdict

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
READ_H = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}

# ── 行業模板 FAQ（不涉及具體事實，通用安全）─────────────────
INDUSTRY_FAQ_TEMPLATES = {
    "餐飲": [
        ("有外賣服務嗎？", "建議致電商戶查詢外賣或外帶服務。部分餐廳支援外賣平台配送。"),
        ("接受哪些付款方式？", "澳門大部分餐廳接受現金（澳門幣/港幣）、信用卡及電子支付（MPay、澳門通等）。具體請向店家確認。"),
        ("需要預約嗎？", "熱門時段建議提前預約。可致電或透過社交媒體聯繫商戶查詢。"),
    ],
    "酒店": [
        ("入住和退房時間是什麼？", "澳門酒店一般入住時間為下午 3 時，退房時間為上午 11 時。具體時間請向酒店確認。"),
        ("有機場/口岸接送服務嗎？", "部分酒店提供免費穿梭巴士往返口岸及機場。建議預訂時向酒店查詢。"),
        ("可以寄存行李嗎？", "大部分酒店提供入住前及退房後的行李寄存服務。"),
    ],
    "購物": [
        ("營業時間是什麼？", "澳門零售商店一般營業時間為上午 10 時至晚上 10 時。節假日可能有所調整，建議出發前確認。"),
        ("可以退稅嗎？", "澳門是自由港，商品不含關稅和增值稅，購物無需辦理退稅手續。"),
        ("接受人民幣嗎？", "大部分商店接受港幣和人民幣，但找零通常以澳門幣計算。"),
    ],
    "景點": [
        ("門票多少錢？", "部分景點免費開放（如大三巴、議事亭前地），收費景點建議查閱官方網站了解最新票價。"),
        ("開放時間是什麼？", "各景點開放時間不同，一般為上午 10 時至下午 6 時。建議出發前查閱官方資訊。"),
        ("附近有停車場嗎？", "澳門市區停車位緊張，建議使用公共交通或酒店穿梭巴士前往。"),
    ],
    "博彩": [
        ("入場有年齡限制嗎？", "澳門娛樂場入場年齡限制為 21 歲或以上，需出示有效身份證明文件。"),
        ("有免費飲品嗎？", "大部分娛樂場為在場賓客提供免費飲品服務。"),
        ("着裝要求是什麼？", "一般娛樂場要求整潔着裝。貴賓廳可能有額外着裝要求，建議提前查詢。"),
    ],
    "交通": [
        ("營運時間是什麼？", "具體營運時間視乎交通工具而定。巴士一般由早上 6 時至凌晨 12 時，建議查閱交通事務局官網。"),
        ("票價多少？", "澳門巴士票價為 MOP 6（澳門通 MOP 3-4）。其他交通工具票價請參閱官方資訊。"),
        ("可以用澳門通嗎？", "大部分公共交通支援澳門通電子支付。"),
    ],
    "教育": [
        ("招生時間是什麼？", "澳門學校一般於每年 1-3 月進行招生。具體日期請向學校查詢。"),
        ("有獎學金嗎？", "部分院校設有獎學金計劃，建議直接聯繫學校了解申請條件。"),
        ("教學語言是什麼？", "澳門學校主要以中文（粵語/普通話）或葡語/英語教學。具體請向學校查詢。"),
    ],
    "健康": [
        ("需要預約嗎？", "建議提前電話預約。急診服務無需預約。"),
        ("接受醫療保險嗎？", "部分診所接受醫療保險。建議就診前向診所及保險公司確認承保範圍。"),
        ("營業時間是什麼？", "一般診所營業時間為週一至週六。具體時間請致電查詢。"),
    ],
    "default": [
        ("營業時間是什麼？", "建議致電或透過社交媒體聯繫商戶查詢最新營業時間。"),
        ("地址在哪裡？", "詳細地址請參閱本頁面上方的地址資訊。如需導航，建議使用地圖應用程式。"),
        ("如何聯繫？", "可透過本頁面上方的電話號碼聯繫商戶。"),
    ],
}

# Map category names to industry templates
CAT_TO_INDUSTRY = {}
for key in ["餐飲", "快餐", "葡國菜", "火鍋", "日本料理", "甜品", "中菜", "咖啡/茶飲",
            "街頭小食", "西餐", "烘焙", "高端餐飲"]:
    CAT_TO_INDUSTRY[key] = "餐飲"
for key in ["酒店/住宿", "度假村", "經濟住宿", "服務式公寓"]:
    CAT_TO_INDUSTRY[key] = "酒店"
for key in ["購物中心", "藥房", "免稅店", "零售/購物", "時裝", "珠寶腕錶", "名牌時裝"]:
    CAT_TO_INDUSTRY[key] = "購物"
for key in ["旅遊/觀光", "公園", "廟宇", "博物館", "世界文化遺產", "歷史建築", "文化遺址", "休閒公園"]:
    CAT_TO_INDUSTRY[key] = "景點"
for key in ["娛樂場", "貴賓廳", "非博彩娛樂", "娛樂/博彩"]:
    CAT_TO_INDUSTRY[key] = "博彩"
for key in ["渡輪", "巴士", "的士", "輕軌", "租車", "穿梭巴士", "機場", "口岸"]:
    CAT_TO_INDUSTRY[key] = "交通"
for key in ["語言學校", "職業培訓", "幼稚園", "國際學校", "大學", "中學", "小學", "大學實驗室"]:
    CAT_TO_INDUSTRY[key] = "教育"
for key in ["水療", "健身中心", "中醫", "美容/健康", "診所", "牙科", "水療桑拿", "豪華水療"]:
    CAT_TO_INDUSTRY[key] = "健康"


def get_merchants_without_faq():
    """Get all live merchants that don't have FAQ entries."""
    # Get all merchant IDs with FAQs
    r = requests.get(f"{SB_URL}/rest/v1/merchant_faqs?select=merchant_id&limit=5000", headers=READ_H, timeout=15)
    has_faq = set(f["merchant_id"] for f in r.json())

    # Get all live merchants with category info (paginated)
    merchants = []
    for offset in range(0, 3000, 1000):
        r2 = requests.get(
            f"{SB_URL}/rest/v1/merchants?select=id,slug,name_zh,name_en,category_id,tier,address_zh,district"
            f"&status=eq.live&limit=1000&offset={offset}",
            headers=READ_H, timeout=30,
        )
        batch = r2.json()
        merchants.extend(batch)
        if len(batch) < 1000:
            break

    # Get categories
    r3 = requests.get(f"{SB_URL}/rest/v1/categories?select=id,slug,name_zh&limit=200", headers=READ_H, timeout=15)
    cats = {c["id"]: c for c in r3.json()}

    without_faq = []
    for m in merchants:
        if m["id"] not in has_faq:
            cat = cats.get(m["category_id"], {})
            m["category_name"] = cat.get("name_zh", "其他")
            m["category_slug"] = cat.get("slug", "other")
            without_faq.append(m)

    return without_faq


def insert_template_faqs(merchant_id, category_name):
    """Insert industry-template FAQs for a merchant."""
    industry = CAT_TO_INDUSTRY.get(category_name, "default")
    faqs = INDUSTRY_FAQ_TEMPLATES.get(industry, INDUSTRY_FAQ_TEMPLATES["default"])

    inserted = 0
    for i, (q, a) in enumerate(faqs):
        data = {
            "merchant_id": merchant_id,
            "lang": "zh",
            "question": q,
            "answer": a + "\n\n*資料僅供參考，建議致電商戶確認最新資訊。*",
            "sort_order": i + 1,
        }
        r = requests.post(f"{SB_URL}/rest/v1/merchant_faqs", json=data, headers=SB_HEADERS, timeout=15)
        if r.ok:
            inserted += 1
        time.sleep(0.1)
    return inserted


def generate_known_merchant_faq(merchant):
    """Use AI to generate personalized FAQ for well-known merchants."""
    from paperclip_router import call_model

    prompt = (
        f"為澳門「{merchant['name_zh']}」({merchant.get('name_en','')}) 生成 5 條常見問題。"
        f"類別：{merchant['category_name']}，地址：{merchant.get('address_zh','')}。"
        f"要求：問題要實用，答案要準確但保守（不確定的用「建議致電查詢」）。"
        f'輸出 JSON: [{{"question":"","answer":""}}]。只回傳 JSON。'
    )
    result = call_model(
        agent_id="content-optimizer",
        messages=[{"role": "user", "content": prompt}],
        task_tier="haiku-cli",
        action="deepen_faq", max_tokens=1500, use_cache=False,
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


def insert_ai_faqs(merchant_id, faqs):
    inserted = 0
    for i, faq in enumerate(faqs[:5]):
        q = faq.get("question", "")
        a = faq.get("answer", "")
        if not q or not a:
            continue
        data = {
            "merchant_id": merchant_id,
            "lang": "zh",
            "question": q,
            "answer": a + "\n\n*資料僅供參考，建議致電商戶確認最新資訊。*",
            "sort_order": i + 1,
        }
        r = requests.post(f"{SB_URL}/rest/v1/merchant_faqs", json=data, headers=SB_HEADERS, timeout=15)
        if r.ok:
            inserted += 1
        time.sleep(0.1)
    return inserted


def main():
    print("=== 深化商戶內容 ===\n")

    merchants = get_merchants_without_faq()
    print(f"缺 FAQ 的商戶: {len(merchants)}")

    # Split: known (owned/premium) vs community
    known = [m for m in merchants if m.get("tier") in ("owned", "premium")]
    community = [m for m in merchants if m.get("tier") not in ("owned", "premium")]
    print(f"  知名商戶（AI 個性化）: {len(known)}")
    print(f"  社區商戶（行業模板）: {len(community)}")

    # Phase 1: Template FAQs for community merchants
    print(f"\n--- Phase 1: 社區商戶模板 FAQ ---")
    template_count = 0
    by_industry = defaultdict(int)
    for i, m in enumerate(community):
        cat_name = m.get("category_name", "其他")
        inserted = insert_template_faqs(m["id"], cat_name)
        template_count += inserted
        industry = CAT_TO_INDUSTRY.get(cat_name, "default")
        by_industry[industry] += 1
        if (i + 1) % 100 == 0:
            print(f"  進度: {i+1}/{len(community)} (+{template_count} FAQ)")

    print(f"  完成: {len(community)} 商戶, +{template_count} FAQ")
    for ind, cnt in sorted(by_industry.items(), key=lambda x: -x[1]):
        print(f"    {ind}: {cnt} 商戶")

    # Phase 2: AI-generated FAQs for known merchants
    print(f"\n--- Phase 2: 知名商戶 AI FAQ ---")
    ai_count = 0
    for i, m in enumerate(known):
        faqs = generate_known_merchant_faq(m)
        if faqs:
            inserted = insert_ai_faqs(m["id"], faqs)
            ai_count += inserted
            print(f"  ✅ {m['name_zh']}: +{inserted} FAQ")
        else:
            # Fallback to template
            inserted = insert_template_faqs(m["id"], m.get("category_name", "其他"))
            template_count += inserted
            print(f"  📋 {m['name_zh']}: +{inserted} FAQ (模板)")

    print(f"\n=== 結果 ===")
    print(f"  模板 FAQ: +{template_count}")
    print(f"  AI FAQ: +{ai_count}")
    print(f"  總計: +{template_count + ai_count} FAQ entries")

    # Final count
    r = requests.get(f"{SB_URL}/rest/v1/merchant_faqs?select=id", headers={**READ_H, "Prefer": "count=exact", "Range": "0-0"}, timeout=15)
    total_faq = int(r.headers.get("content-range", "*/0").split("/")[-1])
    print(f"  全站 FAQ 總數: {total_faq}")


if __name__ == "__main__":
    main()
