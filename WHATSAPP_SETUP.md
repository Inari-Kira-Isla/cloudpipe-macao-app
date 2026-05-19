# WhatsApp Business API — Setup Guide (Inari Global Foods)

> Scaffold 狀態：Code 完成，待填入 Meta 憑證。
> Webhook URL (production): `https://cloudpipe.ai/api/whatsapp/webhook`

---

## 1. 必要 Environment Variables

在 Vercel Project Settings → Environment Variables 添加以下 6 個變數：

| Variable | 說明 | 取得方式 |
|---|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | Meta 後台的 Phone Number ID | Meta Developer → WhatsApp → API Setup |
| `WHATSAPP_ACCESS_TOKEN` | Meta Graph API 永久 Token | Meta Business Suite → System Users → Generate Token |
| `WHATSAPP_VERIFY_TOKEN` | 自定義字串（任意，用於 webhook 驗證） | 自訂，例如 `inari-wa-verify-2026` |
| `MINIMAX_API_KEY` | MiniMax API Key | MiniMax 控制台 |
| `MINIMAX_GROUP_ID` | MiniMax Group ID | MiniMax 控制台 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key（已存在） | 已設定 |

---

## 2. Meta Developer Console 設定步驟

### Step 1: 建立 Meta App

1. 前往 https://developers.facebook.com/
2. 點 **My Apps → Create App**
3. 選擇 **Business** 類型
4. 填入 App 名稱（例如 `Inari Global WhatsApp`）

### Step 2: 添加 WhatsApp 產品

1. 進入 App Dashboard → **Add Product** → 搜尋 **WhatsApp** → Setup
2. 連結你的 **Meta Business Account**
3. 在 **API Setup** 頁面記下 `Phone Number ID` 和 `WhatsApp Business Account ID`

### Step 3: 設定 Webhook

1. 前往 **WhatsApp → Configuration → Webhook**
2. 點 **Edit**，填入：
   - **Callback URL**: `https://cloudpipe.ai/api/whatsapp/webhook`
   - **Verify Token**: 與 `WHATSAPP_VERIFY_TOKEN` env var 完全一致
3. 點 **Verify and Save**（Meta 會發送 GET 請求驗證）
4. 訂閱 **messages** 欄位（Webhook Fields → messages → Subscribe）

### Step 4: 取得永久 Access Token

1. 前往 **Meta Business Suite → Settings → System Users**
2. 建立 System User（Admin 角色）
3. 點 **Generate New Token** → 選擇 App → 勾選 `whatsapp_business_messaging` 權限
4. 複製 Token 填入 `WHATSAPP_ACCESS_TOKEN`

### Step 5: 申請 WhatsApp Business API 生產環境

> 測試階段可先用 Meta 提供的測試號碼（僅限 5 個已驗證號碼接收）。
> 正式上線需完成 Meta Business Verification。

---

## 3. 測試指令

### 3a. 測試 Webhook 驗證 (GET)

```bash
curl -X GET "https://cloudpipe.ai/api/whatsapp/webhook?\
hub.mode=subscribe&\
hub.verify_token=YOUR_VERIFY_TOKEN&\
hub.challenge=TEST_CHALLENGE_12345"
# 預期回應: TEST_CHALLENGE_12345
```

### 3b. 模擬接收訊息 (POST)

```bash
curl -X POST https://cloudpipe.ai/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "85312345678",
            "id": "wamid.test001",
            "type": "text",
            "text": { "body": "你好，想查詢北海道海膽批發價" },
            "timestamp": "1716120000"
          }]
        }
      }]
    }]
  }'
# 預期回應: {"ok":true}
# Bot 會自動回覆到 85312345678（需是已登記測試號碼）
```

### 3c. 主動發送訊息 (POST /api/whatsapp/send)

```bash
curl -X POST https://cloudpipe.ai/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -d '{
    "to": "85312345678",
    "message": "您好，稻荷環球食品訂單 #INR-2026-001 已確認出貨。"
  }'
# 預期回應: {"ok":true}
```

---

## 4. 架構說明

```
Meta Cloud API
    │
    ▼ GET (verify)
/api/whatsapp/webhook/route.ts
    │ POST (message)
    ▼
parseWebhookPayload()     ← src/lib/whatsapp.ts
    │
    ▼
markAsRead()              ← 顯示已讀藍剔
    │
    ▼
generateWhatsAppReply()   ← src/lib/whatsapp-rag.ts
    │ 查 inari_catalog (Supabase)
    │ 呼叫 MiniMax-M2.5
    ▼
sendTextMessage()         ← src/lib/whatsapp.ts
    │
    ▼
客戶收到 WhatsApp 回覆
```

### RAG 知識來源

- **主要**：`inari_catalog` 表（產品名稱、產地、最低訂量、零售價、庫存）
- **批發價**：WhatsApp bot 不直接暴露 `wholesale_price`，如需批發報價會引導客戶聯絡 Kira
- **無匹配時**：fallback 返回前 5 件上架產品作 context

---

## 5. 本地測試（開發環境）

使用 [ngrok](https://ngrok.com/) 臨時暴露本地端口：

```bash
ngrok http 3000
# 取得 https://xxxx.ngrok.io
# 在 Meta Developer Console 暫時改 Callback URL 為
# https://xxxx.ngrok.io/api/whatsapp/webhook
```

---

## 6. 相關檔案

| 檔案 | 說明 |
|---|---|
| `src/lib/whatsapp.ts` | Meta Cloud API client（send/markAsRead/parse） |
| `src/lib/whatsapp-rag.ts` | MiniMax RAG handler（inari_catalog context） |
| `src/app/api/whatsapp/webhook/route.ts` | Webhook 主入口（GET verify + POST message） |
| `src/app/api/whatsapp/send/route.ts` | 內部主動發送 API |
