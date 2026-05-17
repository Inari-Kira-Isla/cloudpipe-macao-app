# CLAUDE.md - Project Rules

## Rules

### Next.js Route Rules

1. **改 Next.js route 必須同步確認 sitemap route 存在**
   - 每新增一個 route (/about, /contact 等)，必須建立對應的 sitemap.xml route
   - 例如：/about → /api/sitemap?page=about
   - 原因：AI 爬蟲需要 sitemap 才能正確索引頁面

2. **RLS 規則**
   - public-facing Supabase query 必須用 `createServiceClient()`
   - 不得用 anon supabase client
   - 原因：確保資料安全，避免權限洩漏

### Sitemap 要求

- 所有 public-facing 頁面都要有 sitemap entry
- 更新 sitemap 時同步更新所有 route

### Supabase 規則

- 使用 service role key 時必須在 server-side
- 嚴禁將 service key 暴露於 client-side

---

*更新日期: 2026-05-17*
*依據: 2026-05-11 + 2026-05-17 事後分析*

---

## AI 爬取量穩定化規則（每次改動 sitemap/cache/Supabase client 前必讀）

> 根因分析（2026-05-17）：日均爬取 595→25,347 極端波動，診斷出 7 個根因並全部修復。
> **以下規則必須永久遵守，任何修改前先對照檢查。**

### 1. Sitemap Revalidate 上限

| 檔案 | 最大 revalidate | 禁止超過原因 |
|------|----------------|-------------|
| `sitemap.ts` | 1800s（30min） | 超過2h新文章不出現在 sitemap |
| `sitemap-insights.xml/route.ts` | 1800s | 同上 |
| `sitemap-mo/hk/tw/jp.xml/route.ts` | 1800s | 同上 |
| `llms-txt/route.ts` | 1800s | AI爬蟲讀到舊文章計數 |

**禁止**：將任何 sitemap 或 AI 發現入口的 revalidate 改回 3600+ 秒。

### 2. Insight changeFrequency 分層規則（禁止全改 weekly）

```typescript
// ✅ 正確：按文章新舊分層
ageDays < 7   → changeFrequency: 'daily',  priority: 0.98
ageDays < 30  → changeFrequency: 'daily',  priority: 0.95
ageDays >= 30 → changeFrequency: 'weekly', priority: 0.85

// ❌ 禁止：全部 insights 設 'weekly'
// 根因：爬蟲認為每週才需回來，導致非爆發日爬取跌 93%
```

### 3. force-dynamic + revalidate 不得共存

```typescript
// ❌ 禁止（已造成 Vercel CPU 過載 → 503 → 爬取量循環崩潰）
export const revalidate = 3600
export const dynamic = 'force-dynamic'  // ← force-dynamic 覆蓋 revalidate，等同每次重渲

// ✅ 正確：只選其一
export const revalidate = 600  // insights listing page
// 或
export const dynamic = 'force-dynamic'  // 僅限真正需要每次新鮮的頁面（如 dashboard）
```

### 4. Supabase Client 規則（擴展版）

所有 **server-side 資料讀取**必須用 `createServiceClient()`，包括：
- `sitemap.ts` / `sitemap-*.xml/route.ts`
- `feed.xml/route.ts`
- `llms-txt/route.ts`
- 任何 RSS / AI 爬蟲發現入口

**根因**：anon client 被 RLS 攔截 → 回傳 0 行 → feed.xml 返回空 RSS → llms.txt 顯示 0 篇文章 → AI 爬蟲失去發現信號。

後端 Python 腳本同樣規則：
- `insight_batch_linker.py` — 讀取操作用 service_key（anon key 僅限公開 API）
- 所有讀取 `insights` / `merchants` 的腳本必須用 `SUPABASE_SECRET_KEY`

### 5. IndexNow 即時 Ping 政策

- 新 insight 批次生成後**立即**觸發 `gsc_sitemap_submit.py`（不等排程）
- `macao_insight_and_link.sh` 已加 Step 3 IndexNow ping hook
- **禁止**移除或注解此 Step 3，否則新文章最多等 4 小時才被爬蟲發現

### 6. Insight 每日最低生成量

- `macao_insight_and_link.sh` 每批生成 **≥8 篇**（每2h × 12次 = ≥96篇/日）
- **禁止**將 `--limit` 降回 4 或以下（原本 48篇/日 不足以維持穩定爬取信號）

---

## AI 引擎爬蟲內容標準（每次開發前必讀）

> 完整標準見 `~/.openclaw/encyclopedia/notebooks/AI_ENGINE_STANDARDS.md`
> 基於 256,354 條真實爬蟲數據分析（2026-05-16）

### 關鍵規則
1. **Perplexity = 商戶頁優先**（86.5% 只看商戶），商戶頁必須有 FAQ Section（2-4 題）
2. **OpenAI = 連結圖譜**（71.7% spider-web），行業分類頁的商戶連結不得 noindex
3. **Anthropic = 文章 + 週期爆發**，每篇 insight 必須有完整 Schema.org + FAQPage
4. **Yandex = IndexNow 響應最快**，新文章發布後立即 ping
5. **Google = 商戶 LocalBusiness Schema**（67.5% 商戶頁），Schema 必須完整
6. **sitemap.xml** 必須每日更新，有斷鏈會影響所有引擎
7. **robots.txt** 必須始終返回 200