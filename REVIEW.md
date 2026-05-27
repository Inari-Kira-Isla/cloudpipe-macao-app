# REVIEW.md — cloudpipe-macao-app-src

> 繼承 `~/.claude/REVIEW.md` 全域規則（嚴重度定義 · Nit 上限 5 · tally-first · Pre-existing · re-review 收斂）。
> 本檔只補充此專案的 **覆寫規則與快速觸發清單**。衝突時本檔優先。

---

## 專案 Critical 觸發清單

以下任一條件成立 → **自動 Critical，必修才能合併**：

| # | 條件 | 根因 / 後果 |
|---|---|---|
| C1 | `supabase` anon client 用於資料讀取（判斷：不在 `'use client'` 或 client component 內的任何 Supabase query；`createClient()` 而非 `createServiceClient()` = 違規） | RLS 攔截 → 0 行 → notFound() → 全站 404（2026-05-11 根因） |
| C2 | `SUPABASE_SERVICE_ROLE_KEY` 暴露於 client-side 或 `NEXT_PUBLIC_` 前綴 | 服務金鑰外洩 |
| C3 | 新增 Next.js App Router route，但沒有對應 `sitemap-*.xml/route.ts` | AI 爬蟲無法發現頁面（2026-05-11 -99% 事件根因） |
| C4 | `export const dynamic = 'force-dynamic'` 與 `export const revalidate = N` 同時出現 | Vercel CPU 過載 → 503 → 爬取量循環崩潰 |
| C5 | `robots.txt` 或 `sitemap_index.xml` 返回非 200 | 所有 AI 爬蟲立即失去入口信號 |
| C6 | `IndexNow ping` hook 從 `macao_insight_and_link.sh` Step 3 被移除或注解 | 新文章最多延遲 4h 才被索引 |

---

## 專案 Important 觸發清單

| # | 條件 | 後果 |
|---|---|---|
| I1 | `sitemap.ts` / `sitemap-*.xml/route.ts` 的 `revalidate > 1800` | 新文章在 sitemap 不出現，AI 爬蟲錯過 |
| I2 | 所有 insights changeFrequency 設為 `'weekly'`（應分層） | 爬取量跌 93%（2026-05-17 根因） |
| I3 | insight 批次 `--limit < 8` | 日均 < 96 篇，低於穩定爬取信號閾值 |
| I4 | 商戶頁 / insight 頁缺少 `FAQPage` Schema | Perplexity 不讀此頁（86.5% 只讀有 FAQ 的商戶） |
| I5 | `LocalBusiness` Schema 欄位不完整（缺 address / telephone / openingHours） | Google 爬取量下降（67.5% 商戶頁依賴此 Schema） |
| I6 | Python 腳本用 `anon key` 讀取 `insights` / `merchants` 表 | 回傳 0 行，腳本靜默失敗 |

---

## 跳過路徑（降低嚴重度期望）

以下路徑 review 時除非直接觸碰業務邏輯，否則降為 Minor/Nit：

```
node_modules/
.next/
supabase/migrations/*.sql        ← DDL 由獨立 DB review 處理
public/robots.txt                ← 有獨立 sitemap-sync 規則
*.lock
src/app/[locale]/llms-*/         ← 語言入口頁，格式固定
```

---

## AI 爬蟲穩定性快速核查

**觸發條件**：diff 包含以下任一路徑時執行 → `sitemap*.ts` / `route.ts`（sitemap 相關）/ `supabase*.ts` / `middleware.ts` / `robots.ts` / `.sh`（批次腳本）

```
□ 所有 sitemap route revalidate ≤ 1800s？
□ insights changeFrequency 仍然分層（daily/daily/weekly）？
□ 沒有 force-dynamic + revalidate 共存？
□ server-side 全用 createServiceClient()，沒有 anon client？
□ IndexNow ping hook 存在？
□ 新 route 有對應 sitemap entry？
```

---

## 本專案 Pre-existing 高發區

以下區域已知有 pre-existing 問題，review 時標 Pre-existing 不阻擋 PR：

- `src/middleware.ts` bot detection — UA 字串版本偏舊（持續追蹤中）
- `crawler_stats_cache` pg_cron timeout — DB function 超時（已知，另有 fallback 處理）
- HK / TW / JP region routing — 部分 redirect 尚未完整（2026-05-11 紀錄）
