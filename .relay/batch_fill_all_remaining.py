#!/usr/bin/env python3
"""F004-F009: 一次跑完所有剩餘行業擴充"""
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


def get_cat_id(slug):
    r = requests.get(f"{SB_URL}/rest/v1/categories?select=id&slug=eq.{slug}", headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}, timeout=5)
    return r.json()[0]["id"] if r.json() else None


def get_count(cat_id):
    r = requests.get(f"{SB_URL}/rest/v1/merchants?select=id&category_id=eq.{cat_id}&status=eq.live&limit=200", headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}, timeout=5)
    return len(r.json())


# All remaining categories to fill
# Format: (feature, category_slug, name_zh, target_count, examples)
ALL_TASKS = [
    # F004: 社區生活 (32→60)
    ("F004", "religious", "宗教場所", 12, "媽閣廟、觀音堂、蓮峰廟、聖老楞佐教堂、聖若瑟修院、望德聖母堂、花地瑪聖母堂、路環聖方濟各教堂、基督教宣道堂、伊斯蘭清真寺、哪吒廟、土地廟"),
    ("F004", "association", "社團協會", 12, "澳門中華總商會、澳門工會聯合總會、澳門街坊會聯合總會、澳門歸僑總會、澳門婦女聯合總會、澳門中華教育會、澳門體育暨奧林匹克委員會"),
    ("F004", "library", "圖書館", 8, "澳門中央圖書館、何東圖書館、氹仔圖書館、紅街市圖書館、石排灣圖書館、黑沙環公園圖書館、下環圖書館、望德堂圖書館"),
    ("F004", "sports-venue", "體育場館", 6, "澳門東亞運動會體育館、塔石體育館、奧林匹克游泳館、澳門運動場、路氹國際體育綜合體、保齡球中心"),
    ("F004", "leisure-park", "休閒公園", 6, "二龍喉公園、紀念孫中山市政公園、宋玉生公園、黑沙海灘、竹灣海灘、路環步行徑"),
    # F005: 媒體傳播 (34→55)
    ("F005", "online-media", "網絡媒體", 8, "澳門日報網、正報網、力報、澳門平台、論盡媒體、澳亞衛視、TDM澳廣視、澳門商報"),
    ("F005", "photography", "攝影", 6, "澳門專業攝影師協會、婚紗攝影工作室、商業攝影公司、航拍攝影、活動攝影、肖像攝影"),
    ("F005", "advertising", "廣告", 6, "澳門廣告商會、戶外廣告公司、數碼營銷公司、品牌策劃公司、社交媒體代理、公關公司"),
    # F006: 專業服務 (39→65)
    ("F006", "translation", "翻譯", 6, "澳門翻譯員公會、中葡翻譯服務、法律翻譯、商業文件翻譯、同聲傳譯、技術翻譯"),
    ("F006", "hr", "人力資源", 6, "澳門人才發展委員會、獵頭公司、人力資源外包、培訓顧問、勞工事務局服務、薪酬管理"),
    ("F006", "it-service", "IT服務", 6, "網絡安全公司、IT外包、系統集成、雲計算服務、數據中心、網站開發"),
    ("F006", "consultant", "顧問", 6, "管理顧問、稅務顧問、環保顧問、工程顧問、投資顧問、教育顧問"),
    # F007: 會展活動 (37→60)
    ("F007", "convention-center", "會展中心", 6, "澳門威尼斯人會議展覽中心、銀河國際會議中心、金沙會議中心、百老匯會議廳、永利會議中心、新濠天地會議中心"),
    ("F007", "trade-show", "商貿展覽", 6, "澳門國際貿易投資展覽會(MIF)、澳門美食節、澳門藝術節、國際環保展、亞洲娛樂展、澳門電子展"),
    ("F007", "sports-event", "體育賽事", 6, "澳門格蘭披治大賽車、世界女排大獎賽、國際馬拉松、龍舟賽、高爾夫球公開賽、武術錦標賽"),
    # F008: 酒店住宿均衡化 — F001 已處理基礎，再加一些
    ("F008", "resort", "度假村", 4, "路氹金光大道度假城、澳門君悅酒店、康萊德酒店、瑞吉酒店"),
    ("F008", "budget-hotel", "經濟住宿", 4, "澳門青年旅舍、假日酒店、東望洋賓館、利澳酒店"),
    ("F008", "serviced-apartment", "服務式公寓", 4, "澳門文華東方公寓、澳門悅榕莊、濠璟酒店、路氹服務式公寓"),
    # F009: 餐飲美食薄弱子分類
    ("F009", "bakery", "烘焙", 6, "安德魯蛋撻、瑪嘉烈蛋撻、義順牛奶公司、檸檬車露、奶茶世家、葡撻工房"),
    ("F009", "western", "西餐", 6, "IFT教育餐廳、安東尼奧餐廳、御花園葡國餐廳、法蘭度餐廳、小飛象葡國餐廳、The Manor"),
    ("F009", "street-food", "街頭小食", 8, "大利來記豬扒包、恆友魚蛋、添發碗仔翅、沙利文餐廳、南屏雅敘、勝利茶餐室、榮記牛雜、成記粥品"),
    ("F009", "cafe-tea", "咖啡/茶飲", 6, "Single Origin、%Arabica、星巴克澳門、Pacific Coffee、Lavazza、澳門咖啡"),
]


from paperclip_router import call_model

results = {}
total_inserted = 0

for feature, slug, name_zh, target, examples in ALL_TASKS:
    cat_id = get_cat_id(slug)
    if not cat_id:
        print(f"❌ {slug} category not found, skipping")
        continue

    current = get_count(cat_id)
    needed = max(0, target - current)
    if needed == 0:
        print(f"⏭️  [{feature}] {name_zh}: already {current}≥{target}, skip")
        continue

    # Cap at actual need
    gen_count = min(needed, target)

    print(f"\n[{feature}] {name_zh}: {current}→{target} (生成 {gen_count} 條)")

    prompt = (
        f"為澳門「{name_zh}」類別生成 {gen_count} 條真實商戶/機構資料。"
        f"參考: {examples}。"
        f"要求: 真實澳門地址、中英文名、電話。"
        f'輸出 JSON: [{{"name_zh":"","name_en":"","address_zh":"","address_en":"","district":"","phone":""}}]'
        f"只回傳 JSON。"
    )
    result = call_model(
        agent_id="content-optimizer",
        messages=[{"role": "user", "content": prompt}],
        action=f"macao_{slug}_gen", max_tokens=2500, use_cache=False,
    )
    if not result.get("ok"):
        print(f"  ❌ AI: {result.get('error')}")
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
        print(f"  ❌ JSON parse failed")
        continue

    ts = int(time.time()) % 100000
    inserted = 0
    for i, m in enumerate(merchants[:gen_count]):
        name = m.get("name_zh", "")
        if not name:
            continue
        name_en = m.get("name_en", "")
        s = re.sub(r'[^\w\s-]', '', (name_en or name).lower())
        s = re.sub(r'[-\s]+', '-', s)[:40]
        data = {
            "slug": f"{slug}-{s}-{ts}-{i+1}",
            "code": f"MC-{slug[:4].upper()}-{ts}-{i+1:02d}",
            "name_zh": name, "name_en": name_en,
            "address_zh": m.get("address_zh", ""), "address_en": m.get("address_en", ""),
            "district": m.get("district", "澳門半島"), "phone": m.get("phone", ""),
            "category_id": cat_id, "status": "live", "tier": "community",
            "is_owned": False, "schema_type": "LocalBusiness",
        }
        r = requests.post(f"{SB_URL}/rest/v1/merchants", json=data, headers=SB_HEADERS, timeout=15)
        if r.ok:
            inserted += 1
            time.sleep(0.2)
        else:
            print(f"  ❌ {name}: {r.text[:80]}")

    print(f"  ✅ +{inserted}")
    results.setdefault(feature, 0)
    results[feature] += inserted
    total_inserted += inserted

print(f"\n{'='*50}")
print(f"=== 總結 ===")
for f, count in sorted(results.items()):
    print(f"  {f}: +{count}")
print(f"\n  總計新增: +{total_inserted}")
