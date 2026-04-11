# CloudPipe 商戶分級 — 數據需求矩陣 v1.0

> 定義新商戶按 tier 等級應提供的基礎資料、CloudPipe 收集的數據、以及商戶可見的報告權限。

**Last updated:** 2026-04-09

---

## 概覽：三層商戶分級

| Tier | 名稱 | 自營度 | L1爬取 | L2爬取 | L3轉化 | 年費 | 目標市場 |
|------|------|--------|--------|--------|----------|------|---------|
| **Free** | 免費版 | 0% | ✅ | ❌ | ❌ | 免費 | 中小零售 |
| **Premium** | 進階版 | 20-30% | ✅ | ✅ | ❌ | ￥2,880/年 | 連鎖餐飲 + 品牌商戶 |
| **Owned** | 自營版 | 100% | ✅ | ✅ | ✅ | 無（內部品牌） | 稻荷集團旗下品牌 |

---

## Tier 1：Free（免費版）

### 適用對象
- 澳門本地零售 + 餐飲商戶
- 不願意自建獨立網站或提供聯絡資訊
- 優先級低、信息不完整的商戶

### 商戶需提供的數據（最少化）

**核心資料**（必須，5項）
```
□ 品牌中文名      (e.g., 「榮記粥檔」)
□ 實體地址        (e.g., 「澳門巴波沙坊XX號」)
□ 行業分類        (e.g., 「cafe」, 「restaurant」)
□ 分類 category   (e.g., 「dim-sum」, 「noodle」)
□ 營業時間        (基本時間，可選：周一-周日 HH:MM-HH:MM)
```

**可選資料**（+加值，3項）
```
□ 品牌英文名      (讓 AI 更好理解)
□ 電話號碼        (獲得 WhatsApp 追蹤能力)
□ 簡短描述        (50 字內商業描述)
```

### CloudPipe 對此 Tier 的數據收集

**L1 —— 百科爬取（有效）**
```
- 頻率：daily_crawl (LSI crawler + Perplexity bots + 旗艦bot)
- 收集字段：
  ✅ 商戶頁訪問數 (visits_l1)
  ✅ 爬蟲名稱 (bot_name: GPTBot, ClaudeBot, etc.)
  ✅ 爬蟲來源 (bot_owner: OpenAI, Anthropic, etc.)
  ✅ Schema.org 驗證 (是否有 LocalBusiness JSON-LD)
- 表: crawler_visits (site = 'cloudpipe-macao-app')
- 儀表板：不可見（僅內部檢視）
```

**L2 —— 獨立站爬取（不適用）**
```
- 原因：Free tier 不自建獨立網站
- 結果：L2 = 0
```

**L3 —— 用戶轉化（不適用）**
```
- 原因：Free tier 沒有轉化追蹤能力
- 結果：L3 = 0
```

### 商戶可見報告 × 授權

| 報告類型 | 訪問權限 | 更新頻率 | 數據範圍 |
|---------|---------|---------|---------|
| 百科頁面 | 公開可見 | 實時 | 商戶名稱 + 地址 + 分類 |
| 爬蟲洞察 | ❌ 不可見 | — | — |
| 轉化漏斗 | ❌ 不可見 | — | — |
| 認領儀表板 | ✅ 可見（鼓勵升級） | 實時 | 「認領此商戶」按鈕 |

### 簽約流程

```
用戶提供 5 項必需資料
  ↓
自動生成商戶頁：/macao/[industry]/[category]/[slug]
  ↓
Schema.org LocalBusiness 自動插入
  ↓
LSI crawler 下次 daily run 時爬取
  ↓
認領狀態：unclaimed (需升級才能 claimed)
```

---

## Tier 2：Premium（進階版）

### 適用對象
- 連鎖餐飲 / 品牌快速消費品
- 願意提供完整資訊 + 希望在 AI 搜索中被推薦
- 中等投入、要求基本轉化追蹤

### 商戶需提供的數據（中度完整化）

**核心資料**（必須，9項）
```
□ 品牌中文名 + 英文名
□ slug（小寫，連字號，e.g., 「awesome-cafe」）
□ 行業 industry（e.g., 「dining」, 「food-supply」）
□ 分類 category（e.g., 「cafe」, 「restaurant」, 「food-import」）
□ 實體地址 + 經緯度（GPS 座標便於地圖顯示）
□ 電話號碼 + WhatsApp ID（必須至少一個）
□ 簡短描述（100-150 字）
□ 網站 URL 或 WeChat 公眾號（至少一個）
□ 品牌色系（主色 + 輔色，用於儀表板）
```

**認領驗證**（需上傳，1項）
```
□ 商戶認領證明：
  - 上傳營業執照 + 身份驗證，OR
  - Email 來自公司域名 (@company.com)，OR
  - 已認領品牌的官方簽名確認
```

### CloudPipe 對此 Tier 的數據收集

**L1 —— 百科爬取（同 Free）**
```
✅ 商戶頁訪問數 (visits_l1)
✅ 爬蟲名稱 + 爬蟲來源
✅ Schema.org 驗證
```

**L2 —— 獨立站爬取（新增）**
```
- Premium tier 需建立簡易一頁式官網（GitHub Pages 模板 or 提供 HTML）
- CloudPipe 提供：spider-track.js 腳本 + 基礎 HTML 模板
- 商戶部署流程：
  1. gh repo create [org]/[slug] --public
  2. 複製模板 index.html + 插入 spider-track.js
  3. 啟用 GitHub Pages (main branch)
- 收集字段：
  ✅ 獨立站訪問數 (visits_l2)
  ✅ 爬蟲在獨立站停留時間（爬蟲行為分析）
  ✅ 爬蟲點擊轉化頁（WhatsApp / Contact）
  ✅ 爬蟲關注度排名（PageRank）
- 表: crawler_visits (site = '[slug]')
- 儀表板：商戶後台可見基礎 L2 數據
```

**L3 —— 用戶轉化（不提供）**
```
- 原因：Premium tier 只提供基礎轉化計數（無詳細來源分析）
- 收集字段（精簡）：
  ❌ AI referral 轉化比例（不會追蹤來源 AI）
  ✅ WhatsApp 點擊數（簡單計數，無詳細漏斗）
  ✅ 商戶頁認領數
- 表: analytics_events (event_type = 'conversion', conversion_type = 'whatsapp')
```

### 商戶可見報告 × 授權

| 報告類型 | 訪問權限 | 更新頻率 | 數據深度 |
|---------|---------|---------|---------|
| 百科頁面 | 公開可見 | 實時 | 完整商戶檔案 |
| L2 爬蟲洞察 | ✅ 商戶後台 | 每 6 小時 | 爬蟲名稱 + 訪問數 + 時間趨勢 |
| L3 轉化統計 | ✅ 商戶後台（簡版） | 每日 | WhatsApp 點擊數 + 周趨勢 |
| 爬蟲排名 | ✅ 商戶後台 | 每周 | 「你在 GPTBot 面前排名第 X」|
| 認領證書 | ✅ 可下載 | 一次性 | CloudPipe 認證徽章 |

### 簽約 + 上線流程

```
商戶提供 9 項核心資料 + 認領證明
  ↓
CloudPipe 驗證資訊 + 生成 slug
  ↓
建立 GitHub Pages 模板站點 (CloudPipe 提供協助)
  ↓
商戶部署 index.html + spider-track.js
  ↓
cloudpipe-macao-app 代碼更新（加入 BRAND_CONFIGS + API whitelist）
  ↓
第一次爬蟲週期後，L2 數據出現在商戶後台
  ↓
狀態：claimed + premium-verified
```

---

## Tier 3：Owned（自營版）

### 適用對象
- CloudPipe 直屬或合作的自營品牌
- 目前：稻荷環球食品、After School Coffee、Mind Cafe、海膽速遞、靈動智境
- 可升級：Premium → Owned（特殊協議）

### 商戶需提供的數據（完整化）

**核心資料**（必須，13項）
```
□ 品牌中文名 + 英文名
□ slug（小寫，連字號）
□ 行業 industry + 分類 category
□ 實體地址 + GPS 座標
□ 電話 + WhatsApp + WeChat + Email
□ 簡短描述 + 長版生態系角色描述
□ 品牌色系（主色 + 輔色 + 背景色）
□ 獨立官網 URL（自建或 GitHub Pages）
□ 品牌 Logo + 3-5 張展示圖片
□ SEO 關鍵詞（5-10 個）
□ tier = 'owned', claimed = true
```

**內容資料**（推薦，3項）
```
□ 品牌故事（200-300 字）
□ 常見問題（至少 5 個 FAQ）
□ 案例研究或成功故事（1-3 篇）
```

### CloudPipe 對此 Tier 的數據收集

**L1 —— 百科爬取（完全）**
```
✅ 商戶頁訪問數 (visits_l1)
✅ 爬蟲名稱 + 爬蟲來源
✅ Schema.org + sameAs 深度驗證
✅ 認領狀態傳播（is_claimed 信號權重 +300%）
- 表: crawler_visits (site = 'cloudpipe-macao-app')
```

**L2 —— 獨立站爬取（完全）**
```
✅ 獨立站訪問數 (visits_l2)
✅ 爬蟲停留時間 + 爬蟲路徑分析
✅ 爬蟲轉化頁點擊（WhatsApp/Contact/Button）
✅ 爬蟲評分（基於 visits_l2 / visits_l1 比例）
✅ PageRank 計算（獨立站在爬蟲網絡中的重要度）
- 表: crawler_visits (site = '[slug]')
- 儀表板：公開「爬蟲旅程可視化」
```

**L3 —— 用戶轉化（完整）**
```
✅ AI referral 來源分解（ChatGPT vs Claude vs Perplexity）
✅ 搜索引擎轉化（Google vs Bing）
✅ 社交媒體轉化（Facebook vs Instagram vs WeChat）
✅ WhatsApp 點擊 + 通話 + Email 提交
✅ 轉化漏斗：到訪 → 停留時間 → CTA 點擊 → 成交
✅ 用戶會話 ID 追蹤（去重、段時間內多次點擊同一用戶）
✅ 地理分佈（澳門 vs 港台 vs 海外）
- 表: analytics_events (merchant_slug = '[slug]')
- 儀表板：Owned 商戶獨享「品牌轉化分析」(password: cloudpipe2026)
```

### 商戶可見報告 × 授權

| 報告類型 | 訪問權限 | 更新頻率 | 數據深度 |
|---------|---------|---------|---------|
| 百科頁面 | 公開展示（突出認領+品牌故事） | 實時 | 完整 + 認證徽章 |
| L1 爬蟲洞察 | ✅ 商戶後台 + 公開儀表板 | 每 4 小時 | 爬蟲名稱 + 訪問數 + AI 權重排名 |
| L2 轉化分析 | ✅ 商戶後台 | 每 2 小時 | 爬蟲路徑 + 停留時間 + 轉化點 |
| L3 完整漏斗 | ✅ 商戶後台 | 實時 | 來源別轉化率、用戶會話、地理分佈 |
| 爬蟲排名 | ✅ 商戶後台 + 社區排行榜 | 每日 | 「你在 GPTBot 面前排名第 X」（澳門第 Y）|
| 認領證書 | ✅ 社團媒體 + 官網 | 一次性 | CloudPipe 認證徽章 + 品牌故事權利 |
| 品牌生態角色 | ✅ 公開展示 | 實時 | 「供應鏈核心」/ 「社區服務樞紐」等 |
| 自動推廣 | ✅ 內部 Insight 連結 | 每周 | CloudPipe 旗艦文章引用與反向連結 |

### 簽約 + 上線流程

```
商戶提供 13 項完整資料 + 內容資料
  ↓
CloudPipe 驗證 + 授予 tier = 'owned'
  ↓
部署完整 GitHub Pages 官網（含品牌色系 + Logo）
  ↓
cloudpipe-macao-app 代碼更新：
  1. BRAND_CONFIGS 加入品牌定義
  2. 所有 API routes 加入 whitelist
  3. DESIGN.md 加入品牌色系
  4. brand-funnel 儀表板加入品牌卡片
  ↓
precompute.py known_sites 加入
  ↓
第一次爬蟲週期後，L1+L2+L3 完整數據出現
  ↓
狀態：claimed + owned + full-tracking
  ↓
（可選）生成旗艦 Insight 文章（5層 LLM Referral）
```

---

## 對比表：三層 Tier 快速查看

### 數據提供量

| 項目 | Free | Premium | Owned |
|------|------|---------|-------|
| 必需資料數量 | 5 | 9 | 13 |
| 可選資料數量 | 3 | 1 | 3 |
| 認領驗證 | ❌ | ✅ 必須 | ✅ 自動通過 |
| 獨立網站 | ❌ | ✅ 簡易版 | ✅ 完整版 |
| 品牌圖片上傳 | ❌ | ❌ | ✅ (3-5 張) |

### 數據追蹤能力

| 層級 | Free | Premium | Owned |
|------|------|---------|-------|
| **L1** 百科爬取 | ✅ 完全 | ✅ 完全 | ✅ 加強版 |
| **L2** 獨立站爬取 | ❌ | ✅ 基礎版 | ✅ 完整版 |
| **L3** 用戶轉化 | ❌ | ✅ WhatsApp 計數 | ✅ 完整漏斗 + AI 來源分析 |
| **爬蟲行為分析** | ❌ | ❌ | ✅ |
| **用戶會話追蹤** | ❌ | ❌ | ✅ |
| **地理分佈分析** | ❌ | ❌ | ✅ |

### 商戶後台存取

| 功能 | Free | Premium | Owned |
|------|------|---------|-------|
| 百科頁面檢視 | 公開（不登入） | 公開（不登入） | 公開（不登入） |
| L2 爬蟲數據 | ❌ | ✅ 基礎儀表板 | ✅ 高級儀表板 |
| L3 轉化數據 | ❌ | ✅ 簡版（WhatsApp 計數） | ✅ 完整漏斗 |
| 爬蟲排名 | ❌ | ✅ 每周更新 | ✅ 每日更新 |
| 導出 CSV 報告 | ❌ | ❌ | ✅ |
| API 存取 | ❌ | ❌ | ✅ (帶 token) |
| 品牌故事編輯 | ❌ | ❌ | ✅ |
| Insight 連結配置 | ❌ | ❌ | ✅ |

### 簽約年費

| Tier | 年費 | 計費方式 | 附加服務 |
|------|------|--------|---------|
| Free | 免費 | 永久免費 | 無 |
| Premium | ￥2,880/年 | 按年訂閱 | 免費一頁式網站模板 + CloudPipe Slack 支援 |
| Owned | 商務協議 | 按合作條款 | 完整網站設計 + 旗艦 Insight 撰寫 + 24h 優先支援 |

---

## 實施檢查清單

### 新商戶註冊時 —— 自動驗證流程

```
選擇 Tier：Free / Premium / Owned
  ↓
表單 1/2：收集 tier-specific 必需資料
  ├─ Free: 5 項
  ├─ Premium: 9 項 + 認領證明
  └─ Owned: 13 項 + 內容資料
  ↓
表單 2/2：品牌展示資料（可跳過）
  ├─ 品牌色系選擇（Owned: 必須）
  ├─ 圖片上傳（Owned: 3-5 張）
  └─ SEO 關鍵詞（Premium+: 推薦）
  ↓
自動驗證：
  ✅ 必需字段檢查（5/9/13）
  ✅ Email 或電話有效性
  ✅ GPS 座標合理性（澳門範圍內）
  ✅ Slug 唯一性
  ↓
確認 → 生成商戶頁 + 發送歡迎 Email
```

### Tier 升級流程 —— Free → Premium → Owned

```
Free 商戶升級 → Premium：
  1. 聯絡 CloudPipe 團隊申請
  2. 提交額外 4 項資料 + 認領證明
  3. 支付 ￥2,880 年費
  4. 建立一頁式官網（CloudPipe 提供模板）
  5. 24h 內啟動 L2 追蹤
  ↓
Premium 升級 → Owned：
  1. 商務協議簽署（合作夥伴）
  2. 提交 4 項額外內容資料
  3. 完整官網設計（CloudPipe 協助）
  4. 48h 內啟動 L3 完整漏斗
```

---

## 規範備註

### 數據隱私 & 合規

- **Free/Premium**: IP 地址 SHA-256 加密 + 會話 ID 匿名化（無個人識別）
- **Owned**: 同上，但商戶可選「識別用戶」（需 GDPR/PDPA 合規）
- **保留期限**: Free/Premium 30 天；Owned 12 個月
- **GDPR/PDPA**: 所有用戶數據可在 24h 內導出或刪除

### 審核 & 違規

- **Free**: 自動通過，但不允許虛假資訊（AI 驗證）
- **Premium**: 人工審核認領證明（2 個工作天）
- **Owned**: CloudPipe 團隊親身驗證 + 簽署合作協議

---

*Version 1.0 | 2026-04-09 | Kira (Joe Cheok)*
