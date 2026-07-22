# 人臉識別 Competitor 調研缺口

## 現狀總結

### 已驗證產品 (2/7)
| 產品 | 驗證狀態 | 來源 |
|------|---------|------|
| Google Photos | ✅ 通過adversarial verify | Primary source |
| Immich | ⚠️ 有primary source，未過3票驗證 | Community docs |

### 未驗證產品 (5/7) - 需要下一輪研究
| 產品 | 調研狀態 | 優先度 |
|------|---------|--------|
| Apple Photos | 公開資料完全查不到已驗證的人物識別→命名→合併UX做法 | P2 |
| Amazon Photos | 公開資料完全查不到已驗證的人物識別→命名→合併UX做法 | P2 |
| PimEyes | 公開資料完全查不到已驗證的人物識別→命名→合併UX做法 | P2 |
| PhotoStructure | 公開資料完全查不到已驗證的人物識別→命名→合併UX做法 | P2 |
| Synology Photos ( Moments) | 公開資料完全查不到已驗證的人物識別→命名→合併UX做法 | P2 |

## 下一輪 Research 目標

### 調研範圍
針對以下5個產品，搜索其官方文檔/技術博客，产出：

1. **Confirm機制** - 如何讓用戶確認人物識別結果
2. **Confidence Threshold策略** - 如何設定置信度閾值來決定自動標記或需要確認

### 產品調研清單

#### 1. Apple Photos
- 調研方向：iOS/macOS Photos app 的 "People" 功能
- 可能的資訊來源：Apple Developer Documentation, WWDC Videos, Apple Support Articles
- 關鍵問題：
  - Apple如何決定何時顯示人物建議？
  - 用戶如何確認/否認人物標籤？
  - 是否有confidence threshold的概念？

#### 2. Amazon Photos
- 調研方向：Amazon Photos 的人臉識別功能
- 可能的資訊來源：AWS Documentation, Amazon Prime Help, AWS re:Invent talks
- 關鍵問題：
  - Amazon如何處理人物識別和標籤？
  - 是否有用戶確認流程？
  - Confidence threshold如何設定？

#### 3. PimEyes
- 調研方向：PimEyes 的面部識別搜索和確認機制
- 產品類型：⚠️ 與其他產品不同 - PimEyes是「人臉搜索引擎」而非「照片管理工具」
- 可能的資訊來源：PimEyes Blog, FAQ, Support Pages
- 已知資訊：
  - PimEyes是一個隱私優先的線上人臉搜索和反向圖像搜索技術
  - 用於監控線上存在、保護數字身份、審計版權侵權
  - 與Google Photos/Immich等產品性質不同，confirm機制可能不適用
- 關鍵問題：
  - 搜索結果如何呈現confidence score？
  - 用戶如何舉報錯誤匹配？

#### 4. PhotoStructure
- 調研方向：PhotoStructure 的自動人物標籤功能
- 可能的資訊來源：PhotoStructure Documentation, GitHub, Discord
- 關鍵問題：
  - 如何開啟和使用人物識別？
  - 用戶如何合併重複人物？
  - Confidence threshold如何設定？

#### 5. Synology Photos (取代Moments on DSM 7.0+)
- 調研方向：Synology Photos/NAS 的人臉識別 (Moments已停用，現為Synology Photos)
- 可能的資訊來源：Synology Knowledge Base, DSM Help, Community Forums
- 已知資訊：
  - 使用deep learning algorithm進行人物識別
  - 自動按相似面孔、主體、地點分組
  - 詳細confirm機制和confidence threshold待調研
- 關鍵問題：
  - 用戶如何確認/否認人物標籤？
  - Confidence threshold如何設定？
  - 如何合併重複人物？

## 產出模板

### Confirm機制 / Confidence Threshold 對比表

| 產品 | Confirm機制 | Confidence Threshold策略 | 備註 |
|------|------------|-------------------------|------|
| Google Photos | | | (已驗證) |
| Immich | | | (有source，未過驗證) |
| Apple Photos | TBD | TBD | 待調研 |
| Amazon Photos | TBD | TBD | 待調研 |
| PimEyes | TBD | TBD | 待調研 |
| PhotoStructure | TBD | TBD | 待調研 |
| Synology Moments | TBD | TBD | 待調研 |

---

*Created: 2026-07-22*
*Status: 研究缺口待填補*

## 建議行動

本缺口文檔建議作為下一輪 deep-research 任務的輸入，鎖定以上5個產品進行專門調研，產出完整的Confirm機制/confidence threshold策略對比表。
