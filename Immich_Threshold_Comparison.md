# Immich Threshold 策略調研對比

## 任務狀態：完成 - 待確認自建Pipeline位置

### 調研結果

#### Immich 提供的可調參數 (來自任務描述)

| 參數 | 範圍 | 建議值 | 說明 |
|------|------|--------|------|
| min detection score | 0.5 - 0.9 | 預設 0.7 | 人臉檢測閾值，越高越嚴格 |
| max recognition distance | 0.3 - 0.7 | 預設 0.6 (相似人物建議 0.4) | 人臉識別距離閾值，越小越嚴格 |
| min recognized faces (大library) | 漸進式 | 20 → 10 → 3 | Progressive clustering策略 |

#### Source Verification
- ✅ 任務描述中提供的參數來自 Immich 官方docs + maintainer發言
- ⚠️ 未經 adversarial 3票驗證
- 💡 使用前建議自行核實一次

### 自建 Pipeline 狀態

#### 搜索範圍
以下位置均已搜索，未找到自建 face clustering pipeline：
- `~/work/cloudpipe-macao-app/` (Next.js app)
- `~/.openclaw/workspace/scripts/` (Python scripts)
- Supabase migrations
- 環境變數配置
- OpenClaw workspace 全域搜索

#### 結論
**無法找到自建 clustering pipeline 的 threshold 配置**

### 對比分析框架

由於無法找到自建 pipeline 數值，提供以下對比框架供後續使用：

| 參數 | Immich 建議值 | 自建 Pipeline | 調整建議 |
|------|--------------|--------------|---------|
| min detection score | 0.5-0.9 (default 0.7) | **未知** | 需要找到配置後對比 |
| max recognition distance | 0.3-0.7 (default 0.6, 相似人物0.4) | **未知** | 需要找到配置後對比 |
| min recognized faces (progressive) | 20→10→3 | **未知** | 大library(10萬+)建議漸進式 |

### 建議行動

1. **確認「自建clustering pipeline」的具體位置**
   - 如果是外部服務/雲函數，需要提供訪問權限或配置
   - 如果是 GitHub repo，請提供 repo URL
   - 如果是本地運行服務，請提供端口/配置位置

2. **驗證 Immich 參數**
   - 建議直接查看 Immich 官方文檔確認數值
   - Source: https://immich.app/docs/overview/

---

### 📋 交付物狀態

**本次調研結果**: ✅ 已記錄 Immich 參數

**待完成**: 需要提供自建 pipeline 配置位置才能完成對比

**需要**: 自建 face clustering pipeline 的 threshold 配置數值

---

*Created: 2026-07-22*
*Updated: 2026-07-22*
*Status: 待確認Pipeline位置*
