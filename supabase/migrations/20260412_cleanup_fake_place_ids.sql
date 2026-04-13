-- ============================================================
-- 澳門商戶 google_place_id 清理
-- 生成時間: 2026-04-12
-- 背景: Google Places API 核實發現 259 組重複 place_id，
--       涉及 729 筆商戶(45%)，主因是 AI 生成時批量填入假 place_id
-- 影響範圍: 18組明顯假place_id，涉及 ~140 筆商戶
-- 安全性: 只 NULL place_id 和 google_rating，不刪除商戶本身
-- ============================================================

-- Step 1: 執行前確認受影響商戶清單
SELECT id, slug, name_zh, google_place_id, google_rating
FROM merchants
WHERE google_place_id IN (
  'ChIJiYSpj-R6ATQRmaGxHQvGxVo',  -- 42筆 完全不相關商戶（最嚴重）
  'ChIJn9Gnr1l7ATQRoafrD7ODOt8',  -- 8筆  不同地區甜品店
  'ChIJF7EmygRwATQR2MtkpinomWc',  -- 8筆  金沙城不同設施
  'ChIJ_7H0gMR6ATQRxHZWztKDTPg',  -- 7筆  文化機構混用
  'ChIJ39Lwy-56ATQRDzfwGe44J34',  -- 6筆  畢馬威重複
  'ChIJU0ChiwNwATQRtIix8P2TBCg',  -- 6筆  新濠天地混用
  'ChIJFdyHISJ7ATQRpprHlqaO4KM',  -- 6筆  環球廣告重複
  'ChIJO96bqXNxATQR-Ynae0jy_OY',  -- 5筆  銀河演藝混用
  'ChIJSeJKq-V6ATQRXFlg9-riCPc',  -- 5筆  大三巴重複
  'ChIJzXAXrsd7ATQRFx8bJLlDMAQ',  -- 5筆  找換店重複
  'ChIJJzH7Y8J6ATQROperMkewqAc',  -- 5筆  支付服務重複
  'ChIJiwHU5-Z6ATQRcHWrksW2kDM',  -- 5筆  完全不相關
  'ChIJs3TTHe96ATQRnTZ3duKi3bw',  -- 5筆  德勤重複
  'ChIJBQ72FBl7ATQRoeOmJjmo498',  -- 5筆  完全不相關
  'ChIJ3ccvWuR6ATQRS9DM3JpwqRg',  -- 5筆  遺產機構重複
  'ChIJ2QnqtzVwATQRnrCkF7qBGTI',  -- 5筆  安德魯餅店重複
  'ChIJlwBuk4J7ATQRL_IQcTDyaFE',  -- 5筆  科技機構重複
  'ChIJdc7kHAB7ATQRsEcBKBbMuDU'   -- 5筆  葡國餐廳重複
)
ORDER BY google_place_id, name_zh;

-- ============================================================
-- Step 2: 清除明顯假 place_id
-- ============================================================
UPDATE merchants
SET
  google_place_id = NULL,
  google_rating   = NULL,
  updated_at      = NOW()
WHERE google_place_id IN (
  'ChIJiYSpj-R6ATQRmaGxHQvGxVo',
  'ChIJn9Gnr1l7ATQRoafrD7ODOt8',
  'ChIJF7EmygRwATQR2MtkpinomWc',
  'ChIJ_7H0gMR6ATQRxHZWztKDTPg',
  'ChIJ39Lwy-56ATQRDzfwGe44J34',
  'ChIJU0ChiwNwATQRtIix8P2TBCg',
  'ChIJFdyHISJ7ATQRpprHlqaO4KM',
  'ChIJO96bqXNxATQR-Ynae0jy_OY',
  'ChIJSeJKq-V6ATQRXFlg9-riCPc',
  'ChIJzXAXrsd7ATQRFx8bJLlDMAQ',
  'ChIJJzH7Y8J6ATQROperMkewqAc',
  'ChIJiwHU5-Z6ATQRcHWrksW2kDM',
  'ChIJs3TTHe96ATQRnTZ3duKi3bw',
  'ChIJBQ72FBl7ATQRoeOmJjmo498',
  'ChIJ3ccvWuR6ATQRS9DM3JpwqRg',
  'ChIJ2QnqtzVwATQRnrCkF7qBGTI',
  'ChIJlwBuk4J7ATQRL_IQcTDyaFE',
  'ChIJdc7kHAB7ATQRsEcBKBbMuDU'
);

-- ============================================================
-- Step 3: 下架已永久關閉商戶（Google CLOSED_PERMANENTLY 確認）
-- ============================================================
-- 先查 slug（需根據實際 Supabase slug 確認）
SELECT id, slug, name_zh, status
FROM merchants
WHERE name_zh IN (
  'Planet J冒險王國',
  '新福利巴士股份有限公司',
  '旅遊活動中心',
  '金沙劇院',
  '皇權免稅品店(澳門)有限公司'
);

-- 確認 slug 後執行（以 name_zh 匹配較安全）
UPDATE merchants
SET
  status     = 'inactive',
  updated_at = NOW()
WHERE name_zh IN (
  'Planet J冒險王國',
  '新福利巴士股份有限公司',
  '旅遊活動中心',
  '金沙劇院',
  '皇權免稅品店(澳門)有限公司'
)
AND status = 'live';

-- ============================================================
-- Step 4: 待觀察（不清除，需人工審核）
-- ============================================================
-- ChIJOc1Nxg1wATQRx0DHIEuZlkQ (銀河, 14筆)
--   → 大型綜合體，子商戶共用總部 place_id 尚可接受
--   → 但「盈峰KTV」「銀河地產」不應共用銀河娛樂場 place_id
-- ChIJt7JweQVwATQRr242E0IBxVM (威尼斯人, 6筆)
--   → 同上，威尼斯人旗下設施

-- ============================================================
-- Step 5: 驗證清理結果
-- ============================================================
SELECT
  COUNT(*) FILTER (WHERE google_place_id IS NULL)     AS place_id_nulled,
  COUNT(*) FILTER (WHERE google_place_id IS NOT NULL) AS place_id_remaining,
  COUNT(*) FILTER (WHERE status = 'inactive')         AS inactive_total,
  COUNT(*)                                             AS total_live
FROM merchants
WHERE status IN ('live', 'inactive');
