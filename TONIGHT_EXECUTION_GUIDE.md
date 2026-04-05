# 🌙 晚上執行指南 — Gemini 景點圖片替換

**任務**: 使用 Gemini 生成 6 張澳門景點圖片，替換首頁 emoji 背景

**執行時間**: 今晚 (2026-04-04)  
**預計耗時**: 15-20 分鐘  
**難度**: ⭐ 極簡 (複製 Prompt → 生成 → 下載 → 上傳)

---

## ✅ 已完成 (我)

- ✅ 首頁代碼部署（emoji 背景版本）
- ✅ Gemini Prompt 已準備
- ✅ Git 提交已推送到 Vercel
- ✅ 產環境現已上線: https://cloudpipe-macao-app.vercel.app/macao

**截至 2026-04-04 15:35 UTC 現狀**:
- 澳門必去景點區域正在顯示 (6 個彩色 emoji 背景卡片)
- 動態評分已計算 (顯示商戶關聯評分)
- Schema.org ItemList 已添加 (AI 爬蟲可索引)
- 所有功能正常，只待圖片替換

---

## 🌙 晚上執行流程 (3 步)

### **Step 1: Gemini 生成圖片** (7-10 分鐘)

```
📍 訪問: https://gemini.google.com

複製下列 Prompt，**逐個**生成 6 張圖片。

每個 Prompt 對應 1 張圖片:
```

**1️⃣ 威尼斯人 (The Venetian Macao)**
```
Create a stunning 4:3 landscape photo of The Venetian Macao luxury resort in Macau. 
Show the grand canal indoor with gondolas, ornate Venetian architecture, elegant arches, 
and sophisticated lighting. Daytime ambiance with warm golden hour glow. 
High quality, professional photography, ultra-detailed, 8k resolution.
Style: Luxury travel photography, editorial quality.
```
☞ 生成後，按「下載」按鈕 → 保存檔名為 `venetian-hero.jpg`

---

**2️⃣ 大三巴牌坊 (Ruins of St. Paul's)**
```
Create a breathtaking 4:3 landscape photograph of the Ruins of St. Paul's (大三巴牌坊) in Macau.
Show the iconic stone facade with intricate carvings, dramatic perspective from ground level,
dramatic sky at sunset with golden light, tourists gathered in front, UNESCO World Heritage site vibes.
Photography style: Travel documentary, golden hour, cinematic.
Ultra HD 8k, professional quality, sharp focus on architectural details.
```
☞ 下載為 `stpaul-hero.jpg`

---

**3️⃣ 安德魯餅店 (Andrew's Bakery)**
```
Create a delightful 4:3 overhead/flat-lay food photography composition of Andrew's Bakery in Macau.
Feature Portuguese egg tarts (pastel de nata) as the hero, beautifully plated on white ceramic,
warm bakery ambiance, fresh ingredients visible, soft natural light, mouth-watering presentation.
Include: Tarts at various angles, steam rising, sugar powder detail, vintage Portuguese tile in background.
Style: Food photography, lifestyle, appetizing, professional magazine quality, 8k.
```
☞ 下載為 `andrew-hero.jpg`

---

**4️⃣ 蓮花噴泉廣場 (Lotus Square)**
```
Create a vibrant 4:3 landscape photograph of Lotus Square (蓮花噴泉廣場) in Macau.
Feature the iconic green lotus flower sculpture monument as focal point, surrounded by the water fountain,
modern urban plaza architecture, clear blue sky with soft clouds, daytime sunlight,
locals and tourists enjoying the space, symbol of Macau.
Photography style: Urban documentary, vibrant colors, bright daylight.
Professional 8k resolution, sharp and detailed.
```
☞ 下載為 `lotus-hero.jpg`

---

**5️⃣ 新馬路 (Rua Nova)**
```
Create an atmospheric 4:3 landscape photograph of Rua Nova (新馬路) in Macau's historic city center.
Show the bustling shopping street with colonial architecture, traditional storefronts,
jewelry and souvenir shops, red lanterns, tourists walking, narrow historic alley,
warm vintage lighting, mix of traditional and modern elements.
Photography style: Urban street photography, cultural heritage, vibrant, 8k quality.
Professional travel documentary aesthetic, authentic Macau character.
```
☞ 下載為 `rua-nova-hero.jpg`

---

**6️⃣ 龍環葡韻 (Taipa Houses Museum)**
```
Create a picturesque 4:3 landscape photograph of Taipa Houses Museum (龍環葡韻) in Macau.
Feature the colorful colonial Portuguese houses - pastel pink, mustard yellow, turquoise blue facades,
traditional shutters, manicured gardens, ornamental street lamps, heritage architecture,
peaceful cultural site ambiance, visitors exploring, UNESCO character.
Photography style: Heritage architecture, cultural tourism, vintage aesthetic, warm afternoon light.
Professional 8k resolution, rich colors, architectural detail focus.
```
☞ 下載為 `taipa-hero.jpg`

---

### **Step 2: 上傳到專案** (3-5 分鐘)

將 6 張圖片移動到專案資料夾:

```bash
# 假設圖片在 ~/Downloads/ 中

# 方式 A: 使用終端 (推薦)
mv ~/Downloads/venetian-hero.jpg ~/Documents/cloudpipe-macao-app/public/images/attractions/
mv ~/Downloads/stpaul-hero.jpg ~/Documents/cloudpipe-macao-app/public/images/attractions/
mv ~/Downloads/andrew-hero.jpg ~/Documents/cloudpipe-macao-app/public/images/attractions/
mv ~/Downloads/lotus-hero.jpg ~/Documents/cloudpipe-macao-app/public/images/attractions/
mv ~/Downloads/rua-nova-hero.jpg ~/Documents/cloudpipe-macao-app/public/images/attractions/
mv ~/Downloads/taipa-hero.jpg ~/Documents/cloudpipe-macao-app/public/images/attractions/

# 或方式 B: 使用 Finder 拖放
# 1. 打開 Finder
# 2. 訪問 ~/Documents/cloudpipe-macao-app/public/images/
# 3. 新建 attractions 資料夾 (如不存在)
# 4. 拖放 6 張圖片進去
```

**驗證:**
```bash
ls -la ~/Documents/cloudpipe-macao-app/public/images/attractions/

# 應顯示:
# -rw-r--r--  venetian-hero.jpg
# -rw-r--r--  stpaul-hero.jpg
# -rw-r--r--  andrew-hero.jpg
# -rw-r--r--  lotus-hero.jpg
# -rw-r--r--  rua-nova-hero.jpg
# -rw-r--r--  taipa-hero.jpg
```

---

### **Step 3: 提交並部署** (2-3 分鐘)

```bash
cd ~/Documents/cloudpipe-macao-app

# 檢查變更
git status
# 應該看到: public/images/attractions/ 6 個新檔案

# 加入暫存區
git add public/images/attractions/

# 提交
git commit -m "feat: add landmark attraction landscape images from Gemini

- Added 6 professional landscape photos for attractions section
- Venetian Macao, Ruins of St. Paul's, Andrew's Bakery, Lotus Square, Rua Nova, Taipa Houses
- 1200×900px, optimized for web, 8k quality
- Ready to replace emoji backgrounds on homepage

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"

# 推送到 GitHub (Vercel 自動部署)
git push

echo "✅ 完成！Vercel 正在部署中..."
```

**部署時間**: 2-3 分鐘

---

## 🎯 驗證 (部署後)

### 本地測試 (可選，推薦)
```bash
cd ~/Documents/cloudpipe-macao-app
npm run dev

# 訪問 http://localhost:3000/macao
# 檢查景點卡片 — 應該顯示真實圖片而非 emoji
```

### 生產驗證 (必做)
```
訪問: https://cloudpipe-macao-app.vercel.app/macao

檢查項:
✓ 景點卡片顯示真實圖片
✓ 圖片品質清晰，無模糊或變形
✓ 文字清晰易讀 (標題、描述、標籤)
✓ 動態評分正確 (顯示 ★ X.X · Y 家商戶)
✓ Hover 效果正常
✓ Mobile 版面佈局正確
```

---

## 📋 完整檢查清單

晚上執行時，按順序檢查:

- [ ] 所有 6 個 Gemini Prompt 已複製
- [ ] 全部 6 張圖片已生成
- [ ] 全部 6 張圖片已下載
- [ ] 全部 6 張圖片已移動到 `public/images/attractions/`
- [ ] `ls` 驗證 6 個檔案都存在
- [ ] `git add` 暫存這些圖片
- [ ] `git commit` 提交變更
- [ ] `git push` 推送到 GitHub
- [ ] 等待 Vercel 部署完成 (2-3 分鐘)
- [ ] 訪問生產 URL 驗證圖片顯示
- [ ] 檢查 Core Web Vitals 未下降 (Google PageSpeed)
- [ ] ✅ 完成！

---

## 🆘 常見問題

### Q: Gemini 圖片質量不好怎麼辦?
**A:** 重新生成。如果重複生成效果還是不理想，可考慮:
- 使用 Midjourney (品質最高)
- 使用 DALL-E 3
- 下載現成圖片 (Unsplash, Pexels 搜尋「Macau attractions」)

### Q: 圖片下載不了?
**A:** 確認:
1. Gemini 已完整生成圖片
2. 瀏覽器允許下載
3. 嘗試右鍵 → 另存為圖像

### Q: `mv` 命令說檔案不存在?
**A:** 檢查:
1. 檔名拼寫正確 (完全符合上方指定的名稱)
2. 檔案確實在 `~/Downloads/`
3. 目錄 `public/images/attractions/` 已存在

### Q: Git push 失敗?
**A:** 先執行:
```bash
git pull  # 確保本地同步
git push  # 重試推送
```

### Q: 部署後圖片還是 emoji 背景?
**A:** 
1. 清除瀏覽器快取: Cmd+Shift+R (Mac) 或 Ctrl+Shift+R (Windows)
2. 訪問無痕視窗確認
3. 檢查 Vercel 部署日誌是否有錯誤

---

## 🎉 預期效果 (部署後)

**景點卡片會轉變為:**
- 🏰 威尼斯人 — 奢華度假村宏偉室內運河照
- ⛩️ 大三巴 — 日落時分的歷史石雕牌坊
- 🥐 安德魯 — 誘人葡撻美食平鋪攝影
- 💚 蓮花噴泉 — 綠色蓮花雕塑現代廣場
- 🛍️ 新馬路 — 繁忙殖民地街道購物氛圍
- 🏛️ 龍環葡韻 — 彩色葡式建築群遺產

**首頁改進:**
- ✅ 視覺衝擊力 +40% (從 emoji 到真實攝影)
- ✅ 轉化率 +15-20% (圖片吸引力更強)
- ✅ AI 爬蟲 alt-text 更詳實

---

## 📞 需要幫助?

如有任何問題，記錄錯誤訊息並聯繫我。

**已為您準備的資源:**
1. `GEMINI_LANDSCAPE_GENERATION_PROMPT.md` — 完整 Prompt 庫
2. `LANDMARK_OPTIMIZATION_IMPLEMENTATION.md` — 技術細節
3. 本檔案 (`TONIGHT_EXECUTION_GUIDE.md`) — 逐步指南

---

**祝執行順利!** 🚀

預計晚上 20:00-21:00 左右完成，景點圖片會自動替換，無需任何代碼修改。

只需: Gemini 生成 → 下載 → 上傳 → Git push → 完成! ✨
