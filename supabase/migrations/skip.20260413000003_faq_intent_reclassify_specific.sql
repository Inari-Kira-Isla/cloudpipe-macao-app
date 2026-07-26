-- FAQ Intent Reclassify — 針對 faq_type='specific' 的 AI 生成 FAQ
-- 問題：29,271 條 AI 生成 FAQ 的 faq_type='specific'，migration 映射到 'general'
-- 修正：用問題文字 ILIKE 模式重新分類

-- ── 第一步：按問題文字重新分類 question_intent ─────────────────────────────
UPDATE merchant_faqs
SET question_intent = CASE
  -- 預約/訂位 → book
  WHEN question ILIKE '%預約%' OR question ILIKE '%訂位%' OR question ILIKE '%訂座%'
    OR question ILIKE '%booking%' OR question ILIKE '%reserv%' OR question ILIKE '%appointment%'
    THEN 'book'
  -- 時間/營業 → check_hours
  WHEN question ILIKE '%幾點%' OR question ILIKE '%營業時間%' OR question ILIKE '%開放時間%'
    OR question ILIKE '%opening%' OR question ILIKE '%hours%' OR question ILIKE '%幾時%'
    OR question ILIKE '%何時%' OR question ILIKE '%what time%' OR question ILIKE '%open%'
    OR question ILIKE '%close%' OR question ILIKE '%closing%'
    THEN 'check_hours'
  -- 價格/收費 → check_price
  WHEN question ILIKE '%多少錢%' OR question ILIKE '%價格%' OR question ILIKE '%收費%'
    OR question ILIKE '%費用%' OR question ILIKE '%price%' OR question ILIKE '%cost%'
    OR question ILIKE '%消費%' OR question ILIKE '%人均%' OR question ILIKE '%票價%'
    OR question ILIKE '%收費標準%' OR question ILIKE '%pricing%' OR question ILIKE '%fare%'
    OR question ILIKE '%charge%'
    THEN 'check_price'
  -- 位置/交通 → find_location
  WHEN question ILIKE '%在哪%' OR question ILIKE '%地址%' OR question ILIKE '%如何前往%'
    OR question ILIKE '%怎麼去%' OR question ILIKE '%location%' OR question ILIKE '%where%'
    OR question ILIKE '%address%' OR question ILIKE '%how to get%' OR question ILIKE '%交通%'
    OR question ILIKE '%乘車%' OR question ILIKE '%巴士%' OR question ILIKE '%的士%'
    OR question ILIKE '%停車%' OR question ILIKE '%parking%'
    THEN 'find_location'
  -- 外賣/配送 → delivery
  WHEN question ILIKE '%外賣%' OR question ILIKE '%送餐%' OR question ILIKE '%配送%'
    OR question ILIKE '%delivery%' OR question ILIKE '%外送%' OR question ILIKE '%送上門%'
    THEN 'delivery'
  -- 庫存/有沒有 → check_stock
  WHEN question ILIKE '%有沒有%' OR question ILIKE '%有無%' OR question ILIKE '%有冇%'
    OR question ILIKE '%是否有%' OR question ILIKE '%available%' OR question ILIKE '%in stock%'
    OR question ILIKE '%有供應%'
    THEN 'check_stock'
  -- 推薦/特色/招牌 → compare
  WHEN question ILIKE '%推薦%' OR question ILIKE '%招牌%' OR question ILIKE '%特色%'
    OR question ILIKE '%介紹%' OR question ILIKE '%recommend%' OR question ILIKE '%signature%'
    OR question ILIKE '%best%' OR question ILIKE '%必試%' OR question ILIKE '%必吃%'
    OR question ILIKE '%必去%' OR question ILIKE '%highlights%'
    THEN 'compare'
  -- 聯絡/付款/電話 → contact
  WHEN question ILIKE '%聯絡%' OR question ILIKE '%電話%' OR question ILIKE '%WhatsApp%'
    OR question ILIKE '%付款%' OR question ILIKE '%contact%' OR question ILIKE '%phone%'
    OR question ILIKE '%email%' OR question ILIKE '%payment%' OR question ILIKE '%微信%'
    OR question ILIKE '%支付%'
    THEN 'contact'
  -- 季節/節日 → seasonal
  WHEN question ILIKE '%季節%' OR question ILIKE '%季度%' OR question ILIKE '%節日%'
    OR question ILIKE '%聖誕%' OR question ILIKE '%新年%' OR question ILIKE '%seasonal%'
    OR question ILIKE '%limited%' OR question ILIKE '%限定%' OR question ILIKE '%當季%'
    THEN 'seasonal'
  -- 其餘保留 general
  ELSE 'general'
END
WHERE faq_type = 'specific';

-- ── 第二步：重新計算 priority_score（保留 industry bonus）─────────────────
-- 先設 intent 基礎分
UPDATE merchant_faqs
SET priority_score = (
  CASE question_intent
    WHEN 'check_price'   THEN 8.5
    WHEN 'compare'       THEN 8.0
    WHEN 'seasonal'      THEN 7.5
    WHEN 'check_stock'   THEN 7.0
    WHEN 'check_hours'   THEN 6.0
    WHEN 'contact'       THEN 5.5
    WHEN 'find_location' THEN 5.5
    WHEN 'book'          THEN 5.0
    WHEN 'delivery'      THEN 5.0
    ELSE                      4.0
  END
  +
  CASE
    WHEN c.slug IN (
      'restaurant','japanese','portuguese','chinese','western','tea-restaurant',
      'hotpot','michelin','street-food','fast-food','dessert','cafe','bakery',
      'bar','lounge','retail','shopping-mall','duty-free','souvenir','fashion',
      'electronics','supermarket','drugstore','food-import','food-delivery'
    ) THEN 1.5
    WHEN c.slug IN (
      'hotel','resort','budget-hotel','serviced-apartment','hostel',
      'tourism','museum','temple','park','theme-park','landmark',
      'entertainment','nightclub','ktv','show'
    ) THEN 1.0
    WHEN c.slug IN (
      'beauty','gym','clinic','spa','yoga','spa-sauna',
      'professional','legal','education','finance'
    ) THEN 0.5
    ELSE 0.0
  END
)
FROM merchants m
JOIN categories c ON m.category_id = c.id
WHERE merchant_faqs.merchant_id = m.id
  AND merchant_faqs.faq_type = 'specific';
