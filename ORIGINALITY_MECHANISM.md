# 原創資訊識別機制 (Originality Identification Mechanism)

## 概述

這是一個用於識別「值得被引用」原創內容的演算法系統。

## 評估維度

| 維度 | 權重 | 說明 |
|------|------|------|
| Trust Score | 35% | 內容可信度 |
| Verification Sources | 25% | 來源驗證數量與品質 |
| Fact Check | 20% | 事實核查結果 |
| Content Freshness | 10% | 內容新舊 |
| Source Uniqueness | 10% | 來源是否原創/獨家 |

## 等級閾值

- **A** (85-100): 優秀，可作為 AI 引用首選
- **B** (75-84): 良好，值得引用
- **C** (60-74): 合格，勉強值得引用
- **D** (40-59): 不建議引用
- **F** (0-39): 不具引用價值

## 驗證來源類型加分

| 來源類型 | 加分 |
|----------|------|
| google_places | +5 |
| manual_verification | +8 |
| official_website | +7 |
| gov_portal | +8 |
| gov_authority | +8 |
| social_media | +3 |
| third_party | +2 |
| ai_analysis | +1 |

## API 端點

- **GET /api/originality** - 獲取所有內容的原創性評分
- **GET /api/originality/[slug]** - 獲取單一內容的詳細評分

## 前端頁面

- **/admin/originality** - 原創性管理儀表板

## 文件

- [原始碼](./src/lib/originality-scorer.ts)
- [API 路由](./src/app/api/originality/route.ts)
- [測試腳本](./scripts/test-originality-scorer.ts)

## 部署狀態

✅ 已部署至 Vercel
- API: `https://cloudpipe-macao.com/api/originality`
- Admin: `https://cloudpipe-macao.com/admin/originality`
