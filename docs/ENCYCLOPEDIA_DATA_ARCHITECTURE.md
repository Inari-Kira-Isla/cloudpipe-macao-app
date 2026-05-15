# Encyclopedia Data Architecture Map

更新日期：2026-05-04

## 目標

完整整理百科網站所有資料位置、資料流與架構優化方向。原則是先盤點、再接線、後優化；所有舊有重要資料庫保留原狀，不做破壞式搬移、不清空、不覆寫。

## 絕對保護邊界

- 不直接改 Supabase production tables。
- 不改寫 `.openclaw/encyclopedia/db/*.db` 任何現有 SQLite 資料。
- 不刪除 `Documents/*-encyclopedia` 內已產出的文章 JSON/MD/HTML。
- 不用 `~/Documents/` 當新 cache；新 cache 與中間產物放 `~/.openclaw/api-cache/`。
- Supabase 批量操作前必須先做 `/db-backup`、`ps aux | grep <script>`、`ls ~/Library/LaunchAgents/ | grep <keyword>`。
- 非 ASCII slug PATCH 前必須 `urllib.parse.quote(slug, safe='')`。

## 主要線上網站

主 repo：

- `/Users/ki/cloudpipe-macao-app-src`

線上：

- `https://cloudpipe-macao-app.vercel.app`

技術：

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Vercel deployment

核心路由：

- `/macao`
- `/macao/[industry]`
- `/macao/[industry]/[category]`
- `/macao/[industry]/[category]/[slug]`
- `/macao/insights`
- `/macao/insights/[slug]`
- `/macao/faqs`
- `/macao/crawler-dashboard`
- `/api/v1/merchants`
- `/api/v1/crawler-stats`
- `/macao/llms-txt`

## Repo 內資料與程式位置

| 類型 | 位置 | 角色 |
|---|---|---|
| 路由 | `src/app/macao/` | 澳門百科前台頁面 |
| API | `src/app/api/` | public API、tracking、brand ops、inari/property side modules |
| Supabase client | `src/lib/supabase.ts` | anon client 與 server-side service client |
| 型別 | `src/lib/types.ts` | Merchant / Insight / FAQ / Source interface |
| 行業分類 | `src/lib/industries.ts` | 20 industries 與 category mapping |
| 行業內容 | `src/lib/industry-content.ts`, `src/lib/industry-content.json` | 行業頁 AEO/SEO 文案 |
| Pillar 內容 | `src/lib/pillar-content.ts` | 行業 pillar overview 與 cross-cluster |
| Bot tracking | `src/middleware.ts`, `src/lib/track-bot.ts` | AI crawler / AI referrer tracking |
| 靜態 sitemap | `public/sitemap.xml`, `public/sitemap-merchants.xml` | 搜尋/AI discovery |
| llms | `public/llms.txt`, `src/app/macao/llms-txt/route.ts` | AI discovery entry |
| migration | `supabase/migrations/` | 已有 DB 結構變更記錄，不能隨便重跑 |
| 本地 DB placeholder | `macao_content.db` | 目前 0B，不是有效資料來源 |
| FAQ markdown | `content/faqs/` | 少量 Inari/sea-urchin FAQ 靜態內容 |

## Supabase 主要資料表群

### 百科核心內容

| 表 | 用途 |
|---|---|
| `merchants` | 商戶主表，頁面與 API 核心來源 |
| `categories` | 分類表，與 `merchants.category_id` 關聯 |
| `merchant_content` | 商戶多語內容、title、description、body、OG meta |
| `merchant_faqs` | 商戶 FAQ，商戶頁與 FAQ API 使用 |
| `merchant_sources` | 商戶來源資料，型別已在 `src/lib/types.ts` 定義 |
| `insights` | 深度文章，多語 `zh/en/pt`，含 sections/faqs/authority_sources |

### AEO / crawler / conversion

| 表 | 用途 |
|---|---|
| `crawler_visits` | AI crawler 訪問紀錄，middleware 與 API tracking 寫入 |
| `crawler_daily_stats` | crawler 每日聚合 |
| `crawler_stats_cache` | crawler dashboard/report cache |
| `ai_referrals` | 來自 ChatGPT/Perplexity/Claude/Gemini 等 AI 平台的人類 referral |
| `ai_search_results` | AI 搜尋 baseline / brand citation 測試 |
| `ai_citations` | AI citation 追蹤 |
| `ai_citation_gaps` | citation gap 分析 |
| `analytics_events` | click/conversion/FAQ arrival 等事件 |
| `api_cache` | API 預計算快取 |

### Brand / commercial / side modules

| 表 | 用途 |
|---|---|
| `commerce_brands` | 商業品牌 |
| `commerce_products` | 商品 |
| `v_commerce_mc_readiness` | merchant center readiness view |
| `brand_ops_knowledge` | brand ops 知識 |
| `brand_ops_posts_cache` | 社交內容 cache |
| `brand_ops_content_plan` | 內容計劃 |
| `brand_ops_assets` | 上載素材 |
| `brand_aeo_actions` | 品牌 AEO action |
| `brand_pending_tasks` | 品牌 pending tasks |
| `faq_market_questions` | market FAQ 題庫 |
| `inari_catalog` | 稻荷商品 catalog |
| `b2b_customers` | B2B customers |
| `inari_orders` | 稻荷訂單 |

### Property side module

| 表 / bucket | 用途 |
|---|---|
| `property_clients` | 客戶 |
| `property_site_visits` | 睇樓訪問 |
| `property_visit_photos` | 睇樓照片 metadata |
| `property-photos` | Supabase storage bucket |

## 本地百科資料庫與文章庫

### OpenClaw canonical working area

根目錄：

- `/Users/ki/.openclaw/encyclopedia`

主要 SQLite：

| DB | 大小 | 表 | 狀態 |
|---|---:|---|---|
| `db/japan.db` | 67M | `articles`, `authority_sources`, `spots`, `learnings`, `generation_log`, `generation_funnel`, `quality_feedback`, `api_cost_log`, `source_cross_validation` | 保留，重要 |
| `db/hongkong.db` | 21M | `articles`, `learnings`, `generation_log`, `generation_funnel`, `quality_feedback` | 保留，重要 |
| `db/taiwan.db` | 20M | `articles`, `learnings`, `generation_log`, `generation_funnel`, `quality_feedback` | 保留，重要 |
| `db/macau.db` | 20M | `articles`, `learnings`, `generation_log`, `generation_funnel`, `quality_feedback` | 保留，重要 |
| `db/deepener_sync.db` | 4.3M | `sections_cache`, `faq_cache`, `enrichment_log`, `density_history` | 保留，deepener cache |
| `ai_tracker_main.db` | 3.7M | `ai_visits`, `data_verification`, `health_checks` | 保留，AI tracking |
| `ai_tracker_backup.db` | 3.7M | backup | 保留 |
| `db/brand_citation_test.db` | 104K | citation test | 保留 |
| `gsc_analysis.db` | 176K | GSC analysis | 保留 |

0B placeholder，不應視為資料來源：

- `.openclaw/encyclopedia/db/encyclopedia.db`
- `.openclaw/encyclopedia/db/insights.db`
- `.openclaw/encyclopedia/db/merchants.db`
- `.openclaw/encyclopedia/encyclopedia.db`
- `.openclaw/encyclopedia/hongkong.db`
- `.openclaw/encyclopedia/japan.db`
- `.openclaw/encyclopedia/taiwan.db`
- `cloudpipe-macao-app-src/macao_content.db`

### Region article folders

| 位置 | JSON | MD | HTML | 用途 |
|---|---:|---:|---:|---|
| `/Users/ki/Documents/japan-encyclopedia/articles` | 2996 | 2996 | 2988 | 日本百科文章輸出 |
| `/Users/ki/Documents/hongkong-encyclopedia/articles` | 1409 | 1409 | 1499 | 香港百科文章輸出 |
| `/Users/ki/Documents/taiwan-encyclopedia/articles` | 1244 | 1244 | 1376 | 台灣百科文章輸出 |
| `/Users/ki/Documents/macau-encyclopedia/articles` | 1516 | 1516 | 1632 | 澳門百科文章輸出 |
| `/Users/ki/Documents/world-encyclopedia/articles` | 0 | 0 | 71 | 世界百科文章輸出 |

注意：這些是既有輸出位置，先保留。新 cache 不應再放 Documents；如要搬遷，先做 manifest + checksum + dry-run，不直接移動。

## 備份與舊 repo

| 位置 | 大小 | 角色 |
|---|---:|---|
| `/Users/ki/cloudpipe-backup` | 1.8G | 重要備份，含 `cloudpipe.db`, `macao_content.db` 等 |
| `/Users/ki/cloudpipe-dev` | 1.1G | 舊 dev DB / WAL / SHM |
| `/Users/ki/cloudpipe-macao-app` | 未盤點為主線 | 舊或部署鏡像 |
| `/Users/ki/cloudpipe-macao-app-work` | 未盤點為主線 | work copy |
| `/Users/ki/Documents/cloudpipe-macao-app` | 未盤點為主線 | Documents 內舊 copy，不應做 cache |

## 現有資料流

### 線上頁面讀取

1. `src/app/macao/page.tsx`
   - 讀 `categories`, `merchants`, `merchant_content`, `insights`, `crawler_visits`, `crawler_stats_cache`
2. `src/app/macao/[industry]/page.tsx`
   - 讀 `categories`, `merchants`, `insights`
3. `src/app/macao/[industry]/[category]/page.tsx`
   - 讀 `categories`, `merchants`, `insights`
4. `src/app/macao/[industry]/[category]/[slug]/page.tsx`
   - 讀 `merchants`, `merchant_content`, `merchant_faqs`, `insights`
5. `src/app/macao/insights/[slug]/page.tsx`
   - 讀 `insights`, `merchants`, `categories`

### Tracking 寫入

1. `src/middleware.ts`
   - bot visit 寫 `crawler_visits`
   - AI referral 寫 `ai_referrals`
   - FAQ arrival 寫 `analytics_events`
2. `src/app/api/v1/spider-track/route.ts`
   - 寫 `crawler_visits`
3. `src/app/api/v1/track-click/route.ts`
   - 寫 `analytics_events`
4. `src/app/api/v1/track-arrival/route.ts`
   - 更新 `merchant_page_mapping`
   - 寫 `merchant_arrival_log`
5. `src/app/api/v1/track-conversion/route.ts`
   - 更新 `merchant_page_mapping`
   - 寫 `conversion_log`

### Offline generation / maintenance

主要腳本集中在：

- `/Users/ki/.openclaw/workspace/scripts`

重要群組：

- `macao_*`, `macau_*`：澳門內容、商戶、Google verification、review、insight。
- `merchant_*`：商戶 enrichment、FAQ、entity bridge、facts injection。
- `insight_*` / `flagship_insight_*`：insight 生成、品質、翻譯、連結。
- `faq_*` / `generate_*faqs.py`：FAQ 生成與 backfill。
- `crawler_*` / `ai_crawler_*`：crawler stats、monitor、precompute。
- `ai_citation_*` / `brand_ai_citation_test.py`：AI citation monitoring。
- `aeo_*` / `brand_aeo_*`：AEO audit、fix、action queue。

## 架構問題

1. 資料來源分散：Supabase、`.openclaw/encyclopedia/db/*.db`、`Documents/*-encyclopedia/articles`、repo 靜態內容、api-cache 同時存在。
2. 主 repo 的 `macao_content.db` 是 0B，容易被誤認為有效 DB。
3. `cloudpipe-macao-app-src`, `cloudpipe-macao-app-work`, `cloudpipe-macao-app`, `Documents/cloudpipe-macao-app` 多份 copy，主線要明確標記。
4. 文章輸出仍在 Documents，與「Documents 不當 cache」規則衝突；但既有資料不能直接搬。
5. 線上讀 Supabase，離線百科 DB 主要支援生成與 export；兩者之間缺一份正式 manifest。
6. tracking 寫入分散在 middleware、API routes、public JS，需統一事件 schema。
7. Supabase migration 很多，部分是 `.bak` 或 side module，不應在無審計下重跑。

## 優化方案

### Phase 0：只讀盤點與 manifest

產出一份 machine-readable manifest：

- `~/.openclaw/api-cache/encyclopedia-data-manifest.json`

內容：

- repo 主線路徑
- Supabase 表名與用途
- SQLite DB 路徑、大小、表、最後更新時間
- article folder 路徑、檔案數、hash sample
- scripts 與資料表引用 mapping
- LaunchAgent / cron / plist 引用 mapping

這一步不改 DB，只讀檔案 metadata。

### Phase 1：建立 read-only data registry

新增一個只讀 registry module：

- repo 內：`src/lib/data-registry.ts`
- 離線：`~/.openclaw/workspace/scripts/encyclopedia_data_registry.py`

用途：

- 給人和腳本查「哪個資料應該從哪裡讀」
- 防止腳本隨手掃 Documents 或誤用 0B DB
- 將 `macao_content.db` 標記為 deprecated placeholder

### Phase 2：統一 cache 與 artifact 位置

保留既有 Documents 文章輸出，不搬動。

新產物改為：

- `~/.openclaw/api-cache/encyclopedia/articles/{region}/`
- `~/.openclaw/api-cache/encyclopedia/exports/{region}/`
- `~/.openclaw/api-cache/encyclopedia/reports/`

如果未來要從 Documents 遷移，流程必須是：

1. `rsync --dry-run`
2. 產 manifest checksum
3. 比對檔案數與 sample hash
4. 只新增，不刪原本
5. 觀察 7 天後再標記舊路徑為 archive

### Phase 3：Supabase schema documentation

建立 schema 文檔，不執行 migration：

- `docs/SUPABASE_TABLE_OWNERSHIP.md`

建議分 ownership：

- `content_core`: `merchants`, `categories`, `merchant_content`, `merchant_faqs`, `insights`
- `aeo_tracking`: `crawler_visits`, `crawler_daily_stats`, `crawler_stats_cache`, `ai_referrals`, `ai_search_results`, `ai_citations`
- `conversion`: `analytics_events`, `merchant_page_mapping`, `merchant_arrival_log`, `conversion_log`
- `brand_ops`: `brand_ops_*`, `brand_aeo_actions`, `brand_pending_tasks`
- `commerce`: `commerce_*`, `inari_*`, `b2b_customers`
- `property`: `property_*`

### Phase 4：讀寫入口收斂

現狀可接受，但長期要減少 direct `.from()` 分散：

- read path：集中在 query helpers，例如 `src/lib/macao-data.ts`
- write path：集中在 tracking helpers，例如 `src/lib/tracking-writes.ts`
- API route 只處理 request/response，不直接拼多個表邏輯

### Phase 5：生成 pipeline 與線上資料同步

建立單向資料流：

1. SQLite / notebook / source cache 生成候選內容。
2. QA / fact check / authority_sources 檢查。
3. dry-run export 到 `api-cache`。
4. review report。
5. 才能寫 Supabase staging 狀態。
6. 人工或明確授權後 publish。

不要讓 worker 直接大量 update live records。

## 優先順序

1. 建 `encyclopedia-data-manifest.json` 生成腳本，只讀。
2. 建 `docs/SUPABASE_TABLE_OWNERSHIP.md`，明確表 ownership。
3. 標記 0B DB 與舊 copy，不刪除。
4. 將新 cache/artifact 改入 `~/.openclaw/api-cache/encyclopedia/`。
5. 把高頻 read query 收斂到 `src/lib/macao-data.ts`。
6. 把 tracking write 收斂到 `src/lib/tracking-writes.ts`。
7. 再考慮 migration 或資料搬遷，而且必須先 backup + dry-run。

## 當前結論

現有重要資料庫必須保留：

- Supabase production
- `.openclaw/encyclopedia/db/japan.db`
- `.openclaw/encyclopedia/db/hongkong.db`
- `.openclaw/encyclopedia/db/taiwan.db`
- `.openclaw/encyclopedia/db/macau.db`
- `.openclaw/encyclopedia/db/deepener_sync.db`
- `.openclaw/encyclopedia/ai_tracker_main.db`
- `cloudpipe-backup`
- `cloudpipe-dev`
- `Documents/*-encyclopedia/articles`

短期最安全的架構優化不是搬資料，而是建立 manifest、ownership doc、read/write helper，再逐步收斂新流程。
