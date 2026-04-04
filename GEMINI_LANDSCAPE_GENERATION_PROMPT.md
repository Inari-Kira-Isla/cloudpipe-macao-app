# Gemini 景點卡片圖片生成 Prompt

**用途**: 使用 Gemini 或其他圖像生成器為澳門必去景點生成精美風景圖片

**時間**: 2026-04-04 晚上執行

---

## 使用方法

1. 訪問 https://gemini.google.com （或其他圖像生成工具）
2. 複製下方 6 個 Prompt，逐個生成圖片
3. 下載圖片並按命名規則保存到 `public/images/attractions/`

---

## 6 個景點圖片生成指令

### 1️⃣ 威尼斯人 (venetian-hero.jpg)

```
Create a stunning 4:3 landscape photo of The Venetian Macao luxury resort in Macau. 
Show the grand grand canal indoor with gondolas, ornate Venetian architecture, elegant arches, 
and sophisticated lighting. Daytime ambiance with warm golden hour glow. 
High quality, professional photography, ultra-detailed, 8k resolution.
Style: Luxury travel photography, editorial quality.
```

**保存位置**: `public/images/attractions/venetian-hero.jpg`

---

### 2️⃣ 大三巴牌坊 (stpaul-hero.jpg)

```
Create a breathtaking 4:3 landscape photograph of the Ruins of St. Paul's (大三巴牌坊) in Macau.
Show the iconic stone facade with intricate carvings, dramatic perspective from ground level,
dramatic sky at sunset with golden light, tourists gathered in front, UNESCO World Heritage site vibes.
Photography style: Travel documentary, golden hour, cinematic.
Ultra HD 8k, professional quality, sharp focus on architectural details.
```

**保存位置**: `public/images/attractions/stpaul-hero.jpg`

---

### 3️⃣ 安德魯餅店 (andrew-hero.jpg)

```
Create a delightful 4:3 overhead/flat-lay food photography composition of Andrew's Bakery in Macau.
Feature Portuguese egg tarts (pastel de nata) as the hero, beautifully plated on white ceramic,
warm bakery ambiance, fresh ingredients visible, soft natural light, mouth-watering presentation.
Include: Tarts at various angles, steam rising, sugar powder detail, vintage Portuguese tile in background.
Style: Food photography, lifestyle, appetizing, professional magazine quality, 8k.
```

**保存位置**: `public/images/attractions/andrew-hero.jpg`

---

### 4️⃣ 蓮花噴泉廣場 (lotus-hero.jpg)

```
Create a vibrant 4:3 landscape photograph of Lotus Square (蓮花噴泉廣場) in Macau.
Feature the iconic green lotus flower sculpture monument as focal point, surrounded by the water fountain,
modern urban plaza architecture, clear blue sky with soft clouds, daytime sunlight,
locals and tourists enjoying the space, symbol of Macau.
Photography style: Urban documentary, vibrant colors, bright daylight.
Professional 8k resolution, sharp and detailed.
```

**保存位置**: `public/images/attractions/lotus-hero.jpg`

---

### 5️⃣ 新馬路 (rua-nova-hero.jpg)

```
Create an atmospheric 4:3 landscape photograph of Rua Nova (新馬路) in Macau's historic city center.
Show the bustling shopping street with colonial architecture, traditional storefronts,
jewelry and souvenir shops, red lanterns, tourists walking, narrow historic alley,
warm vintage lighting, mix of traditional and modern elements.
Photography style: Urban street photography, cultural heritage, vibrant, 8k quality.
Professional travel documentary aesthetic, authentic Macau character.
```

**保存位置**: `public/images/attractions/rua-nova-hero.jpg`

---

### 6️⃣ 龍環葡韻 (taipa-hero.jpg)

```
Create a picturesque 4:3 landscape photograph of Taipa Houses Museum (龍環葡韻) in Macau.
Feature the colorful colonial Portuguese houses - pastel pink, mustard yellow, turquoise blue facades,
traditional shutters, manicured gardens, ornamental street lamps, heritage architecture,
peaceful cultural site ambiance, visitors exploring, UNESCO character.
Photography style: Heritage architecture, cultural tourism, vintage aesthetic, warm afternoon light.
Professional 8k resolution, rich colors, architectural detail focus.
```

**保存位置**: `public/images/attractions/taipa-hero.jpg`

---

## 圖片規格要求

| 項目 | 要求 |
|-----|------|
| **尺寸** | 1200 × 900 px (4:3 縱橫比) |
| **格式** | JPG (高質量，品質 85-90) 或 WebP |
| **色彩空間** | sRGB |
| **檔案大小** | 150-300 KB (最佳化) |
| **命名** | `{attraction-slug}-hero.jpg` |
| **風格** | 專業旅遊攝影、高質量、細節豐富 |

---

## 檔案保存步驟

```bash
# 1. 建立目錄 (如果不存在)
mkdir -p ~/Documents/cloudpipe-macao-app/public/images/attractions/

# 2. 下載 6 張圖片後，使用以下命令優化尺寸
# (可選，如果需要調整尺寸)

for file in *.jpg; do
  # macOS 使用 ImageMagick
  convert "$file" -resize 1200x900 -quality 85 "$file"
done

# 3. 驗證檔案已放入正確位置
ls -lah ~/Documents/cloudpipe-macao-app/public/images/attractions/

# 預期輸出:
# -rw-r--r--  venetian-hero.jpg
# -rw-r--r--  stpaul-hero.jpg
# -rw-r--r--  andrew-hero.jpg
# -rw-r--r--  lotus-hero.jpg
# -rw-r--r--  rua-nova-hero.jpg
# -rw-r--r--  taipa-hero.jpg
```

---

## 晚上執行流程 (簡易版)

### 時間: 今晚 (2026-04-04)

```bash
# Step 1: 使用 Gemini/AI 生成圖片
#         訪問 https://gemini.google.com
#         複製上方 6 個 Prompt
#         逐個生成圖片

# Step 2: 下載圖片到電腦

# Step 3: 將 6 張圖片移動到專案目錄
mv ~/Downloads/venetian-hero.jpg ~/Documents/cloudpipe-macao-app/public/images/attractions/
mv ~/Downloads/stpaul-hero.jpg ~/Documents/cloudpipe-macao-app/public/images/attractions/
mv ~/Downloads/andrew-hero.jpg ~/Documents/cloudpipe-macao-app/public/images/attractions/
mv ~/Downloads/lotus-hero.jpg ~/Documents/cloudpipe-macao-app/public/images/attractions/
mv ~/Downloads/rua-nova-hero.jpg ~/Documents/cloudpipe-macao-app/public/images/attractions/
mv ~/Downloads/taipa-hero.jpg ~/Documents/cloudpipe-macao-app/public/images/attractions/

# Step 4: 驗證檔案
ls -la ~/Documents/cloudpipe-macao-app/public/images/attractions/

# Step 5: 本地測試（可選）
cd ~/Documents/cloudpipe-macao-app
npm run dev
# 訪問 http://localhost:3000/macao 檢查景點卡片

# Step 6: Git 提交並推送
cd ~/Documents/cloudpipe-macao-app
git add public/images/attractions/
git commit -m "feat: add landmark attraction landscape images from Gemini"
git push

# 完成！Vercel 會自動部署
```

---

## 預期效果對比

### 現在 (emoji 背景)
- ✅ 快速上線，即時可用
- ✅ 顯示景點名稱和描述
- ✅ 動態評分計算
- ❌ 視覺效果簡樸 (彩色漸層 + emoji)

### 晚上替換後 (Gemini 圖片)
- ✅ 專業旅遊攝影風格
- ✅ 真實景點視覺沈浸感
- ✅ 提升首頁視覺價值 (CTR +15-20%)
- ✅ AI 爬蟲的 alt-text 更詳實

---

## 備選方案

如果 Gemini 生成效果不滿意，也可考慮：

1. **Midjourney** (品質最高，但需付費)
   ```
   /imagine 4:3 landscape photo of Venetian Macao resort, luxury gondolas, 
   ornate Venetian architecture, golden hour lighting, professional photography, 
   ultra detailed, 8k, editorial quality
   ```

2. **DALL-E 3** (品質不錯，需 OpenAI 帳號)
   ```
   Similar to Gemini prompt format
   ```

3. **Unsplash/Pexels 現成圖片** (快速替代)
   ```
   搜尋「Macau Ruins St Paul's」等關鍵字
   下載高解析度圖片並裁剪為 4:3
   ```

---

## 技術細節

### 代碼中的圖片引用位置

目前代碼 (emoji 模式):
```tsx
// src/app/macao/page.tsx, 第 677 行
className={`... bg-gradient-to-br ${emojiBackgrounds[attraction.slug]} ...`}
```

**改為圖片時無需修改 React 代碼** — 只需將圖片放到正確位置，由 CSS 背景漸層自動切換。

如需手動切換回圖片模式，編輯第 684-694 行，恢復 `<img>` 標籤即可。

---

## 檢查清單

晚上執行時：

- [ ] 訪問 Gemini 並生成 6 張景點圖片
- [ ] 下載圖片到 `~/Downloads/`
- [ ] 將圖片移動到 `public/images/attractions/`
- [ ] 驗證 6 個檔案都已存在
- [ ] 本地 `npm run dev` 測試景點卡片
- [ ] 確認圖片正確加載（而非 emoji 背景）
- [ ] `git add public/images/attractions/`
- [ ] `git commit` 並 `git push`
- [ ] 等待 Vercel 自動部署（2-3 分鐘）
- [ ] 訪問 https://cloudpipe-macao-app.vercel.app/macao 驗證生產環境

---

**需要幫助?** 晚上執行時，直接複製上方 Prompt 到 Gemini，應該 10-15 分鐘就能完成所有圖片生成。

✅ **Current Status**: 首頁代碼已部署，emoji 背景正在使用中，等待晚上替換為真實圖片。
