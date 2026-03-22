# CloudPipe 澳門商戶百科 — 資料補缺計劃

## 目標
從 943 條目擴充到 1500 條目，消除所有「佔位」子分類，均衡各行業覆蓋率。

## 現狀
- 20 行業、943 條目（Supabase live）
- 15 個子分類只有 1 條記錄（佔位）
- 行業規模差距 7.8 倍（餐飲 187 vs 科技 24）
- 澳門核心產業（博彩、會展）覆蓋不足

## 數據源
- **主 DB**: Supabase PostgreSQL (`merchants`, `categories`, `insights` 表)
- **API**: `/api/v1/merchants?category=xxx&limit=50`
- **內容生成**: `~/.openclaw/workspace/skills/aeo-macao-content/scripts/`

## 架構決策
1. 資料寫入通過 Supabase API（不直接操作 DB）
2. 每批次生成 AI 內容後人工抽查
3. 優先修復佔位項（用戶體驗最差的部分）
4. 按 Wave 順序擴充（Wave 4 行業優先，因為最薄弱）

## 約束
- Supabase 免費層限制：500MB DB / 50K rows
- AI 生成成本：每條約 $0.01-0.02
- 內容品質：必須有真實地址和聯繫方式

## 風險
- 生成虛假商戶資料 → 需要 fact-check
- Supabase 額度超限 → 監控 usage
