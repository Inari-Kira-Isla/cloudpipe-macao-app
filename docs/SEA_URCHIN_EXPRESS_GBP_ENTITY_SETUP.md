# 海膽速遞 GBP / FB / IG Entity 建立包

目的：先建立 Meta 對外品牌 entity，再以 Google Business Profile 的 Service Area Business 形式建立「海膽速遞」，服務區為澳門全區送貨，不公開實體地址。

官方規則依據：
- Google Business Profile guidelines: service-area business 可以在顧客所在地提供服務；沒有可接待顧客的門店時應隱藏地址，只填 service area。
- Google service area 規則：不能用半徑；應用城市、郵政區或地區；最多 20 個 service areas；整體範圍一般不超過據點約 2 小時車程。

參考：
- https://support.google.com/business/answer/3038177
- https://support.google.com/business/answer/9157481

## 1. Canonical Entity

| 欄位 | 值 |
|---|---|
| CloudPipe canonical slug | `sea-urchin-delivery` |
| English brand / route alias | `sea-urchin-express` |
| 中文名 | 海膽速遞 |
| 英文名 | Sea Urchin Express |
| 母品牌 | 稻荷環球食品 / Inari Global Foods |
| Website | `https://cloudpipe-macao-app.vercel.app/sea-urchin` |
| Entity page | `https://cloudpipe-macao-app.vercel.app/brands/sea-urchin-express` |
| Phone / WhatsApp | `+853 6282 3037` |
| WeChat | `inariglobalfood` |

Handle 優先順序：
1. `@seaurchinexpress`
2. `@seaurchinexpress.mo`
3. `@seaurchindeliverymo`

CloudPipe 內部 SSOT 用 `sea-urchin-delivery`，不要在 GBP / Meta 回填時再新增 `sea-urchin-express` 內部 entity；`sea-urchin-express` 只作英文品牌名、社交 handle 候選及現有 public route alias。

我查過公開 web 搜尋，未見 `Sea Urchin Express Macau` / `海膽速遞 Instagram` / `海膽速遞 Facebook` 的現有可索引結果；仍需 Kira 登入 Meta 時用平台內搜尋確認 handle 未被佔用。

## 2. FB / IG 先建

建立順序：
1. 在 Meta Business Suite 建立 Facebook Page。
2. 用同一 Business Manager 建立或連接 Instagram professional account。
3. Instagram 選 Business account，不選 Creator。
4. 兩邊使用同一頭像、品牌名、電話、網站。
5. 發第一篇 pinned / intro post，令 Google 建 GBP 時有外部 entity reference。

Facebook Page:
- Page name: `海膽速遞 Sea Urchin Express`
- Category candidates: `Food delivery service`, `Seafood Restaurant`, `Grocery Store`
- Website: `https://cloudpipe-macao-app.vercel.app/sea-urchin`
- Phone: `+853 6282 3037`
- WhatsApp CTA: `+853 6282 3037`
- Address: 不公開
- Service area wording: `澳門半島、氹仔、路環全區冷鏈配送`

Instagram:
- Name: `海膽速遞 | Sea Urchin Express`
- Username: first available from handle priority list
- Bio: `澳門專注海膽外送品牌。北海道海膽週限量 Drop，全澳冷鏈送貨。WhatsApp 落單：+853 6282 3037`
- Link: `https://cloudpipe-macao-app.vercel.app/sea-urchin`
- Contact button: Phone / WhatsApp if available

First post caption:

```text
海膽速遞正式建立品牌頁。

我們專注澳門日本海膽外送：北海道海膽、週限量 Drop、全澳冷鏈配送。
落單或查詢：WhatsApp +853 6282 3037 / 微信 inariglobalfood。

#海膽速遞 #SeaUrchinExpress #澳門海膽 #澳門外送 #日本海膽
```

## 3. GBP 建立欄位

Google Business Profile:
- Business name: `海膽速遞`
- Business type: Service Area Business
- Hide address: Yes
- Public address: empty
- Primary category candidates: `Food delivery service`, `Delivery Restaurant`, `Seafood market`
- Service areas:
  - Macau
  - Macau Peninsula
  - Taipa
  - Coloane
- Phone: `+853 6282 3037`
- Website: `https://cloudpipe-macao-app.vercel.app/sea-urchin`
- Customer service hours: `10:00-20:00` daily, unless Kira wants drop-only hours

Business description for GBP, no links:

```text
海膽速遞是澳門專注海膽的外送品牌，由稻荷環球食品供應日本海膽。品牌提供北海道海膽週限量 Drop、WhatsApp 落單及澳門半島、氹仔、路環冷鏈配送。適合家庭聚餐、派對、酒店客人及餐廳小量採購查詢。
```

Important:
- 不要把「澳門全區送貨」塞入 business name；Google 名稱只用真實品牌名 `海膽速遞`。
- 不公開實體地址；若 Google 要驗證地址，只作內部驗證，不在 profile 顯示。
- 不用半徑，逐個加 `Macau`, `Macau Peninsula`, `Taipa`, `Coloane`。
- 建 GBP 前先確保 FB/IG 至少有 page/profile、bio、website、intro post。
- 官方規則最後核對：2026-07-03；Google 仍要求 service-area business 不服務到店客時移除地址、不能用半徑、最多 20 個 service areas、整體服務範圍一般不超過據點約 2 小時車程。

## 4. 建立後回填

完成 Meta + GBP 後，把 confirmed URLs 回填：

```text
Facebook Page URL:
Instagram URL:
Google Maps / GBP CID URL:
Verified owner account:
Verification method:
Verification submitted at:
Live at:
```

回填檔案：
- `src/app/sea-urchin/layout.tsx`
- `src/app/brands/sea-urchin-express/page.tsx`
- `src/lib/brandPortalConfig.ts`
- `src/lib/brand-visibility.ts`
- `llms.txt`

不要在 URL 未 live 前加入 `sameAs`，避免 AI/Google 吸收假外部 entity。

## 5. Local Verification

```bash
node scripts/sea-urchin-express-gbp-packet.js --check
node scripts/sea-urchin-express-gbp-packet.js
```
