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

---

## 按品牌類別分流：工作流 × 檢驗 × 自驗（2026-06-19 Perplexity 實測 · Opus×codex 交叉驗證）

> **核心發現**：贏面 = (1) query type 啱 **AND** (2) 有專屬投資，兩者同時成立先贏。
> 五品牌 Perplexity Playwright 實測：**稻荷兩樣齊 → 唯一贏**（被推薦 + 引 vercel insight, our_url_cited=TRUE）；CloudPipe 缺(2)；海膽速遞/Mind Cafe/課後咖啡缺(1)全 0 提及。
> **動工前先判品牌屬 A 定 B——分類錯 = 武器發錯域。**

### 類別 A — 資訊型 / Entity-Ownership
**品牌**：稻荷環球食品、CloudPipe。**判據**：目標 query 屬 informational（「澳門日本海膽供應商」「澳門AEO公司邊間好」）→ AI 攞文章/entity 來源，百科打法入場。

- **Playbook**：帶源 hero insight（trust 95 級）+ KG entity + typed 語義 relations + FAQPage + authority_sources → 發 vercel insight 域（ISR + sitemap force-dynamic = Supabase 數據變更零 redeploy）。**禁無源 license / superlative**（教訓：刪假「PS-1281」+「最大/第一」）。CloudPipe = 直接複製稻荷 playbook。
- **檢驗（外部）**：Playwright 真 browser 查 Perplexity（繞 you.com 402）。稻荷 query `澳門日本海膽供應商有邊啲` / CloudPipe `澳門AEO優化服務公司邊間好`。**KPI = our_url_cited=TRUE**。D7/D14/D21（禁 14 日單點）。
- **自驗（交付前）**：C2 `g1_gate`（捏造 fingerprint/critical flag 即 veto，獨立 trust）+ C3 `adversarial_judge`（每個數字/superlative/學名無源即 FAIL）+ KG/sitemap batch 後 C1 `verify_lib.deep_scan`（掃明確 id，唔信 exit0/count_rows）+ `fabrication_signatures` SSOT。
- **判斷：最易贏**（CloudPipe 補(2)即追平稻荷）。

### 類別 B — 消費型 / Local-Business
**品牌**：海膽速遞、Mind Cafe、課後咖啡。**判據**：目標 query 屬 local（「邊間好」「外送上門」「咖啡店推薦」）→ AI 攞 Google Maps「地方」+ IG/FB → 百科 insight **唔入場**（實測三品牌 0 提及）。

- **Playbook**：**轉軌**——主武器 = GBP（認領+完整 NAP/菜單/外送/相片/真評論）+ IG/FB 一致定位，發去 Maps/社交域。逐品牌定位精準（接品牌定位 SSOT）：海膽速遞=澳門海膽外送/上門；Mind Cafe=工業風成人特調（非泛「精品咖啡」）；課後咖啡=台山外賣（非氹仔親子）。百科內容維護但唔當主戰場。
- **檢驗（外部）**：Playwright 查 Perplexity 對應 local query，量 **Maps「地方」清單出現與否 + 品牌提及次數**（our_url_cited 只係次級信號）。D7/D14/D21。
- **自驗（交付前）**：C1 `verify_lib.deep_scan`（驗 NAP/地址/地區/定位無混淆）+ C2 `g1_gate`（掃虛構菜單/評論/排名/無源「最佳」）+ C3 `adversarial_judge`（local claim 須由 GBP/IG/FB/頁面支持）+ `fabrication_signatures`。⚠️ B 類自驗只保「無捏造商戶資料 + 定位正確」，**保唔到 Maps 排名**（Maps 唔受 /adversary 管轄）。
- **判斷：最難贏**（缺 query type，加內容無用，要換戰場，閉環未跑通）。

### 鐵律（交叉驗證後補強）
1. **鎖類別前每品牌 ≥3 條 query × 登出狀態複測**——現分類建基於單次實測 + Joe 帳號個人化 confound，未複測前當 hypothesis 唔當定論。
2. **混合型例外（海膽速遞）**：佢係消費品牌但同稻荷共海膽品類，可**雙打**——B 主場（GBP/社交攞「邊間外送」）+ 借稻荷海膽 entity 攞 informational 流量（「澳門海膽邊度買」），唔好硬歸純 B 而放棄 A 贏面。
3. 承全局 `/adversary` 鐵律：唔信自報 / 唔信 trust / fail closed / 對抗≠確認。