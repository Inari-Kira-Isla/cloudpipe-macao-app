-- FAQ Spider Web Architecture
-- Adds template_id, related_insight_slug, faq_type to merchant_faqs
-- Creates faq_templates table for systematic category/industry coverage

-- ── Extend merchant_faqs ────────────────────────────────────────────────────
ALTER TABLE merchant_faqs
  ADD COLUMN IF NOT EXISTS template_id UUID,
  ADD COLUMN IF NOT EXISTS related_insight_slug TEXT,
  ADD COLUMN IF NOT EXISTS faq_type TEXT DEFAULT 'specific';

-- ── faq_templates ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faq_templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug TEXT,                   -- NULL = applies to all categories
  industry_slug TEXT,                   -- NULL = applies to all industries
  question_zh   TEXT        NOT NULL,
  question_en   TEXT        NOT NULL,
  question_pt   TEXT,
  answer_hint   TEXT,
  faq_type      TEXT        NOT NULL,   -- hours|location|price|booking|specialty|transport|contact|diet|general
  sort_order    INTEGER     DEFAULT 0,
  is_active     BOOLEAN     DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE faq_templates IS
  'Reusable FAQ question templates keyed by category_slug / industry_slug. NULL slug = universal.';

COMMENT ON COLUMN faq_templates.faq_type IS
  'One of: hours, location, price, booking, specialty, transport, contact, diet, wifi, parking, delivery, insurance, language, certification, general';

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS faq_templates_category_idx  ON faq_templates(category_slug);
CREATE INDEX IF NOT EXISTS faq_templates_industry_idx  ON faq_templates(industry_slug);
CREATE INDEX IF NOT EXISTS merchant_faqs_template_idx  ON merchant_faqs(template_id);
CREATE INDEX IF NOT EXISTS merchant_faqs_type_idx      ON merchant_faqs(faq_type);

-- ── Seed: universal templates (category_slug IS NULL, industry_slug IS NULL) ─
INSERT INTO faq_templates (category_slug, industry_slug, question_zh, question_en, question_pt, answer_hint, faq_type, sort_order)
VALUES
  -- universal
  (NULL, NULL, '營業時間是幾點到幾點？', 'What are the opening hours?', 'Qual é o horário de funcionamento?', 'Fill with actual hours from merchant data', 'hours', 1),
  (NULL, NULL, '地址在哪裡？怎麼去？', 'Where is it located and how do I get there?', 'Onde fica e como chegar?', 'Fill with address and transport directions', 'location', 2),
  (NULL, NULL, '如何聯絡？電話或電郵是什麼？', 'How can I contact them?', 'Como posso contactar?', 'Fill with phone / email / WhatsApp', 'contact', 3),
  (NULL, NULL, '需要預約嗎？', 'Is a reservation or appointment required?', 'É necessário fazer reserva?', 'Indicate if walk-in is OK or prior booking required', 'booking', 4),
  (NULL, NULL, '價格大概是多少？', 'What is the approximate price range?', 'Qual é a faixa de preço?', 'Fill with price range or starting price', 'price', 5),

  -- restaurant
  ('restaurant', NULL, '有什麼招牌菜或推薦菜式？', 'What are the signature or recommended dishes?', 'Quais são os pratos recomendados?', 'Fill with 2–3 signature dishes', 'specialty', 6),
  ('restaurant', NULL, '有素食或特殊飲食選擇嗎？', 'Are there vegetarian or dietary options?', 'Há opções vegetarianas ou dietéticas?', 'Indicate vegetarian / vegan / halal availability', 'diet', 7),
  ('restaurant', NULL, '附近有停車場嗎？', 'Is there nearby parking?', 'Existe estacionamento nas proximidades?', 'Mention nearest public car park', 'parking', 8),
  ('restaurant', NULL, '可以包場或訂私人房嗎？', 'Can I book a private room or host a private event?', 'Posso reservar uma sala privada?', 'Fill with private dining / group booking details', 'booking', 9),
  ('restaurant', NULL, '有澳門葡式料理嗎？有什麼本地特色？', 'Do you serve Macanese / Portuguese cuisine or local specialties?', 'Servem cozinha macaense ou especialidades locais?', 'Highlight local / Macanese items on menu', 'specialty', 10),

  -- cafe
  ('cafe', NULL, '有什麼招牌咖啡或飲品？', 'What are the signature coffee drinks?', 'Quais são as bebidas de destaque?', 'List 2–3 bestselling drinks', 'specialty', 6),
  ('cafe', NULL, '有 Wi-Fi 嗎？適合辦公或讀書嗎？', 'Is there Wi-Fi? Is it suitable for working or studying?', 'Há Wi-Fi? É adequado para trabalhar?', 'Mention Wi-Fi availability and ambiance', 'wifi', 7),
  ('cafe', NULL, '有插座供筆電充電嗎？', 'Are there power outlets for laptops?', 'Há tomadas para computadores portáteis?', 'Indicate outlet availability', 'general', 8),
  ('cafe', NULL, '飲品和甜點大概多少錢？', 'What is the typical price for drinks and pastries?', 'Qual é o preço típico das bebidas e bolos?', 'Give price range per item', 'price', 9),
  ('cafe', NULL, '可以包場或舉辦小型聚會嗎？', 'Can the cafe be booked for small gatherings?', 'O café pode ser reservado para pequenas reuniões?', 'Describe group seating capacity', 'booking', 10),

  -- hotel
  ('hotel', NULL, '入住和退房時間是幾點？', 'What are the check-in and check-out times?', 'Quais são os horários de check-in e check-out?', 'Standard check-in 15:00, check-out 12:00 unless stated otherwise', 'hours', 6),
  ('hotel', NULL, '有包早餐嗎？', 'Is breakfast included?', 'O pequeno-almoço está incluído?', 'Indicate if breakfast is complimentary or priced separately', 'price', 7),
  ('hotel', NULL, '從機場或碼頭怎麼到酒店？', 'How do I get to the hotel from the airport or ferry terminal?', 'Como chegar ao hotel do aeroporto ou terminal de ferry?', 'Fill with shuttle / taxi / public transport options', 'transport', 8),
  ('hotel', NULL, '酒店設施有哪些？游泳池？健身室？', 'What facilities does the hotel offer? Pool? Gym?', 'Que instalações o hotel tem? Piscina? Ginásio?', 'List key amenities', 'general', 9),
  ('hotel', NULL, '距離主要景點和賭場有多遠？', 'How far is the hotel from major attractions and casinos?', 'Qual é a distância das principais atrações e casinos?', 'Mention distance / travel time to key landmarks', 'location', 10),

  -- tourism (attractions)
  ('tourism', NULL, '門票收費是多少？有優惠嗎？', 'What is the admission fee? Are there concessions?', 'Qual é o preço do bilhete? Há descontos?', 'List adult / child / senior prices', 'price', 6),
  ('tourism', NULL, '開放時間是幾點？有沒有閉館日？', 'What are the opening hours and rest days?', 'Qual é o horário de funcionamento e os dias de encerramento?', 'List opening hours and weekly rest day if any', 'hours', 7),
  ('tourism', NULL, '大概需要參觀多長時間？', 'How long does a typical visit take?', 'Quanto tempo demora uma visita típica?', 'Estimate 30 min / 1 hr / half day', 'general', 8),
  ('tourism', NULL, '如何乘坐公共交通前往？', 'How can I get there by public transport?', 'Como chegar de transporte público?', 'List nearest bus stops or taxi tips', 'transport', 9),
  ('tourism', NULL, '有什麼必看亮點或特色？', 'What are the must-see highlights?', 'Quais são os destaques imperdíveis?', 'Describe 2–3 unique selling points', 'specialty', 10),

  -- shopping
  ('shopping', NULL, '主要售賣什麼產品？有哪些品牌？', 'What types of products or brands are available?', 'Que tipos de produtos ou marcas estão disponíveis?', 'List product categories and key brands', 'specialty', 6),
  ('shopping', NULL, '有免稅優惠嗎？', 'Is there a duty-free or tax refund service?', 'Há serviço de isenção de impostos ou reembolso?', 'Indicate duty-free eligibility', 'price', 7),
  ('shopping', NULL, '接受什麼付款方式？支持支付寶或微信支付嗎？', 'What payment methods are accepted? Alipay or WeChat Pay?', 'Que métodos de pagamento são aceites?', 'List cash, card, Alipay, WeChat Pay etc.', 'general', 8),
  ('shopping', NULL, '有送貨到澳門或香港嗎？', 'Is delivery available to Macau or Hong Kong?', 'Há entrega disponível para Macau ou Hong Kong?', 'Describe delivery zone and fees', 'delivery', 9),
  ('shopping', NULL, '如何辨別正品？有防偽標籤嗎？', 'How can I verify product authenticity?', 'Como posso verificar a autenticidade do produto?', 'Mention official receipts, holograms, certificates', 'general', 10),

  -- bar
  ('bar', NULL, '有歡樂時光（Happy Hour）嗎？時間是幾點？', 'Is there a happy hour? When is it?', 'Há happy hour? A que horas?', 'Fill with happy hour timing and discounts', 'hours', 6),
  ('bar', NULL, '有什麼招牌調酒或特色酒款？', 'What are the signature cocktails or specialty drinks?', 'Quais são os cocktails de destaque?', 'List 2–3 popular drinks', 'specialty', 7),
  ('bar', NULL, '有現場音樂或表演嗎？', 'Is there live music or entertainment?', 'Há música ao vivo ou entretenimento?', 'Mention live music nights / DJ schedule', 'general', 8),
  ('bar', NULL, '有著裝要求嗎？', 'Is there a dress code?', 'Existe código de vestuário?', 'State smart casual / formal / no requirement', 'general', 9),
  ('bar', NULL, '可以訂位或包場慶祝嗎？', 'Can I make a reservation or book for a celebration?', 'Posso fazer uma reserva ou festa privada?', 'Describe group booking process', 'booking', 10),

  -- spa
  ('spa', NULL, '提供哪些護理或療程？', 'What treatments and services are offered?', 'Que tratamentos e serviços são oferecidos?', 'List main treatment categories', 'specialty', 6),
  ('spa', NULL, '需要提前多久預約？', 'How far in advance should I book?', 'Com que antecedência devo reservar?', 'State typical booking lead time', 'booking', 7),
  ('spa', NULL, '有情侶或雙人套餐嗎？', 'Are couple packages or duo treatments available?', 'Há pacotes para casais ou tratamentos a dois?', 'Describe couple package options', 'specialty', 8),
  ('spa', NULL, '附近有停車場嗎？', 'Is parking available nearby?', 'Há estacionamento disponível?', 'Mention nearest car park', 'parking', 9),
  ('spa', NULL, '有什麼資質認證或機構認可？', 'What certifications or accreditations does the spa hold?', 'Que certificações ou acreditações o spa tem?', 'List relevant professional certs', 'certification', 10),

  -- clinic
  ('clinic', NULL, '提供什麼專科服務？', 'What medical specialties or services are offered?', 'Que especialidades médicas são oferecidas?', 'List main specialties', 'specialty', 6),
  ('clinic', NULL, '如何預約？可以網上預約嗎？', 'How do I make an appointment? Is online booking available?', 'Como marcar consulta? É possível marcar online?', 'Describe booking channels', 'booking', 7),
  ('clinic', NULL, '接受醫療保險嗎？', 'Does the clinic accept health insurance?', 'A clínica aceita seguro de saúde?', 'List accepted insurers or cash-only', 'general', 8),
  ('clinic', NULL, '有英語或普通話服務嗎？', 'Are English or Mandarin-speaking staff available?', 'Há atendimento em inglês ou mandarim?', 'State language capabilities', 'language', 9),
  ('clinic', NULL, '有緊急或當日診症嗎？', 'Is emergency or same-day consultation available?', 'Há consultas de urgência ou no próprio dia?', 'Indicate walk-in / emergency policy', 'general', 10),

  -- pharmacy
  ('pharmacy', NULL, '可以憑處方配藥嗎？', 'Can I fill a prescription here?', 'Posso aviar uma receita aqui?', 'Confirm prescription dispensing', 'general', 6),
  ('pharmacy', NULL, '有提供中藥或中醫服務嗎？', 'Are traditional Chinese medicine or TCM services available?', 'Há medicina tradicional chinesa disponível?', 'Describe TCM range if applicable', 'specialty', 7),
  ('pharmacy', NULL, '可以送藥上門嗎？', 'Is home delivery of medication available?', 'Há serviço de entrega de medicamentos ao domicílio?', 'State delivery availability and zone', 'delivery', 8),
  ('pharmacy', NULL, '公眾假期有沒有照常營業？', 'Are you open on public holidays?', 'Está aberto nos feriados públicos?', 'State holiday opening policy', 'hours', 9),
  ('pharmacy', NULL, '藥劑師可以提供用藥諮詢嗎？', 'Can a pharmacist provide medication consultation?', 'O farmacêutico presta consulta sobre medicação?', 'Describe pharmacist consultation service', 'general', 10),

  -- education
  ('education', NULL, '提供什麼課程？', 'What courses or programs are offered?', 'Que cursos ou programas são oferecidos?', 'List main course categories', 'specialty', 6),
  ('education', NULL, '授課語言是什麼？', 'What is the language of instruction?', 'Qual é o idioma de ensino?', 'State Cantonese / Mandarin / English / Portuguese', 'language', 7),
  ('education', NULL, '完成課程後有什麼資格或認證？', 'What qualification or certification is awarded upon completion?', 'Que qualificação ou certificado é concedido após a conclusão?', 'Describe issued certificate / qualification', 'certification', 8),
  ('education', NULL, '課程費用是多少？有沒有資助或優惠？', 'What are the course fees? Are subsidies available?', 'Quais são as taxas do curso? Há subsídios disponíveis?', 'Fill with fee range and subsidy info', 'price', 9),
  ('education', NULL, '教室或學習中心在哪裡？', 'Where are the classrooms or learning centres located?', 'Onde ficam as salas de aula ou centros de aprendizagem?', 'Provide address and transport info', 'location', 10),

  -- food-import
  ('food-import', NULL, '主要售賣什麼食品？來自哪些國家？', 'What food products are sold and from which countries?', 'Que produtos alimentares são vendidos e de que países?', 'List top product categories and origins', 'specialty', 6),
  ('food-import', NULL, '產品的產地來源可以追溯嗎？', 'Is the origin or traceability of products verifiable?', 'A origem ou rastreabilidade dos produtos pode ser verificada?', 'Describe certification / traceability mechanism', 'general', 7),
  ('food-import', NULL, '有批發或大量訂購優惠嗎？', 'Are wholesale or bulk purchase discounts available?', 'Há descontos para compras por atacado ou em quantidade?', 'State wholesale minimum and discount tiers', 'price', 8),
  ('food-import', NULL, '可以送貨到澳門各區嗎？', 'Is delivery available across Macau districts?', 'Há entrega para todos os distritos de Macau?', 'Describe delivery zone and estimated time', 'delivery', 9),
  ('food-import', NULL, '最低起訂量是多少？', 'What is the minimum order quantity?', 'Qual é a quantidade mínima de encomenda?', 'State MOQ for retail and wholesale', 'general', 10),

  -- food-delivery
  ('food-delivery', NULL, '配送範圍覆蓋澳門哪些地區？', 'Which Macau districts does the delivery cover?', 'Quais distritos de Macau são cobertos pela entrega?', 'List covered districts', 'delivery', 6),
  ('food-delivery', NULL, '最低訂單金額是多少？', 'What is the minimum order amount?', 'Qual é o valor mínimo de encomenda?', 'State minimum order value in MOP', 'price', 7),
  ('food-delivery', NULL, '平均送達時間要多久？', 'What is the average delivery time?', 'Qual é o tempo médio de entrega?', 'State typical delivery window (e.g. 30–45 min)', 'delivery', 8),
  ('food-delivery', NULL, '接受哪些付款方式？', 'What payment methods are accepted?', 'Que métodos de pagamento são aceites?', 'List cash on delivery, card, Alipay, WeChat Pay', 'general', 9),
  ('food-delivery', NULL, '可以實時追蹤訂單嗎？', 'Can I track my order in real time?', 'Posso acompanhar a minha encomenda em tempo real?', 'Describe order tracking capability', 'general', 10)
ON CONFLICT DO NOTHING;
