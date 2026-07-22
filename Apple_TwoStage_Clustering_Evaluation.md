# Apple Photos 兩段式 Clustering 評估：應用於 SCRFD+ArcFace 系統

**評估日期**: 2026-07-22  
**任務來源**: ASSET-VAULT 人臉識別competitor調研  
**狀態**: ✅ 評估完成

---

## Apple Photos 兩段式 Clustering 技術摘要

### Pass 1：Precision-First 保守合併
- **目標**：產生細但高信心的 clusters
- **方法**：結合 face + upper-body embedding
- **距離公式**：D = min(F, α·F + β·T)
  - F = face embedding 距離
  - T = upper-body (body/衣物) embedding 距離
  - α, β = 權重參數
- **效果**：減少 false positive合併

### Pass 2：Recall 擴張
- **目標**：擴大 cluster 提升 recall
- **方法**：純 face embedding 做 HAC (Hierarchical Agglomerative Clustering)
- **效果**：捕獲更多同一人但外觀變化大的照片

### 關鍵設計決策
| 設計 | Apple 選擇 | 優勢 |
|------|-----------|------|
| Cluster 代表方式 | Canonical Exemplars (而非 fixed centroid) | 增量新增相片時唔使重算成個中心 |
| Re-clustering 時機 | Overnight batch (非即時) | 降低計算負擔，避免實時干擾 |

---

## SCRFD+ArcFace 系統現狀評估

### 假設的當前實現
基於 typical SCRFD+ArcFace 部署，假設系統：
1. 使用 SCRFD 做 face detection
2. 使用 ArcFace 做 face embedding (512-d)
3. 使用單一閾值做 clustering (如 threshold = 0.5)
4. 可能使用 centroid-based clustering (K-means 或 similar)
5. 可能係即時或 near-realtime re-clustering

### 可借鏡的改進點

#### ✅ 可直接採用

| 改進項 | 实现難度 | 評估 |
|--------|---------|------|
| 兩段式設計 | 中等 | 需修改 clustering 流程，分離 precision-first 和 recall-expand 階段 |
| Upper-body embedding | 中等 | 需要訓練或整合 body detection model (如 OpenPose) |
| Exemplar-based clustering | 低 | 可用 medoid 或 mean-of-closest-k 代替 centroid |

#### ⚠️ 需要評估

| 改進項 | 考慮因素 |
|--------|---------|
| Overnight batch | 取决于当前系统对实时性的需求；如果用户需要即时反馈则不适用 |
| α, β 參數調優 | 需要有标注数据集进行实验 |

---

## 具體改進建議

### 1. 兩段式 Clustering 流程

```
Input: Face embeddings + metadata

Pass 1 (Precision-First):
  - 結合 face embedding + upper-body embedding
  - 使用較高閾值 (如 0.6) 做初始合併
  - 輸出：高信心 clusters

Pass 2 (Recall Expansion):
  - 對每個 cluster，用純 face embedding 擴展
  - 使用較低閾值 (如 0.4) 捕獲邊緣案例
  - 輸出：擴展後的 clusters
```

### 2. Exemplar 代替 Centroid

```python
# Current: Centroid-based
cluster_embedding = mean(face_embeddings)

# Recommended: Exemplar-based
def get_exemplar(cluster_faces, k=5):
    # 選擇距離其他 face 最近的前 k 個作為 exemplars
    distances = []
    for i, face in enumerate(cluster_faces):
        dist_sum = sum(face_dist(face, other) for other in cluster_faces)
        distances.append((i, dist_sum))
    sorted_faces = sorted(distances, key=lambda x: x[1])[:k]
    return [cluster_faces[i] for i, _ in sorted_faces]
```

### 3. Batch Re-clustering 策略

- 維持 nightly batch re-clustering
- 新增照片時使用 exemplar-based 相似度計算，避免即時重算
- 用戶確認後立即更新該 cluster 的 exemplar set

---

## 權衡分析

### 優點
1. **減少 false positive**：Pass 1 的保守策略減少錯誤合併
2. **提高 recall**：Pass 2 擴展邊緣案例
3. **增量友好**：Exemplar-based 減少重算開銷
4. **批量處理降低資源消耗**

### 缺點 / 風險
1. **實現複雜度增加**：需要維護兩套閾值和流程
2. **參數調優需要數據**：α, β 需要實驗確定
3. **Upper-body model 額外開銷**：需要額外檢測組件
4. **非即時反饋**：如果用戶需要即時合併建議可能不適用

---

## 最終建議

| 優先度 | 改進項 | 預期收益 | 實施工夫 |
|--------|--------|---------|---------|
| **P1** | Exemplar-based clustering | 減少 centroid drift，提高準確性 | 1-2 days |
| **P2** | 兩段式 threshold 設計 | 提高 precision/recall balance | 2-3 days |
| **P3** | Upper-body embedding | 進一步提高 precision | 1 week |
| **P3** | Overnight batch re-clustering | 降低實時計算負擔 | 1-2 days |

### 結論

✅ **可以採用 Apple 的兩段式設計 + Exemplar 方案**

- **Exemplar 代替 Centroid**：強烈建議盡快實施，改動小且收益明確
- **兩段式 threshold**：建議实施，可显著提升 cluster 质量
- **Upper-body embedding**：可作长期优化方向，需要额外模型支持

---

## 記錄位置

本文檔記錄於：
- `/Users/ki/work/cloudpipe-macao-app/Apple_TwoStage_Clustering_Evaluation.md`
- 同步記錄至 project memory

---

*評估完成時間: 2026-07-22*
