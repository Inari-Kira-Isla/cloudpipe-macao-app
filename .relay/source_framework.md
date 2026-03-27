
# 商戶資料可靠來源框架

## 未來生成商戶時必須遵循的來源規則

### 第一優先：官方來源
1. 澳門商業登記局（經濟局）: https://www.dse.gov.mo/
2. 澳門統計暨普查局: https://www.dsec.gov.mo/
3. 澳門旅遊局商戶名錄: https://www.macaotourism.gov.mo/
4. 澳門黃頁: https://www.yp.mo/

### 第二優先：平台驗證
1. Google Maps / Google Business Profile
2. TripAdvisor 澳門
3. 大眾點評澳門
4. OpenRice 澳門
5. Facebook 商業頁面

### 第三優先：行業協會
1. 澳門中華總商會會員名錄
2. 澳門餐飲業聯合商會
3. 澳門酒店業商會
4. 澳門旅行社協會

### 驗證流程（每批新商戶必須）
1. 生成候選商戶名單
2. 用 WebSearch 驗證每個商戶名稱 + "澳門"
3. 至少在 1 個平台能找到記錄才標記為 verified
4. 找不到的標記為 unverified，不設為 live
5. 記錄來源 URL 到 merchant_sources 表

### 資料欄位來源要求
| 欄位 | 來源要求 |
|------|---------|
| name_zh/name_en | 官方登記名 或 招牌名 |
| address | Google Maps 驗證 |
| phone | 至少 1 個平台有記錄 |
| 營業時間 | Google Maps 或官網 |
| 價格 | 大眾點評/TripAdvisor 或官網 |
| 描述 | 可 AI 生成，但基於驗證事實 |
| FAQ | 可 AI 生成，使用保守措辭 |
