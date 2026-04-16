-- ============================================================
-- Migration: 20260414_add_sub_district_and_district_faqs.sql
--
-- 1. merchants 表加 sub_district 欄位（街區級，比 district 細）
-- 2. 建立 district_faqs 表（街區級 FAQ 獨立表）
-- 3. 相關索引
-- ============================================================

-- ── 1. merchants.sub_district ────────────────────────────────
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS sub_district text;

COMMENT ON COLUMN merchants.sub_district IS
  '澳門街區級分區：三盞燈, 高士德, 皇朝區, 筷子基, 下環/媽閣, 福隆新街, 官也街, 花城, 路環市區, 黑沙, 路氹新濠天地, 路氹銀河, 路氹永利皇宮 等';

CREATE INDEX IF NOT EXISTS idx_merchants_sub_district
  ON merchants(sub_district)
  WHERE sub_district IS NOT NULL;

-- 複合索引：用於 sub_district + status 查詢
CREATE INDEX IF NOT EXISTS idx_merchants_sub_district_status
  ON merchants(sub_district, status)
  WHERE sub_district IS NOT NULL;

-- ── 2. district_faqs 表 ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS district_faqs (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 街區定位
  sub_district        text        NOT NULL,   -- 細分街區: 三盞燈, 高士德, 皇朝區...
  parent_district     text,                   -- 大區: 澳門半島, 氹仔, 路環
  region              text        DEFAULT 'macau', -- 地區: macau / hk / tw / jp

  -- 問答內容
  lang                text        DEFAULT 'zh'   NOT NULL,
  question            text        NOT NULL,
  answer              text        NOT NULL,

  -- 分類
  faq_type            text,       -- dining / transport / shopping / attractions / general
  question_intent     text,       -- recommendation / location / hours / price / culture

  -- 關聯
  related_insight_slug text,      -- 對應 insight slug
  related_merchant_slugs text[],  -- 相關商戶 slugs（陣列）

  -- 品質指標
  citation_count      int         DEFAULT 0,
  priority_score      float       DEFAULT 0.5,
  is_verified         boolean     DEFAULT false,
  verified_at         timestamptz,

  -- 時間戳
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

COMMENT ON TABLE district_faqs IS
  '街區級 FAQ 表：與 merchant_faqs 不同，此表以地理街區為單位，記錄 AI 常被問到的街區級問題（最佳餐廳推薦、交通方式、街區特色等）';

-- 索引
CREATE INDEX IF NOT EXISTS idx_district_faqs_sub_district
  ON district_faqs(sub_district);

CREATE INDEX IF NOT EXISTS idx_district_faqs_parent_district
  ON district_faqs(parent_district);

CREATE INDEX IF NOT EXISTS idx_district_faqs_region_lang
  ON district_faqs(region, lang);

CREATE INDEX IF NOT EXISTS idx_district_faqs_faq_type
  ON district_faqs(faq_type);

CREATE INDEX IF NOT EXISTS idx_district_faqs_insight
  ON district_faqs(related_insight_slug)
  WHERE related_insight_slug IS NOT NULL;

-- ── 3. sub_district 參考表（枚舉合法值）──────────────────────
CREATE TABLE IF NOT EXISTS sub_districts (
  id            serial PRIMARY KEY,
  sub_district  text UNIQUE NOT NULL,
  parent_district text NOT NULL,
  region        text DEFAULT 'macau',
  name_en       text,
  name_pt       text,
  description   text,
  priority      int  DEFAULT 5,       -- 1=高流量, 10=低流量
  created_at    timestamptz DEFAULT now()
);

COMMENT ON TABLE sub_districts IS '街區參考表：定義合法的 sub_district 值及其映射關係';

-- 插入澳門已知街區
INSERT INTO sub_districts (sub_district, parent_district, region, name_en, priority) VALUES
  -- 澳門半島
  ('新馬路/議事亭',   '澳門半島', 'macau', 'Senado Square / Avenida de Almeida Ribeiro', 1),
  ('皇朝區',         '澳門半島', 'macau', 'NAPE / Horta e Costa',                        1),
  ('高士德',         '澳門半島', 'macau', 'Areia Preta',                                 2),
  ('新橋/三盞燈',    '澳門半島', 'macau', 'Ponte Nova / Three Lamps',                    2),
  ('筷子基',         '澳門半島', 'macau', 'Fai Chi Kei',                                 3),
  ('下環/媽閣',      '澳門半島', 'macau', 'Barra / Inner Harbour',                       3),
  ('福隆新街',       '澳門半島', 'macau', 'Rua da Felicidade',                           3),
  ('關前街',         '澳門半島', 'macau', 'Rua das Estalagens',                          2),
  ('荷蘭園',         '澳門半島', 'macau', 'Flora Garden / Jardim da Vitoria',            4),
  ('望廈/台山',      '澳門半島', 'macau', 'Mong Ha / Toi San',                           5),
  -- 氹仔
  ('官也街/氹仔舊村', '氹仔',    'macau', 'Taipa Village / Rua do Cunha',                1),
  ('花城/中央公園',  '氹仔',    'macau', 'Taipa Flower City',                            3),
  ('銀河娛樂城',     '氹仔',    'macau', 'Galaxy Entertainment City',                   2),
  -- 路氹
  ('路氹新濠天地',   '路氹',    'macau', 'Cotai City of Dreams',                        1),
  ('路氹永利皇宮',   '路氹',    'macau', 'Cotai Wynn Palace',                           2),
  ('路氹銀河/四季',  '路氹',    'macau', 'Cotai Galaxy / Four Seasons',                 2),
  ('路氹MGM/威尼斯人','路氹',   'macau', 'Cotai MGM / Venetian',                        2),
  -- 路環
  ('路環市區',       '路環',    'macau', 'Coloane Village',                              2),
  ('黑沙',           '路環',    'macau', 'Hac Sa (Black Sand)',                          3),
  ('荔枝碗',         '路環',    'macau', 'Lai Chi Vun Shipyard',                         3)
ON CONFLICT (sub_district) DO NOTHING;
