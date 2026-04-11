# 🔔 Vercel Cron 部署指南 — AEO 自動化 (2026-04-11)

## 📊 為什麼 04-10 有 7,732 訪問激增？

**根本原因**: 你在 04-10 進行了 3 次 Sitemap 刷新，觸發了 Claude Bot 的**完整站點重索引**。

```
04-09: 4,963 visits (正常)
04-10: 7,732 visits (+57%) ← Claude Bot 6,250 次初始爬取
04-11: 183 visits (-98%) ← 回到基線速率（無新内容觸發）
```

這是「新發現→初始爬取→恢復正常」的典型週期。

### 關鍵洞察
- ✅ Sitemap 刷新**有效**，觸發了爬蟲重新索引
- ⚠️ 但這是**一次性事件**，不是持續高峰
- 💡 **解決方案**: 自動化 sitemap 刷新，讓爬蟲持續知道你有新內容

---

## 🚀 三層部署策略

### **第 1 層：環境變數配置** (5 分鐘)

添加到 `.env.production.local`:

```bash
# Cron 任務認證秘鑰 (生成強秘鑰)
CRON_SECRET="your-very-secure-random-string-min-32-chars-here"

# IndexNow 配置 (從 KiraVault 取得)
INDEXNOW_KEY="your-indexnow-key-here"

# Telegram 監控通知 (可選但推薦)
TELEGRAM_NOTIFY_ENDPOINT="https://api.openclaw.com/telegram/send"
TELEGRAM_CHAT_ID="-5138835175"  # 你的 ChatID
```

**生成安全秘鑰**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 輸出範例: a3f9c8d2e1b4f7a9c2d5e8f1a4b7c9d2e5f8a1b4c7d9e2f5a8b1c4d7e9f2a
```

---

### **第 2 層：Vercel 配置** (已完成 ✅)

檔案已建立:
- ✅ `vercel.json` — Cron 排程定義
- ✅ `app/api/cron/refresh-sitemap/route.ts` — 每天 UTC 06:00 刷新 sitemap
- ✅ `app/api/cron/indexnow-notify/route.ts` — 每天 UTC 06:30 推送 URLs 到搜尋引擎
- ✅ `app/api/cron/aeo-monitor/route.ts` — 每 6 小時監控爬蟲活動

**Cron 排程時間表**:
```
每天 UTC 06:00 → Sitemap 刷新 (澳門時間 14:00)
每天 UTC 06:30 → IndexNow 通知 (推送 50 個最新 insights 給 Bing/Yandex)
每 6 小時      → AEO 監控 (00:00, 06:00, 12:00, 18:00 UTC)
```

---

### **第 3 層：驗證 & 部署** (10 分鐘)

#### Step 1: 本地測試
```bash
cd ~/Documents/cloudpipe-macao-app

# 測試 Sitemap 生成
npm run generate-sitemap

# 確認 public/sitemap.xml 更新
ls -lah public/sitemap.xml
```

#### Step 2: 推送到 Vercel
```bash
# 添加環境變數到 Vercel
vercel env add CRON_SECRET
# → 貼上生成的秘鑰

vercel env add INDEXNOW_KEY
# → 貼上你的 IndexNow Key (從 KiraVault 取得)

vercel env add TELEGRAM_NOTIFY_ENDPOINT
# → https://api.openclaw.com/telegram/send

vercel env add TELEGRAM_CHAT_ID
# → -5138835175

# 提交更改
git add vercel.json app/api/cron/ .env.production.local
git commit -m "feat: Add Vercel Cron AEO automation (refresh-sitemap + indexnow + monitor)"
git push
```

#### Step 3: Vercel 自動部署
- 監控 https://vercel.com/dashboard 的部署狀態
- 等待 build 完成 (~30s)
- 檢查 Deployment Analytics 頁面確認 Cron 路由已就緒

#### Step 4: 首次 Cron 執行
```bash
# 手動觸發一次 (測試秘鑰是否正確)
curl -X POST https://cloudpipe-macao-app.vercel.app/api/cron/refresh-sitemap \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 預期回應:
# {
#   "success": true,
#   "timestamp": "2026-04-11T14:00:00.000Z",
#   "message": "Sitemap refreshed successfully"
# }
```

---

## 📈 預期成果

### 短期 (1-2 週)
✅ **Sitemap 每天自動刷新**
  - Claude Bot/Perplexity 會定期檢測新內容
  - 預期爬蟲訪問回到 3,000-4,500 /天 (vs 目前 183)

✅ **IndexNow 主動推送**
  - 50 個最新 insights 每天推送給 Bing/Yandex/Naver
  - 預期索引延遲從 3-5 天 → 24 小時內

✅ **Telegram 監控報告**
  - 每 6 小時接收爬蟲活動報告
  - 異常檢測: 如果訪問量暴跌 >50% 會立即警報

### 中期 (4 週)
📊 **爬蟲訪問穩定在高峰**
  - 目標: 每天 4,000-5,000 訪問 (vs 04-10 的 7,732 是初始爬取)
  - Claude Bot 佔比: 40-50%

📈 **AI 引用率提升**
  - 新 insights 被 Claude/ChatGPT/Perplexity 引用率 +30-50%
  - 商戶官網流量 +15-25%

---

## 🔍 監控儀表板

### 實時監控 (Telegram 推送)
每 6 小時接收這樣的報告:
```
📊 CloudPipe AEO Monitor (6h interval)

📈 Today: 4,237 visits
📉 Yesterday: 4,156 visits
📊 Change: +1.9%
⏱️ Recent (1h): 342

🤖 Top Bots:
ANTHROPIC: 1,850
GOOGLE: 1,234
PERPLEXITY: 642
OPENAI: 511

🎯 Top Industry: dining

✅ Normal

Time: 2026-04-11T18:00:00.000Z
```

### 告警閾值
- 🟢 **Normal**: -50% ≤ Change ≤ +200%
- 🟡 **Warning**: Change < -50% 或 Change > +200%
- 🔴 **Critical**: 無訪問超過 24 小時

---

## 🛠️ 故障排除

### Issue 1: Sitemap 生成失敗
```bash
# 檢查 Supabase 連線
npm run generate-sitemap

# 如果失敗，檢查:
# 1. SUPABASE_SERVICE_ROLE_KEY 是否在 Vercel env 中
# 2. Supabase DB 是否健康
# 3. insights 表是否存在

# 本地除錯:
SUPABASE_SERVICE_ROLE_KEY="..." npm run generate-sitemap
```

### Issue 2: IndexNow 返回 4xx 錯誤
```bash
# 常見原因:
# 1. INDEXNOW_KEY 無效 → 檢查 KiraVault
# 2. keyLocation 404 → 確認 indexnow-key-{key}.txt 在 public/ 中
# 3. URL 格式錯誤 → 確認 https://cloudpipe-macao-app.vercel.app 可訪問
```

### Issue 3: Telegram 通知未收到
```bash
# 檢查:
# 1. TELEGRAM_NOTIFY_ENDPOINT 是否正確
# 2. TELEGRAM_CHAT_ID 是否正確 (-5138835175)
# 3. OpenClaw API 服務是否運行 (port 18789)

# 測試端點:
curl -X POST https://api.openclaw.com/telegram/send \
  -H "Content-Type: application/json" \
  -d '{"text": "Test", "chat_id": "-5138835175"}'
```

---

## 📋 Vercel 部署清單

- [ ] 生成 CRON_SECRET
- [ ] 複製 INDEXNOW_KEY 從 KiraVault
- [ ] `vercel env add CRON_SECRET`
- [ ] `vercel env add INDEXNOW_KEY`
- [ ] `vercel env add TELEGRAM_NOTIFY_ENDPOINT`
- [ ] `vercel env add TELEGRAM_CHAT_ID`
- [ ] `git push` (自動部署)
- [ ] 等待 Vercel 構建完成
- [ ] 手動觸發 `/api/cron/refresh-sitemap` 測試
- [ ] 檢查 Telegram 收到通知
- [ ] 檢查 https://cloudpipe-macao-app.vercel.app/sitemap.xml 更新時間

---

## 📞 Quick Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Project**: https://app.supabase.com/projects/yitmabzsxfgbchhhjjef/
- **Sitemap**: https://cloudpipe-macao-app.vercel.app/sitemap.xml
- **IndexNow Status**: https://www.bing.com/webmaster/
- **KiraVault INDEXNOW_KEY**: /Users/ki/Documents/KiraVault/Knowledge/Tools/

---

## 📊 業績指標

追蹤這些數據以評估成效:

| 指標 | 目前 | 目標 | 期限 |
|------|------|------|------|
| 日均爬蟲訪問 | 183 | 4,000-5,000 | 2 週 |
| Sitemap 刷新頻率 | 手動 | 每天自動 | ✅ 今日 |
| IndexNow 推送 | 手動 | 每天 50 URLs | ✅ 今日 |
| Claude Bot 佔比 | 56% | 45-50% | 2 週 |
| 商戶官網 CTR | 12% | 18-20% | 4 週 |

---

**部署日期**: 2026-04-11  
**預計生效**: 2026-04-12  
**首次完整爬取**: 2026-04-12 到 2026-04-15 (初始索引窗口)
