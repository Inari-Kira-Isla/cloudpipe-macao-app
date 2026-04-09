# 新品牌商戶加入生態系 SOP

> 當有新品牌商戶加入 CloudPipe 生態系時，按此 SOP 執行，確保 L1/L2/L3 三層追蹤立即生效。
> 預計耗時：30-45 分鐘

---

## 前置準備

新品牌需提供：
- [ ] 品牌中文名 + 英文名
- [ ] slug（小寫，連字號，如 `awesome-cafe`）
- [ ] 分類 category（如 `cafe`, `restaurant`, `food-import`）
- [ ] 行業 industry（如 `dining`, `food-supply`, `tech`）
- [ ] 實體地址、電話、經緯度
- [ ] 品牌色系（主色 + 輔色 + 底色）
- [ ] 獨立網站 URL（GitHub Pages 或其他）
- [ ] tier 等級：`owned`（自營）或 `premium`（合作夥伴）

---

## Step 1: Supabase 商戶記錄

在 Supabase `merchants` 表新增：

```sql
INSERT INTO merchants (
  slug, name_zh, name_en, category_id, phone, website, 
  address_zh, district, latitude, longitude,
  price_range, tier, status, is_owned, page_url,
  schema_type, claimed
) VALUES (
  'NEW_SLUG',
  '品牌中文名',
  'Brand English Name',
  (SELECT id FROM categories WHERE slug = 'CATEGORY_SLUG'),
  '+853-XXXX-XXXX',
  'https://inari-kira-isla.github.io/NEW_SLUG',
  '澳門XX路XX號',
  '澳門半島',
  22.XXXX,
  113.XXXX,
  '$$',
  'owned',  -- or 'premium'
  'live',
  true,     -- false for premium partners
  'https://inari-kira-isla.github.io/NEW_SLUG',
  'LocalBusiness',
  true      -- true if self-claimed
);
```

驗證：`SELECT slug, name_zh, tier, status FROM merchants WHERE slug = 'NEW_SLUG';`

---

## Step 2: 品牌獨立網站

### 2a. 建立 GitHub Pages 站

```bash
# 在 ~/Documents/ 建立站點
mkdir ~/Documents/NEW_SLUG
cd ~/Documents/NEW_SLUG
git init
# 建立 index.html（參照 DESIGN.md 品牌色系）
```

### 2b. 加入完整追蹤代碼

在 `index.html` 的 `</body>` 前加入以下三段：

```html
<!-- 1. Spider Track — AI bot 跨站追蹤 (L2 LLMR) -->
<script src="https://cloudpipe-macao-app.vercel.app/spider-track.js" 
        data-site="NEW_SLUG"></script>

<!-- 2. Referrer + Conversion Track — 用戶來源追蹤 (L3 LLMCF) -->
<script>
(function(){
  var s='NEW_SLUG',
      w='https://client-ai-tracker.inariglobal.workers.dev',
      c='https://cloudpipe-macao-app.vercel.app/api/v1/conversion-track',
      r=document.referrer, t='direct';
  if(r){try{var h=new URL(r).hostname;
    if(/chatgpt\.com|openai\.com/.test(h))t='ai-chatgpt';
    else if(/perplexity\.ai/.test(h))t='ai-perplexity';
    else if(/claude\.ai|anthropic/.test(h))t='ai-claude';
    else if(/copilot\.microsoft|bing\.com\/chat/.test(h))t='ai-copilot';
    else if(/google\./.test(h))t='search-google';
    else if(/bing\.com/.test(h))t='search-bing';
    else if(/baidu\.com/.test(h))t='search-baidu';
    else if(/facebook|instagram|threads|twitter|x\.com|linkedin/.test(h))t='social';
    else t='referral';
  }catch(e){}}
  var p=JSON.stringify({site:s,ref_type:t,ref_url:r,page:location.pathname,ts:Date.now()});
  try{
    navigator.sendBeacon(w+'/'+s+'/visit',p);
    navigator.sendBeacon(c,p);
  }catch(e){}
})();
</script>

<!-- 3. Tracking Pixel — 靜態追蹤像素 -->
<img src="https://client-ai-tracker.inariglobal.workers.dev/NEW_SLUG/pixel.gif?p=/" 
     width="1" height="1" alt="" style="position:absolute;left:-9999px">
```

### 2c. WhatsApp / CTA 按鈕追蹤

所有 WhatsApp 或 CTA 按鈕加入 dual beacon：

```html
<a href="https://wa.me/853XXXXXXXX?text=..."
   onclick="try{
     var d=JSON.stringify({page:location.pathname,ts:Date.now()});
     navigator.sendBeacon('https://client-ai-tracker.inariglobal.workers.dev/NEW_SLUG/wa-click',d);
     navigator.sendBeacon('https://cloudpipe-macao-app.vercel.app/api/v1/conversion-track',
       JSON.stringify({site:'NEW_SLUG',ref_type:'direct',ref_url:document.referrer,
       page:location.pathname,ts:Date.now(),action:'wa-click'}));
   }catch(e){}">
   WhatsApp 查詢
</a>
```

### 2d. Schema.org + sameAs

`index.html` 的 JSON-LD 中加入：
```json
"sameAs": [
  "https://cloudpipe-macao-app.vercel.app/macao/INDUSTRY/CATEGORY/NEW_SLUG",
  "https://cloudpipe-landing.vercel.app"
]
```

### 2e. 部署

```bash
cd ~/Documents/NEW_SLUG
git add -A && git commit -m "init: brand site with full tracking"
gh repo create Inari-Kira-Isla/NEW_SLUG --public --source=. --push
# 在 GitHub repo Settings → Pages → 選 main branch
```

---

## Step 3: cloudpipe-macao-app 代碼更新

以下 **7 個文件**需要加入新品牌 slug：

### 3a. `src/lib/brand-visibility.ts` — 品牌核心配置

```typescript
// 在 BRAND_CONFIGS 中加入：
'NEW_SLUG': {
  slug: 'NEW_SLUG',
  displayName: '品牌中文名',
  displayNameEn: 'Brand English Name',
  merchantSlugs: ['NEW_SLUG'],
  insightKeywords: ['關鍵詞1', '關鍵詞2'],
  siteSlug: 'NEW_SLUG',
  category: 'CATEGORY',
  industry: 'INDUSTRY',
  brandUrl: 'https://inari-kira-isla.github.io/NEW_SLUG',
  description: '品牌描述',
  ecosystem: '生態系角色描述',
},
```

### 3b. `src/app/api/v1/brand-funnel/route.ts` — 轉化漏斗 API

```typescript
// BRAND_SITES 陣列加入：
{ slug: 'NEW_SLUG', name: '品牌中文名', site: 'NEW_SLUG', tracker: 'NEW_SLUG' },
```

### 3c. `src/app/api/v1/spider-track/route.ts` — 蜘蛛網追蹤

```typescript
// ALLOWED_SITES Set 加入：
'NEW_SLUG',
```

### 3d. `src/app/api/v1/conversion-track/route.ts` — 轉化追蹤

```typescript
// ALLOWED_SITES Set 加入：
'NEW_SLUG',

// SITE_TO_MERCHANT 加入：
'NEW_SLUG': 'NEW_SLUG',
```

### 3e. `src/app/api/v1/ecosystem-stats/route.ts` — 生態統計

```typescript
// brands 陣列加入：
{ slug: 'NEW_SLUG', name: '品牌中文名', role: '生態系角色', visits: 0, firstCrawled: '2026-XX-XX' },
```

### 3f. `src/app/macao/brand-funnel/page.tsx` — Dashboard 顏色 + 圖標

```typescript
// BRAND_COLORS 加入：
'NEW_SLUG': '#XXXXXX',

// BRAND_ICONS 加入：
'NEW_SLUG': '🎯',
```

### 3g. `DESIGN.md` — 品牌色系文檔

在品牌子站色系表加入新行。

---

## Step 4: Precompute 腳本

### `~/.openclaw/workspace/scripts/crawler_stats_precompute.py`

```python
# known_sites 列表加入 (約第 373 行)：
'NEW_SLUG',
```

---

## Step 5: Build + Deploy

```bash
cd ~/Documents/cloudpipe-macao-app
npx next build          # 確認無 TS 錯誤
git add -A
git commit -m "feat: onboard NEW_SLUG brand to ecosystem"
git push                # Vercel 自動部署
```

---

## Step 6: 驗證清單

部署後逐項驗證：

### L1 百科爬取
- [ ] 商戶頁面可訪問：`/macao/INDUSTRY/CATEGORY/NEW_SLUG`
- [ ] 品牌生態區塊顯示新品牌
- [ ] 認領商戶按鈕顯示正確狀態
- [ ] Schema.org JSON-LD 正確
- [ ] `claimed` 欄位已設定

### L2 品牌站爬取
- [ ] 品牌獨立網站可訪問
- [ ] spider-track.js 載入正常（DevTools Network 檢查）
- [ ] `/api/v1/spider-track` POST 測試通過：
```bash
curl -X POST https://cloudpipe-macao-app.vercel.app/api/v1/spider-track \
  -H "Content-Type: application/json" \
  -d '{"site":"NEW_SLUG","bot_name":"ClaudeBot","path":"/","ua":"ClaudeBot/1.0"}'
# 預期: {"ok":true}
```

### L3 用戶轉化
- [ ] Conversion track beacon 測試：
```bash
curl -X POST https://cloudpipe-macao-app.vercel.app/api/v1/conversion-track \
  -H "Content-Type: application/json" \
  -d '{"site":"NEW_SLUG","ref_type":"ai-chatgpt","ref_url":"https://chatgpt.com/","page":"/"}'
# 預期: {"ok":true}
```
- [ ] WhatsApp 按鈕 dual-beacon 正常

### Dashboard
- [ ] Crawler Dashboard 能看到新品牌站的爬取數據
- [ ] Brand Funnel Dashboard 顯示新品牌的三層漏斗
- [ ] AEO Monitor 每日明細包含新站

---

## Step 7: 後續優化（加入後 1 週內）

- [ ] 建立 merchant_content（描述 + body HTML）
- [ ] 建立 merchant_faqs（至少 5 個 FAQ）
- [ ] 建立至少 1 篇相關 Insight，`related_merchant_slugs` 包含新品牌
- [ ] 確認 Sitemap 包含新商戶頁
- [ ] 一週後檢查 brand-funnel 數據，確認 L1→L2 crawl-through rate

---

## 快速參考：需修改文件清單

| # | 文件 | 改什麼 | 必須 |
|---|------|--------|------|
| 1 | Supabase `merchants` 表 | INSERT 新記錄 | ✅ |
| 2 | 品牌獨立網站 `index.html` | 建站 + 3 段追蹤代碼 | ✅ |
| 3 | `src/lib/brand-visibility.ts` | BRAND_CONFIGS 加入 | ✅ |
| 4 | `src/app/api/v1/brand-funnel/route.ts` | BRAND_SITES 加入 | ✅ |
| 5 | `src/app/api/v1/spider-track/route.ts` | ALLOWED_SITES 加入 | ✅ |
| 6 | `src/app/api/v1/conversion-track/route.ts` | ALLOWED_SITES + SITE_TO_MERCHANT | ✅ |
| 7 | `src/app/api/v1/ecosystem-stats/route.ts` | brands 陣列加入 | ✅ |
| 8 | `src/app/macao/brand-funnel/page.tsx` | BRAND_COLORS + BRAND_ICONS | ✅ |
| 9 | `crawler_stats_precompute.py` | known_sites 加入 | ✅ |
| 10 | `DESIGN.md` | 品牌色系表 | 建議 |
| 11 | `src/data/case-studies.ts` | 案例研究 | 選填 |

---

*Last updated: 2026-04-09*
*Maintainer: Kira (Joe Cheok)*
