# 關鍵詞分析實例與使用指南

## 實際例子：澳門海膽批發搜尋

### 搜尋查詢
```
searchTerm: "澳門海膽批發"
brand: "稻荷環球食品"
competitors: ["海膽速遞", "新濠海鮮", "望廈漁港", "嘉湖海鮮", "馬會美食"]
```

### 預期關鍵詞分析結果

```json
{
  "queries": ["澳門海膽批發"],
  "platforms": ["gemini", "gpt", "perplexity", "claude", "grok"],
  "keywordAnalysis": {
    "澳門海膽批發": {
      "gemini": [
        "日本海膽",
        "新鮮海膽",
        "冷鏈配送",
        "批發價格",
        "澳門餐廳",
        "海膽品質",
        "供應商",
        "北海道",
        "蝦蟹批發",
        "零售渠道"
      ],
      "gpt": [
        "海膽供應",
        "澳門批發市場",
        "日本進口",
        "冷凍海膽",
        "餐廳合作",
        "價格行情",
        "配送服務",
        "品質保證",
        "水產批發",
        "漁業公會"
      ],
      "perplexity": [
        "澳門水產",
        "海膽溯源",
        "冷鏈物流",
        "批發商",
        "品質管理",
        "衛生檢測",
        "供應鏈",
        "進口清關",
        "市場價格",
        "競爭對手"
      ],
      "claude": [
        "海膽營養",
        "烹飪指南",
        "品種區分",
        "儲存方法",
        "澳門餐飲",
        "食材指南",
        "進口流程",
        "品牌推薦",
        "價格對比",
        "零售商"
      ],
      "grok": [
        "X上的討論",
        "消費者評價",
        "澳門商業",
        "供應鏈創新",
        "直播帶貨",
        "社群行銷",
        "品牌故事",
        "食安認證",
        "新聞報導",
        "市場動態"
      ]
    }
  },
  "competitorRanks": {
    "海膽速遞": {
      "avgRank": 2,
      "mentioned": true,
      "totalCitations": 18,
      "keywords": [
        "24小時配送",
        "海膽速遞品牌",
        "快速物流",
        "新鮮度保證",
        "澳門本地"
      ],
      "platforms": {
        "gemini": {
          "position": 2,
          "mentioned": true,
          "citationCount": 4,
          "keywords": ["快速配送", "冷鏈配送", "澳門品牌", "新鮮海膽"]
        },
        "gpt": {
          "position": 3,
          "mentioned": true,
          "citationCount": 4,
          "keywords": ["配送服務", "澳門本地", "24小時"]
        },
        "perplexity": {
          "position": 1,
          "mentioned": true,
          "citationCount": 5,
          "keywords": ["冷鏈物流", "速遞服務", "品質管理"]
        },
        "claude": {
          "position": 4,
          "mentioned": true,
          "citationCount": 3,
          "keywords": ["配送選項", "澳門餐飲合作"]
        },
        "grok": {
          "position": 2,
          "mentioned": true,
          "citationCount": 2,
          "keywords": ["社群推薦", "品牌故事"]
        }
      }
    },
    "稻荷環球食品": {
      "avgRank": 1,
      "mentioned": true,
      "totalCitations": 22,
      "keywords": [
        "日本海膽直供",
        "批發供應商",
        "冷鏈物流",
        "高端食材",
        "澳門領導品牌"
      ],
      "platforms": {
        "gemini": {
          "position": 1,
          "mentioned": true,
          "citationCount": 5,
          "keywords": ["日本海膽", "批發供應", "冷鏈配送", "品質保證"]
        },
        "gpt": {
          "position": 2,
          "mentioned": true,
          "citationCount": 5,
          "keywords": ["供應商", "日本進口", "批發價格"]
        },
        "perplexity": {
          "position": 1,
          "mentioned": true,
          "citationCount": 6,
          "keywords": ["批發商", "日本進口", "冷鏈物流"]
        },
        "claude": {
          "position": 2,
          "mentioned": true,
          "citationCount": 3,
          "keywords": ["日本海膽", "高端品牌", "進口商"]
        },
        "grok": {
          "position": 1,
          "mentioned": true,
          "citationCount": 3,
          "keywords": ["市場領導", "品牌故事", "供應鏈創新"]
        }
      }
    }
  }
}
```

## 前端顯示效果

### 表格：競爭排名

| # | 品牌 | 爬蟲訪問 | Gemini | GPT | Perplexity | Claude | Grok | 平均排名 |
|---|------|--------|--------|-----|-----------|--------|------|---------|
| 1 | ★ 稻荷環球食品 | 45% | **#1** | #2 | **#1** | #2 | **#1** | **#1** |
| 2 | 海膽速遞 | 32% | #2 | #3 | **#1** | #4 | #2 | #2 |
| 3 | 新濠海鮮 | 15% | #5 | #4 | #3 | #3 | #4 | #4 |
| 4 | 望廈漁港 | 5% | — | — | #5 | — | — | — |
| 5 | 嘉湖海鮮 | 3% | — | — | — | — | — | — |

*藍色背景 = 排名前 3*

### 區塊：關鍵詞分析

```
🔍 AI 搜尋關鍵詞分析

🔎 "澳門海膽批發"

┌─────────────────┬─────────────────┬─────────────────┐
│  🤖 Gemini      │  🧠 ChatGPT     │  🔎 Perplexity │
├─────────────────┼─────────────────┼─────────────────┤
│ [日本海膽]      │ [海膽供應]      │ [澳門水產]      │
│ [新鮮海膽]      │ [澳門批發市場]  │ [海膽溯源]      │
│ [冷鏈配送]      │ [日本進口]      │ [冷鏈物流]      │
│ [批發價格]      │ [冷凍海膽]      │ [批發商]        │
│ [澳門餐廳]      │ [餐廳合作]      │ [品質管理]      │
│ +5 更多...      │ +5 更多...      │ +5 更多...      │
└─────────────────┴─────────────────┴─────────────────┘

┌─────────────────┬─────────────────┐
│  ✨ Claude      │  ⚡ Grok        │
├─────────────────┼─────────────────┤
│ [海膽營養]      │ [X上的討論]     │
│ [烹飪指南]      │ [消費者評價]    │
│ [品種區分]      │ [澳門商業]      │
│ [儲存方法]      │ [供應鏈創新]    │
│ [澳門餐飲]      │ [直播帶貨]      │
│ +5 更多...      │ +5 更多...      │
└─────────────────┴─────────────────┘
```

## 分析見解

### 1. 平台差異 (Platform Differentiation)

| 平台 | 特色 | 強調 |
|------|------|------|
| **Gemini** | 實用信息 | 進口地點、冷鏈技術 |
| **ChatGPT** | 市場概況 | 批發市場、價格行情 |
| **Perplexity** | 技術細節 | 溯源、檢測、供應鏈 |
| **Claude** | 使用教學 | 營養、烹飪、儲存 |
| **Grok** | 社群聲音 | 消費評價、品牌故事 |

### 2. 稻荷 vs 海膽速遞 (Competitive Gap Analysis)

**稻荷強勢詞彙**:
- 「日本海膽直供」(5個平台都提及)
- 「批發供應商」(Perplexity 獨家強調)
- 「高端品牌」(Claude + Grok 塑造形象)

**海膽速遞機會**:
- Perplexity 排名 #1 (物流技術優勢)
- 「快速配送」在 Gemini/GPT 中出現
- 應強化「24小時」和「冷鏈」在 Claude/Claude/Grok 中的提及

### 3. 市場缺口 (Market Gaps)

| 關鍵詞 | 誰在談 | 誰缺少 |
|--------|--------|--------|
| 「認證驗證」 | Perplexity | Gemini, GPT |
| 「品牌故事」 | Grok, Claude | Gemini |
| 「消費者評價」 | Grok | 其他平台 |
| 「進口流程」 | Claude | Grok |
| 「市場價格」 | GPT, Perplexity | Claude |

## 實作步驟

### Step 1: 執行資料收集

```bash
# 測試單個品牌
npx ts-node scripts/collect-ai-search-baseline.ts \
  --brand inari-global-foods \
  --test

# 預期輸出
# 🔍 Collecting AI Search Baseline for: 稻荷環球食品
# 📝 Search terms: 澳門海膽批發,澳門水產進口,日本海膽供應商,澳門冷鏈海鮮
# 🧪 TEST MODE - Will not save to database
#
# 🎯 Searching on Gemini...
#   搜尋: "澳門海膽批發"
#   ✅ 找到 4 筆結果
#
# 🎯 Searching on ChatGPT...
#   搜尋: "澳門海膽批發"
#   ✅ 找到 4 筆結果
#
# ... (Perplexity, Claude, Grok 類似)
#
# ✅ TEST MODE - 116 results ready (not saved)
```

### Step 2: 正式執行（保存資料）

```bash
npx ts-node scripts/collect-ai-search-baseline.ts \
  --brand inari-global-foods
```

### Step 3: 驗證資料庫

```sql
-- 檢查關鍵詞是否正確儲存
SELECT 
  platform, 
  query, 
  competitor_name,
  keywords_extracted,
  COUNT(*) as count
FROM ai_search_results
WHERE brand_slug = 'inari-global-foods'
GROUP BY platform, query, competitor_name, keywords_extracted
LIMIT 20;
```

### Step 4: 訪問前端

1. 前往 http://localhost:3000/macao/brand/inari-global-foods
2. 輸入密碼: `cloudpipe2026`
3. 向下滾動到「🏆 競爭態勢排名」區塊
4. 確認 Grok 欄位顯示正確
5. 繼續滾動到「🔍 AI 搜尋關鍵詞分析」區塊
6. 驗證各平台的關鍵詞正確顯示

## 關鍵詞提取質量檢查清單

- [ ] **中文詞彙**：是否正確識別「日本海膽」、「冷鏈配送」等?
- [ ] **英文詞彙**：是否提取「supply chain」、「logistics」?
- [ ] **專業術語**：是否包含「溯源」、「食安」、「物流」?
- [ ] **品牌名稱**：是否列出競品（「海膽速遞」、「稻荷」）?
- [ ] **地理詞彙**：是否提取「澳門」、「北海道」、「日本」?
- [ ] **去重**：是否移除重複詞彙?
- [ ] **停用詞**：是否過濾「的」「是」「有」?
- [ ] **相關性**：是否排除無關詞彙（e.g., 代詞)?

## 故障排除

### 問題 1：關鍵詞陣列為空 []

**原因**：
- 搜尋結果中沒有文本內容
- 選擇器錯誤，無法提取文本

**解決方案**：
```typescript
// 在 searchGemini 等函數中增加調試日誌
const responseText = await page.evaluate(...);
console.log('Response text length:', responseText.length);
console.log('First 200 chars:', responseText.slice(0, 200));
```

### 問題 2：提取的關鍵詞與搜尋詞無關

**原因**：
- 中文斷詞算法不夠精確
- 未正確過濾停用詞

**解決方案**：增強 `extractKeywords()` 函數中的中文分詞邏輯
```typescript
// 考慮引入簡單的中文詞庫
const commonStopwords = ['的', '是', '有', '和', '與', '在', '到', '了', '去', '來', '被', '把', '給', ...];
const isStopword = (word) => commonStopwords.includes(word);
```

### 問題 3：不同品牌的關鍵詞重複過多

**原因**：
- 不同搜尋詞涵蓋相同主題
- 提取策略過於寬泛

**解決方案**：針對重複的關鍵詞，考慮：
- 統計詞頻（TF-IDF）
- 建立詞彙層級（e.g., 「海膽」是 「日本海膽」的父類)
- 按相關度排序而非字母順序

## 下一代功能預覽

### 1. 關鍵詞叢集 (Keyword Clustering)

```
主題 1：「日本進口」
  ├─ 日本海膽
  ├─ 北海道
  ├─ 日本進口
  └─ 日本漁協

主題 2：「物流技術」
  ├─ 冷鏈配送
  ├─ 冷鏈物流
  ├─ 24小時配送
  └─ 速遞服務
```

### 2. 競品差距分析 (Competitive Gap Matrix)

```
        稻荷  海膽速遞  新濠  望廈  嘉湖
日本進口  ✓✓✓   ✓    ✗    ✗    ✗
物流技術  ✓✓    ✓✓✓   ✓    ✗    ✗
品質認證  ✓✓    ✓    ✓    ✗    ✗
```

### 3. 時間序列追蹤

```
2026-04-11: 稻荷「日本海膽」在 Gemini 出現 5 次
2026-04-12: 稻荷「日本海膽」在 Gemini 出現 7 次 (+40%)
2026-04-13: 稻荷「日本海膽」在 Gemini 出現 8 次 (+14%)
```

---

**文件版本**: 1.0.0  
**最後更新**: 2026-04-11  
**作者**: CloudPipe AI 團隊
