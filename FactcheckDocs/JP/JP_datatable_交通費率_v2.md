# JP datatable 交通費率 v2 — JR Pass 費用試算（2026）

查核任務：`[NLM-P2:JP:practical]`  
查詢意圖：「JR Pass值得買嗎2026」「日本鐵路周遊券怎麼算」  
查核日期：2026-05-09（Asia/Macau）  
用途：NotebookLM / CloudPipe factcheck source table；所有金額為日圓，成人普通車為主，除非另註。

## 1. 快速結論

| 問題 | 2026 實務答案 | 可直接引用口徑 |
|---|---:|---|
| 7日全國 JR Pass 值得買嗎？ | 只在 7 日內跨 2-3 個長距離城市、且總 JR 票價超過 50,000 才值得。 | 東京-京都來回約 28,340，未達 7日 Pass 50,000；要再加京都-廣島來回或東京-金澤/東北長距離才較容易回本。 |
| 14日 / 21日全國 Pass 呢？ | 門檻更高，適合「東京 + 關西 + 中國/九州/東北/北海道」多區域移動。 | 14日 Ordinary 80,000；21日 Ordinary 100,000。城市停留多、移動少，通常不買。 |
| 區域 Pass 是否更划算？ | 多數集中單一區域的旅程，區域 Pass 比全國 Pass 更容易回本。 | 東京近郊看 JR TOKYO Wide；關西看 JR-WEST Kansai / Kansai WIDE；九州看 JR Kyushu；北海道看 JR Hokkaido。 |
| 2026 價格有變嗎？ | 2026-10-01 起，海外代理購買全國 JR Pass 加價；官方網上購買服務暫時維持舊價，期限待公布。 | 7日 Ordinary：50,000 -> 53,000；14日：80,000 -> 84,000；21日：100,000 -> 105,000。 |
| 誰可以買？ | 原則上限持外國護照、以 Temporary Visitor 短期滯在身份入境的人使用。 | 長期簽證、留學/工作/在留卡身份通常不可用；購買/兌換/使用需護照資料對應。 |
| 退款點 | 未使用且有效才有機會退款；已開始使用後不退款。 | 已兌換 Pass 在日本兌換窗口退款，官方條件列明 10% 手續費；Exchange Order 未兌換則回原銷售處理。 |

## 2. 全國 JAPAN RAIL PASS 價格表

### 2.1 2026-05-09 現行官方價格

來源：JAPAN RAIL PASS 官方「Types and prices」。價格適用於官方網上購買或海外 JR 指定代理等渠道。

| 類型 | 7日 成人 | 7日 兒童 | 14日 成人 | 14日 兒童 | 21日 成人 | 21日 兒童 |
|---|---:|---:|---:|---:|---:|---:|
| Ordinary / 普通車 | 50,000 | 25,000 | 80,000 | 40,000 | 100,000 | 50,000 |
| Green Car / 綠色車廂 | 70,000 | 35,000 | 110,000 | 55,000 | 140,000 | 70,000 |

兒童定義：通常為 6-11 歲；若網上付款日或海外 Exchange Order 發行日仍為 11 歲，即使使用時已 12 歲，仍按兒童票處理。

### 2.2 2026-10-01 起海外代理價格修訂

來源：JR Group 2026-04-09 英文 PDF / JNTO Canada 2026-04-20 說明。生效口徑：2026-10-01 或之後購買，以購買地當地時間計。官方網上購買服務價格「本次維持不變」，但優惠/維持期限另行公布。

| 類型 | 期間 | 舊成人價 | 新成人價 | 成人增幅 | 舊兒童價 | 新兒童價 |
|---|---|---:|---:|---:|---:|---:|
| Ordinary | 7日 | 50,000 | 53,000 | +3,000 | 25,000 | 27,000 |
| Ordinary | 14日 | 80,000 | 84,000 | +4,000 | 40,000 | 42,000 |
| Ordinary | 21日 | 100,000 | 105,000 | +5,000 | 50,000 | 53,000 |
| Green Car | 7日 | 70,000 | 74,000 | +4,000 | 35,000 | 37,000 |
| Green Car | 14日 | 110,000 | 116,000 | +6,000 | 55,000 | 58,000 |
| Green Car | 21日 | 140,000 | 147,000 | +7,000 | 70,000 | 74,000 |

## 3. 判斷公式

```text
應買 Pass 條件：
  預計可由 Pass 覆蓋的 JR 票價合計
  - Pass 價格
  - 需另付費項目（Nozomi/Mizuho 專用券、私鐵、地鐵、巴士、指定不覆蓋路段）
  > 0

保守建議：
  若只節省 0-3,000，通常不建議為了小差額買全國 Pass；
  因為行程彈性、可搭車種、退改限制與兌換時間都會吃掉價值。
```

必查三件事：

| 檢查項 | 為何重要 |
|---|---|
| Pass 是否覆蓋該路段 | JR Pass 不等於全日本所有鐵路；私鐵、地鐵、多數巴士、部分第三部門鐵道不覆蓋。 |
| 可搭車種 | 全國 Pass 搭 Nozomi/Mizuho 需另買專用券；區域 Pass 亦有不能搭 Tokaido Shinkansen 等限制。 |
| 有效期是否連續日 | 多數 JR Pass 以連續日計，不是任選 7/14/21 個乘車日。 |

## 4. 全國 Pass 試算表

普通車成人；單程票價採普通車指定席/常規期公開票價作保守估算，實際會因日期、列車、指定席季節加減、早鳥票、IC/網上折扣而變動。

| 行程 | 個別買票估算 | 7日 Pass 50,000 | 2026-10-01 代理價 53,000 | 結論 |
|---|---:|---:|---:|---|
| 東京 -> 京都 -> 東京 | 約 28,340（東京-京都單程約 14,170 x2） | -21,660 | -24,660 | 不值得；買單程票較平。 |
| 東京 -> 京都 -> 大阪 -> 東京 | 約 29,000-31,000 | 約 -19,000 | 約 -22,000 | 不值得；京都-大阪距離太短，補不了 Pass 價。 |
| 東京 -> 京都 -> 廣島 -> 東京（7日內） | 約 50,000-55,000 | 約 0 至 +5,000 | 約 -3,000 至 +2,000 | 臨界；若想搭 Nozomi/Mizuho 或行程少，未必值得。 |
| 東京 -> 京都 -> 廣島 -> 福岡/博多（7日內，不回東京） | 約 44,000-50,000 | 約 -6,000 至 0 | 約 -9,000 至 -3,000 | 多數不值得；除非再加長距離 JR。 |
| 東京 -> 金澤 -> 京都 -> 東京（7日內） | 約 43,000-48,000 | 約 -7,000 至 -2,000 | 約 -10,000 至 -5,000 | 通常不值得；可比較北陸相關區域/單程票。 |
| 成田 -> 東京 -> 仙台 -> 新青森（5日內） | JR East 官方例：約 52,000 | 比 7日全國 Pass 高 2,000 | 比代理新價低 1,000 | 全國 Pass只是臨界；新版 JR EAST PASS 5日 35,000 約省 17,000，更合適。 |
| 東京 -> 京都 -> 廣島 -> 福岡 -> 鹿兒島 -> 大阪/東京（14日內） | 容易超過 80,000 | 視路線可回本 | 84,000 門檻更高 | 這類跨本州+九州多段長距離才是 14日 Pass 候選。 |
| 北海道 + 東北 + 東京 + 關西（21日內多次長距離） | 可能超過 100,000 | 可回本 | 105,000 門檻更高 | 21日 Pass 只適合高移動密度旅程。 |

## 5. 區域 Pass 對照與節省試算

### 5.1 JR East / 東京近郊、東北、信越

| Pass | 價格 | 有效期 | 官方例子/試算 | 判斷 |
|---|---:|---|---:|---|
| JR TOKYO Wide Pass | 16,000 | 連續 3 日 | 官方例：東京 -> GALA 湯澤 -> 大宮 -> 日光/東武日光 -> 新宿，普通車指定席約 21,500；用 Pass 16,000，約省 5,500。 | 東京近郊多點一日/兩日遊很容易回本；只去河口湖單點需另算。 |
| JR EAST PASS | 35,000 / 50,000 | 連續 5 / 10 日 | 官方例：成田 -> 東京 -> 仙台 -> 新青森，普通車指定席約 52,000；用 5日 Pass 35,000，約省 17,000；用 10日 Pass 50,000，約省 2,000。 | 東北/長野/新潟多城高性價比；5日版比全國 7日 Pass 50,000 更容易回本。 |
| JR East-South Hokkaido Rail Pass | 40,000 | 連續 6 日 | JR East 列表價；覆蓋東日本至南北海道。 | 東京/東北/函館一線可優先比較，避免直接買 7日全國 Pass。 |
| JR Tohoku-South Hokkaido Rail Pass | 32,000 | 連續 6 日 | JR East 列表價；覆蓋東北至南北海道。 | 不含東京廣域需求時，比全國 Pass 更聚焦。 |

注意：JR East 舊版 Tohoku / Nagano-Niigata pass 頁面顯示已停止銷售，並推薦新版統一 JR EAST PASS；正式內容應使用新版頁面與當日價格。

### 5.2 JR West / 關西、中國、北陸

| Pass | 價格 | 有效期 | 常見適用場景 | 判斷 |
|---|---:|---|---|---|
| Kansai Area Pass | 2,800 / 4,800 / 5,800 / 7,000 | 1-4 日 | 關西機場 HARUKA + 京都/大阪/神戶/奈良/姬路等 JR 短中距離 | 不覆蓋 Shinkansen；只在關西短程 JR 密集移動時買。 |
| Kansai WIDE Area Pass | 12,000 | 5 日 | 新大阪-岡山 Sanyo Shinkansen 區間、城崎溫泉、天橋立、鳥取、白濱等 | 一次大阪/京都往返岡山或鳥取/城崎等遠郊，通常已接近回本。 |
| Kansai-Hiroshima Area Pass | 官方頁需另查當日價格 | 通常 5 日 | 關西 + 廣島/宮島 | 若旅程只在關西到廣島，不要買全國 Pass；先比較此類 JR West Pass。 |

JR West Kansai WIDE 限制重點：可搭新大阪-岡山間 Sanyo Shinkansen，但不可搭 Tokaido Shinkansen 新大阪-東京，也不可搭岡山-博多 Sanyo Shinkansen。

### 5.3 JR Hokkaido / 北海道

| Pass | 預購價 | 日本車站購買 | 有效期 | 官方例子/試算 | 判斷 |
|---|---:|---:|---|---:|---|
| Hokkaido Rail Pass | 22,000 | 23,000 | 連續 5 日 | 官方例：札幌-函館來回 + 札幌-小樽來回約 23,140；預購 5日 Pass 22,000，約省 1,140。 | 札幌+函館已接近回本；再加旭川/富良野/釧路/網走更值得。 |
| Hokkaido Rail Pass | 28,000 | 29,000 | 連續 7 日 | 長距離多城 | 北海道距離長，若不自駕且跨函館/旭川/道東，通常比全國 Pass 更合適。 |
| Hokkaido Rail Pass | 37,000 | 38,000 | 連續 10 日 | 北海道深度旅行 | 適合鐵路跨道央+道南+道東；不覆蓋北海道新幹線。 |
| Sapporo-Noboribetsu Area Pass | 10,000 | 11,000 | 連續 4 日 | 新千歲機場、札幌、小樽、登別 | 短線溫泉/機場旅程可優先比較。 |

### 5.4 JR Kyushu / 九州

| Pass | 價格 | 有效期 | 覆蓋 | 判斷 |
|---|---:|---|---|---|
| All Kyushu Area Pass | 22,000 / 24,000 / 26,000 | 3 / 5 / 7 日 | 九州全域；含九州新幹線博多-鹿兒島中央、西九州新幹線武雄溫泉-長崎 | 福岡-鹿兒島、長崎、熊本、別府多點移動時很易比全國 Pass 划算。 |
| Northern Kyushu Area Pass | 15,000 / 17,000 | 3 / 5 日 | 福岡、佐賀、長崎、熊本、大分北部等 | 福岡進出、去長崎+由布院/別府/熊本時優先計。 |
| Southern Kyushu Area Pass | 12,000 | 3 日 | 熊本以南、宮崎、鹿兒島等 | 南九州短期密集移動用；不需要全國 Pass。 |

JR Kyushu 限制重點：不覆蓋山陽新幹線小倉-博多、地鐵、巴士或其他公司鐵道。

## 6. 購買條件與外籍限制

| 項目 | 核心規則 |
|---|---|
| 全國 JAPAN RAIL PASS | 只對符合使用資格的人有效，核心是持外國護照並以 Temporary Visitor 短期滯在身份訪日；購買/兌換時護照資料會綁定 Pass，不可轉讓。 |
| 重疊購買 | 同一護照資料不可購買或兌換使用期間重疊的 Pass。 |
| 使用時查驗 | JR staff 可要求出示護照；Pass 與護照資料不一致會有失效風險。 |
| 日本國籍 | JR West 區域 Pass 頁明示：包含外國永久居留權者在內，日本國籍旅客不可使用該 JR West pass。全國 Pass 也需按官方最新資格頁核對。 |
| 區域 Pass | 多數同樣限外國護照 + Temporary Visitor；部分公司規則略有差異，購買前查對該 pass 頁。 |

## 7. 退款與改期政策

| 情況 | 政策摘要 |
|---|---|
| Exchange Order 未兌換 | 回原購買銷售處申請退款；手續費依銷售處。 |
| 已兌換成全國 JR Pass，但未開始使用且仍有效 | 可在日本國內兌換窗口退款；官方條件列明收取銷售價 10% 手續費。官方網上購買退款通常需出示付款信用卡，虛擬卡/無實體卡可能不能處理。 |
| 已開始使用或過期 | 不退款。 |
| 因停駛、延誤、天災、行程變更 | 已開始使用後，通常不延長有效期、不退款；JR Group 不承擔替代交通或住宿等額外成本。 |
| JR West 區域 Pass | 已兌換後只可在日本兌換地點窗口退款；退款價為售價扣 10% 手續費，最低每張 220；已開始使用或過期不退款。 |

## 8. 寫作建議：回答「JR Pass 值得買嗎 2026」

可用結論：

> 2026 年 JR Pass 不是「去日本必買」，而是長距離、多區域、短時間密集搭 JR 的工具。只做東京-京都/大阪來回，買全國 JR Pass 通常不划算；如果集中北海道、九州、東北或關西-廣島，先比較區域 Pass，往往比 7日全國 Pass 更容易回本。

可用計算模板：

```text
1. 列出全部 JR 長距離路段（起點、終點、日期、是否指定席）。
2. 查每段普通車票價，合計只計 Pass 覆蓋路段。
3. 扣除 Pass 價格。
4. 另列不覆蓋成本：地鐵、私鐵、巴士、Nozomi/Mizuho 專用券、Green/GranClass 升級。
5. 若節省少於 3,000-5,000，除非需要臨時改行程彈性，否則買單程票更穩。
```

## 9. 來源索引

| Source ID | 來源 | 查核用途 | URL |
|---|---|---|---|
| S1 | JAPAN RAIL PASS 官方 Types and prices | 全國 Pass 7/14/21 日 Ordinary/Green 現行價格、兒童定義、Nozomi/Mizuho 專用券提示 | https://japanrailpass.net/en/purchase/price/ |
| S2 | JAPAN RAIL PASS 官方 Conditions for use | 使用資格、護照綁定、重疊購買、退款 10%、已使用不退款、停駛不補償 | https://japanrailpass.net/en/use/conditions-for-use/ |
| S3 | JR Group PDF: Price Changes for the Japan Rail Pass | 2026-10-01 海外代理價格修訂、官方網上購買服務本次維持價格 | https://japanrailpass.net/assets/pdf/JRP_Price_Changes_En.pdf |
| S4 | JNTO Canada: Price Increases are Coming to the Nationwide Japan Rail Pass (2026) | 2026 調價新聞確認與整理表 | https://www.japan.travel/en/ca/news/price-increases-are-coming-to-the-nationwide-japan-rail-pass-2026/ |
| S5 | JR Central Nozomi fare PDF | Tokaido/Sanyo Shinkansen 票價與 Nozomi/Mizuho/JR Pass 注意事項 | https://global.jr-central.co.jp/en/info/fare/_pdf/nozomi.pdf |
| S6 | JR-EAST Ticket Overview | JR 票價由 basic fare + super limited express ticket 組成；Pass 多數含兩者 | https://www.jreast.co.jp/en/multi/ticket/guide.html |
| S7 | JR TOKYO Wide Pass 官方頁 | 16,000 價格、3日有效、官方 21,500 vs 16,000 節省例 | https://www.jreast.co.jp/en/multi/pass/tokyowidepass.html |
| S8 | JR EAST PASS 官方頁 | 新版 JR EAST PASS 35,000/5日、50,000/10日、官方 52,000 vs 35,000/50,000 節省例 | https://www.jreast.co.jp/en/multi/pass/eastpass.html |
| S9 | JR-EAST Find Your Pass | JR East pass 列表：JR EAST PASS、South Hokkaido、Tokyo Wide 等價格 | https://www.jreast.co.jp/en/multi/pass/ |
| S10 | JR-WEST Kansai Area Pass | 1-4 日價格、HARUKA/關西路線、不可搭 Shinkansen 等限制 | https://www.westjr.co.jp/global/en/ticket/pass/kansai/ |
| S11 | JR-WEST Kansai WIDE Area Pass | 12,000/5日、可搭新大阪-岡山 Sanyo Shinkansen、不可搭 Tokaido Shinkansen 等限制、退款 10%/最低 220 | https://www.westjr.co.jp/global/en/ticket/pass/kansai_wide/ |
| S12 | JR Hokkaido Rail Pass | Hokkaido Rail Pass / Sapporo area pass 價格、官方 23,140 vs 22,000 節省例、外國護照規則 | https://www.jrhokkaido.co.jp/global/english/ticket/railpass/index.html |
| S13 | JR Kyushu Rail Pass | All/Northern/Southern Kyushu Pass 價格、Temporary Visitor、覆蓋與不覆蓋路段 | https://www.jrkyushu.co.jp/english/railpass/railpass.html |

## 10. 待二次查核項

| 項目 | 原因 | 下次查核建議 |
|---|---|---|
| Kansai-Hiroshima / Hokuriku 等 JR West 中距離 pass | 本任務重點是 7/14/21 全國 vs 代表性區域 Pass；未逐一列完所有 JR West Pass。 | 針對「關西到廣島」「大阪到金澤/富山」另開 datatable。 |
| 個別票價 | JR 票價會按指定席季節、列車、購買渠道/早鳥折扣變化；本文試算採保守常規期估算。 | 正式上線前用官方預約系統或 JR 各社 fare PDF 逐段重算。 |
