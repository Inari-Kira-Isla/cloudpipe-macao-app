-- FAQ Industry Bonus Backfill
-- 對 merchant_faqs.priority_score 加上 industry 加分
-- 根據 AI 爬蟲偏好數據（insight-category-ai-preference-2026-04-12.md）:
--   dining/shopping: +1.5（爬蟲最愛）
--   hotels/attractions/tourism/nightlife: +1.0
--   wellness/services/education/finance: +0.5

UPDATE merchant_faqs mf
SET priority_score = mf.priority_score +
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
FROM merchants m
JOIN categories c ON m.category_id = c.id
WHERE mf.merchant_id = m.id
  AND mf.priority_score < 10;  -- idempotency guard: 不重複加分
