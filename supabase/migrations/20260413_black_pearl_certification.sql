-- Black Pearl Restaurant Guide (黑珍珠餐廳指南) — Macao 2024 & 2025
-- 寫入 certification_sources JSONB，僅在尚未標記時新增（idempotent）
-- 執行日：2026-04-13

-- ─── helper: append only if not already tagged ───────────────────────────────
-- 條件：certification_sources 不含 guide='black_pearl' 的條目才新增
-- 對於 2024+2025 兩年都上榜的：year=2025（最新）
-- 對於僅 2024：year=2024；僅 2025：year=2025

-- ── ◆◆◆ 三鑽（2024 + 2025） ─────────────────────────────────────────────────

-- 天巢法國餐廳 | Robuchon au Dôme | 新葡京酒店
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠三鑽","guide":"black_pearl","year":2025,"diamonds":3}]'::jsonb
WHERE slug IN ('robuchon-au-d', 'robuchon-au-dome-cc749')
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- 譽瓏軒 | Jade Dragon | 新濠影匯 City of Dreams
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠三鑽","guide":"black_pearl","year":2025,"diamonds":3}]'::jsonb
WHERE slug IN ('jade-dragon', 'jade-dragon-restaurant-0a256')
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- ── ◆◆ 二鑽（2024 + 2025） ─────────────────────────────────────────────────

-- 8餐廳 | The Eight | 葡京酒店 Grand Lisboa
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠二鑽","guide":"black_pearl","year":2025,"diamonds":2}]'::jsonb
WHERE slug IN ('the-8-restaurant-grand-lisboa', 'qtsas-8-c9f0f')
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- ── ◆ 一鑽（2024 + 2025） ──────────────────────────────────────────────────

-- 杜卡斯餐廳 | Alain Ducasse at Morpheus | 新濠天地
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠一鑽","guide":"black_pearl","year":2025,"diamonds":1}]'::jsonb
WHERE slug = 'alain-ducasse-at-morpheus'
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- 永利扒房 | SW Steakhouse | 永利皇宮 Wynn Palace
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠一鑽","guide":"black_pearl","year":2025,"diamonds":1}]'::jsonb
WHERE slug = 'yong-li-ba-fang-aa9fb'
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- 廉記行政公館 | Imperial Court | 美高梅澳門 MGM Macau
-- ⚠️ DB 中文名為「金殿堂」，請確認是否為同一餐廳
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠一鑽","guide":"black_pearl","year":2025,"diamonds":1}]'::jsonb
WHERE slug IN ('imperial-court', 'imperial-court-021c2')
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- 蜀道 | Five Foot Road | 美高梅路氹 MGM Cotai
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠一鑽","guide":"black_pearl","year":2025,"diamonds":1}]'::jsonb
WHERE slug = 'five-foot-road-beb96'
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- 巴黎軒 | La Chine | 巴黎人酒店 The Parisian Macao
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠一鑽","guide":"black_pearl","year":2025,"diamonds":1}]'::jsonb
WHERE slug IN ('la-chine', 'la-chine-7db3c')
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- 紫逸軒 | Zi Yat Heen | 澳門四季酒店 Four Seasons Hotel Macao
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠一鑽","guide":"black_pearl","year":2025,"diamonds":1}]'::jsonb
WHERE slug IN ('zi-yat-heen', 'zi-yat-heen-07fbf')
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- 風味居 | Feng Wei Ju | 星際酒店 StarWorld Hotel
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠一鑽","guide":"black_pearl","year":2025,"diamonds":1}]'::jsonb
WHERE slug IN ('feng-wei-ju', 'feng-wei-ju-03a2e')
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- 8½ Otto e Mezzo BOMBANA | 澳門銀河 Galaxy Macau
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠一鑽","guide":"black_pearl","year":2025,"diamonds":1}]'::jsonb
WHERE slug IN ('otto-e-mezzo-bombana', '8-1-2-otto-e-mezzo-bombana-81d62')
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- 吉多餐廳 | Guincho a Galera | 葡京酒店 Hotel Lisboa
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠一鑽","guide":"black_pearl","year":2025,"diamonds":1}]'::jsonb
WHERE slug = 'guincho-a-galera'
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- ── ◆ 一鑽（2024 限定，2025 已退出名單） ───────────────────────────────────

-- 御廚 | The Kitchen | 新葡京皇宮 Grand Lisboa Palace（2025 由御花園取代）
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠一鑽","guide":"black_pearl","year":2024,"diamonds":1}]'::jsonb
WHERE slug IN ('the-kitchen', 'the-kitchen-f38b5')
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- ── ◆ 一鑽（2025 新入榜） ───────────────────────────────────────────────────

-- 鮨金悅 | Sushi Kinetsu | 新濠天地 Morpheus（2025 新入榜）
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠一鑽","guide":"black_pearl","year":2025,"diamonds":1}]'::jsonb
WHERE slug IN ('sushi-kinetsu', 'sushi-kinetsu-c7e0e')
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- 譚卉 | Chef Tam's Seasons | 永利皇宮 Wynn Palace（2025 新入榜）
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠一鑽","guide":"black_pearl","year":2025,"diamonds":1}]'::jsonb
WHERE slug IN ('chef-tams-seasons', 'chef-tam-s-seasons-c6a7c')
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- 御花園 | Palace Garden | 新葡京皇宮 Grand Lisboa Palace（2025 新入榜）
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠一鑽","guide":"black_pearl","year":2025,"diamonds":1}]'::jsonb
WHERE slug IN ('palace-garden', 'palace-garden-cbf3c')
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- 協成海鮮老火鍋（老店）| Hip Seng Seafood Hotpot | 澳門半島（唯一非博企一鑽，2025 確認）
UPDATE merchants
SET certification_sources = COALESCE(certification_sources, '[]'::jsonb)
  || '[{"name":"黑珍珠一鑽","guide":"black_pearl","year":2025,"diamonds":1}]'::jsonb
WHERE slug = 'estabelecimento-de-comidas-hip-seng-classico-81903'
  AND NOT (COALESCE(certification_sources, '[]'::jsonb) @> '[{"guide":"black_pearl"}]'::jsonb);

-- ── 驗證查詢（執行後確認結果） ──────────────────────────────────────────────
SELECT slug, name_zh, name_en,
  certification_sources #> '{0}' AS bp_cert
FROM merchants
WHERE certification_sources @> '[{"guide":"black_pearl"}]'::jsonb
ORDER BY (certification_sources -> 0 -> 'diamonds')::int DESC, name_en;

-- ⚠️ 尚未找到的餐廳（需手動確認 slug）：
-- 1. 天頤 / Yí (Morpheus) — 不在 DB，需新增商戶
-- 2. 廉記行政公館 / Imperial Court (MGM Macau) — DB 中 Imperial Court 中文名為「金殿堂」，待確認是否同一餐廳
