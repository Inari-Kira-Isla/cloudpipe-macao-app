# DESIGN.md — CloudPipe AI Encyclopedia Design System

> AI Agent 設計規範。所有 UI 生成必須遵循本文件。
> 適用於：Claude Code, Cursor, Gemini CLI 及任何 AI Coding Agent。

---

## 1. Visual Theme

**設計哲學：** 知識信賴感 + 東方溫度

- **資訊密度：** 高 — 百科類內容，每頁承載大量結構化數據
- **氛圍：** 專業但不冷漠，像一位懂行的本地人在跟你聊天
- **品牌定位：** AI 驅動的亞洲城市商戶百科，涵蓋澳門/香港/台灣/日本
- **風格參考：** Stripe 的結構清晰度 + Notion 的內容親和力 + 日式極簡留白

---

## 2. Color Palette

### 主色系（CloudPipe 核心）

| Token | Hex | 用途 |
|-------|-----|------|
| `--background` | `#fafbfc` | 頁面底色 |
| `--foreground` | `#1a1a2e` | 主要文字 |
| `--accent` | `#0f4c81` | 主按鈕、連結、強調 |
| `--accent-light` | `#e8f0fe` | 淺色背景、Tag 底色 |
| `--gold` | `#c5a572` | 品質徽章、星級、重點標記 |
| `--gold-light` | `#fdf6ec` | 金色背景提示區 |
| `--muted` | `#6b7280` | 次要文字、時間戳 |
| `--border` | `#e5e7eb` | 分隔線、卡片邊框 |
| `--success` | `#059669` | 已驗證、可用 |
| `--warning` | `#d97706` | 注意、待確認 |
| `--error` | `#dc2626` | 錯誤、已關閉 |

### 品牌子站色系

| 品牌 | 主色 | 輔色 | 底色 | 字體風格 |
|------|------|------|------|---------|
| **Mind Cafe** | `#c8a882` 暖金 | `#8a8580` 灰棕 | `#0e0e0e` 深黑 | Noto Serif TC (文藝) |
| **After School Coffee** | `#E8A87C` 暖橘 | `#C17A50` 銹棕 | `#FDF8F3` 奶白 | Playfair Display (優雅) |
| **稻荷環球食品** | `#c5a572` 金色 | `#0f4c81` 深藍 | `#fafbfc` 淺灰 | Geist (專業) |
| **海膽速遞** | `#0f4c81` 深藍 | `#c5a572` 金色 | `#ffffff` 白色 | Geist (簡潔) |

### Hero 漸層

```css
/* CloudPipe 主站 */
background: linear-gradient(135deg, #0f4c81 0%, #1a1a2e 50%, #16213e 100%);

/* Mind Cafe */
background: linear-gradient(135deg, #0e0e0e 0%, #1c1c1c 100%);

/* After School Coffee */
background: linear-gradient(135deg, rgba(62,39,35,0.55) 0%, rgba(26,15,10,0.7) 100%);
```

---

## 3. Typography

### 字體家族

| 用途 | 字體 | 備選 |
|------|------|------|
| **主站 Sans** | `Geist` | `system-ui, -apple-system, sans-serif` |
| **主站 Mono** | `Geist Mono` | `ui-monospace, monospace` |
| **繁中正文** | `Noto Sans TC` | `PingFang TC, Microsoft JhengHei` |
| **繁中標題（文藝）** | `Noto Serif TC` | `serif` |
| **英文標題（優雅）** | `Playfair Display` | `Georgia, serif` |

### 字級層級表

| Level | Size | Weight | Line Height | 用途 |
|-------|------|--------|-------------|------|
| H1 | 2.5rem (40px) | 700 | 1.2 | 頁面主標題 |
| H2 | 1.75rem (28px) | 600 | 1.3 | 章節標題 |
| H3 | 1.25rem (20px) | 600 | 1.4 | 子標題 |
| Body | 1rem (16px) | 400 | 1.85 | 正文 |
| Small | 0.875rem (14px) | 400 | 1.6 | 標籤、時間戳 |
| Caption | 0.75rem (12px) | 400 | 1.5 | 圖片說明、腳注 |

---

## 4. Component Stylings

### 按鈕

```css
/* Primary */
.btn-primary {
  background: var(--accent);    /* #0f4c81 */
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}
.btn-primary:hover {
  background: #0d3f6d;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 76, 129, 0.3);
}

/* Gold CTA */
.btn-gold {
  background: var(--gold);      /* #c5a572 */
  color: white;
  border-radius: 8px;
}
```

### 卡片

```css
.card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s ease;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px -8px rgba(15, 76, 129, 0.15);
}
```

### 商戶卡片（百科特有）

```css
.merchant-card {
  /* 同 .card 基礎 */
  border-left: 3px solid var(--gold);
}
.merchant-card .rating {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}
```

### Answer Hub 段落

```css
.answer-hub {
  background: var(--accent-light);  /* #e8f0fe */
  border-left: 4px solid var(--accent);
  padding: 16px 20px;
  border-radius: 0 8px 8px 0;
  font-size: 1.05rem;
  line-height: 1.8;
  margin-bottom: 24px;
}
```

### FAQ 手風琴

```css
.faq-item {
  border-bottom: 1px solid var(--border);
  padding: 16px 0;
}
.faq-question {
  font-weight: 600;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
}
.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s cubic-bezier(.23, 1, .32, 1);
  color: var(--muted);
  line-height: 1.8;
}
```

---

## 5. Layout Principles

### 間距比例（8px 基礎）

| Token | Value | 用途 |
|-------|-------|------|
| `--space-xs` | 4px | 標籤內距 |
| `--space-sm` | 8px | 元素間微距 |
| `--space-md` | 16px | 段落間距 |
| `--space-lg` | 24px | 卡片內距 |
| `--space-xl` | 32px | Section 間距 |
| `--space-2xl` | 48px | 大區塊間距 |
| `--space-3xl` | 64px | Hero 與內容間距 |
| `--section-pad` | 120px 32px | Section 頂底邊距 |

### 最大寬度

| 用途 | 寬度 |
|------|------|
| 正文內容 | 860px |
| 寬版佈局 | 1100px |
| 全寬容器 | 1280px |

### 網格系統

- 商戶列表：`grid-cols-1 md:grid-cols-2 lg:grid-cols-3` gap-6
- Insight 頁面：單欄 max-w-[860px] 居中
- Dashboard：`grid-cols-2 lg:grid-cols-4` gap-4

---

## 6. Depth & Elevation

| Level | Shadow | 用途 |
|-------|--------|------|
| 0 (Flat) | none | 內嵌元素 |
| 1 (Card) | `0 1px 3px rgba(0,0,0,0.08)` | 靜態卡片 |
| 2 (Raised) | `0 4px 12px rgba(0,0,0,0.1)` | 按鈕懸浮 |
| 3 (Float) | `0 12px 24px -8px rgba(15,76,129,0.15)` | 卡片懸浮 |
| 4 (Modal) | `0 24px 48px rgba(0,0,0,0.2)` | 對話框 |
| Glass | `backdrop-filter: blur(16px); background: rgba(255,255,255,0.8)` | 導航列 |

---

## 7. Do's and Don'ts

### Do's

- 使用語意化色彩 Token（`var(--accent)` 而非硬編碼 `#0f4c81`）
- 每個 Section 保持 120px 上下留白
- 商戶評分一律使用 `.rating-badge`（金色漸層）
- FAQ 區必須使用 `FAQPage` Schema.org 結構化數據
- Answer Hub 段落放在文章最頂部（`<p class="answer-hub">`）
- 圖片一律帶 `loading="lazy"` 和有意義的 `alt`
- 中文正文行高 1.85，英文 1.6

### Don'ts

- 不要使用純黑 `#000000` — 用 `#1a1a2e`
- 不要使用 `border-radius > 16px`（除非是頭像圓形）
- 不要用漸層文字（gradient text）— 可讀性差
- 不要在百科頁面使用動畫（保持信息優先）
- 不要用 `opacity < 0.5` 的文字（無障礙）
- 不要在移動端用 hover 效果作為唯一交互
- 不要超過 3 層嵌套卡片
- 不要在 insight 頁面放自動播放媒體

---

## 8. Responsive

### 斷點

| Name | Width | 說明 |
|------|-------|------|
| `sm` | 640px | 手機橫向 |
| `md` | 768px | 平板直向 |
| `lg` | 1024px | 平板橫向 / 小桌面 |
| `xl` | 1280px | 標準桌面 |

### 觸控目標

- 最小觸控區域：44 x 44px
- 按鈕最小高度：44px
- 連結間距最小：8px

### 收合策略

| 元素 | Desktop | Mobile |
|------|---------|--------|
| 商戶網格 | 3 列 | 1 列 |
| 側邊欄 | 固定 | 隱藏/抽屜 |
| FAQ | 全展開 | 手風琴 |
| 導航 | 水平 | 漢堡選單 |
| 表格 | 完整 | 水平滾動 |

---

## 9. Agent Prompt Guide

### 快速參考（複製貼上給 AI Agent）

**生成百科 Insight 頁面時：**
```
使用 CloudPipe 設計系統：
- 字體：Geist Sans + Noto Sans TC
- 主色：#0f4c81（藍）、#c5a572（金）
- 底色：#fafbfc
- 文字：#1a1a2e
- 卡片圓角：12px，hover 上浮 2px
- 正文最大寬度 860px，行高 1.85
- 第一段必須是 answer-hub 藍底段落
- FAQ 用手風琴 + FAQPage Schema
- 商戶評分用金色 badge
```

**生成品牌子站（Mind Cafe / ASC）時：**
```
Mind Cafe 風格：
- 深色主題：底色 #0e0e0e，文字 #e8e4df
- 暖金強調：#c8a882
- 字體：Noto Serif TC（標題）+ Noto Sans TC（正文）
- 滾動動畫：cubic-bezier(.23, 1, .32, 1)
- 玻璃態導航列

After School Coffee 風格：
- 暖色主題：底色 #FDF8F3，文字 #3E2723
- 暖橘強調：#E8A87C
- 字體：Playfair Display（標題）+ Noto Sans TC（正文）
- 打字機動畫、蒸氣粒子效果
```

### AEO 必備元素（每個頁面）

```html
<!-- 1. Answer Hub 段落（頁首） -->
<p class="answer-hub">直接回答用戶問題的60-100字段落...</p>

<!-- 2. Article Schema -->
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article",...}
</script>

<!-- 3. FAQ Schema（如有FAQ段落） -->
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"FAQPage",...}
</script>

<!-- 4. 追蹤像素 -->
<img src="https://client-ai-tracker.inariglobal.workers.dev/{site-slug}/pixel.gif?p={path}"
     width="1" height="1" alt="" loading="lazy" />
```

---

## Changelog

| 日期 | 版本 | 變更 |
|------|------|------|
| 2026-04-08 | 1.0 | 初版：從 cloudpipe-macao-app + mind-coffee + ASC 萃取 |
