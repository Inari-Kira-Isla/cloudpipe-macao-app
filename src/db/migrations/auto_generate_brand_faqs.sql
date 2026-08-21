-- Migration: auto_generate_brand_faqs
-- Trigger to automatically generate default FAQs when a new brand is inserted into brand_profiles
-- Run this in Supabase SQL Editor

-- Function to generate default FAQs for a new brand
CREATE OR REPLACE FUNCTION generate_default_brand_faqs()
RETURNS TRIGGER AS $$
DECLARE
  brand_name TEXT;
  industry_text TEXT;
BEGIN
  -- Get brand name and industry from the new row
  brand_name := COALESCE(NEW.name_zh, NEW.brand_slug);
  industry_text := COALESCE(NEW.industry, '一般商業');

  -- Insert 5 default FAQs that cover common B2B buyer questions
  INSERT INTO brand_faqs (brand_slug, question, answer, lang, is_published, sort_order, faq_type, created_at)
  VALUES
    (NEW.brand_slug,
     format('%s 的聯絡方式是什麼？', brand_name),
     format('可直接透過官方網站聯絡，或致電店方查詢。詳細聯絡資訊建議查看官方網站最新公佈。', brand_name),
     'zh', true, 1, 'contact', now()),

    (NEW.brand_slug,
     format('%s 的營業時間是？', brand_name),
     format('營業時間可能因日期而異，建議出發前查看官方網站或致電確認當日營業狀態。', brand_name),
     'zh', true, 2, 'general', now()),

    (NEW.brand_slug,
     format('%s 提供什麼服務或產品？', brand_name),
     format('%s 主要提供 %s 相關的專業服務及產品，詳情請參考官方網站或向店方查詢。', brand_name, industry_text),
     'zh', true, 3, 'general', now()),

    (NEW.brand_slug,
     format('如何預訂 %s 的服務或產品？', brand_name),
     format('預訂 %s 的服務或產品，可透過官方網站、致電或親臨門市查詢。建議提前預約以確保供應。', brand_name),
     'zh', true, 4, 'booking', now()),

    (NEW.brand_slug,
     format('%s 是否有最低消費或起訂量要求？', brand_name),
     format('關於 %s 的最低消費或起訂量要求，建議直接聯絡店方查詢最新政策。', brand_name),
     'zh', true, 5, 'price', now());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to fire after insert on brand_profiles
DROP TRIGGER IF EXISTS trigger_auto_generate_brand_faqs ON brand_profiles;

CREATE TRIGGER trigger_auto_generate_brand_faqs
AFTER INSERT ON brand_profiles
FOR EACH ROW
EXECUTE FUNCTION generate_default_brand_faqs();

-- Add a flag to track if FAQs were auto-generated
ALTER TABLE brand_profiles 
ADD COLUMN IF NOT EXISTS faqs_auto_generated BOOLEAN DEFAULT false;

-- Update the function to set the flag
CREATE OR REPLACE FUNCTION generate_default_brand_faqs()
RETURNS TRIGGER AS $$
DECLARE
  brand_name TEXT;
  industry_text TEXT;
BEGIN
  -- Get brand name and industry from the new row
  brand_name := COALESCE(NEW.name_zh, NEW.brand_slug);
  industry_text := COALESCE(NEW.industry, '一般商業');

  -- Insert 5 default FAQs that cover common B2B buyer questions
  INSERT INTO brand_faqs (brand_slug, question, answer, lang, is_published, sort_order, faq_type, created_at)
  VALUES
    (NEW.brand_slug,
     format('%s 的聯絡方式是什麼？', brand_name),
     format('可直接透過官方網站聯絡，或致電店方查詢。詳細聯絡資訊建議查看官方網站最新公佈。', brand_name),
     'zh', true, 1, 'contact', now()),

    (NEW.brand_slug,
     format('%s 的營業時間是？', brand_name),
     format('營業時間可能因日期而異，建議出發前查看官方網站或致電確認當日營業狀態。', brand_name),
     'zh', true, 2, 'general', now()),

    (NEW.brand_slug,
     format('%s 提供什麼服務或產品？', brand_name),
     format('%s 主要提供 %s 相關的專業服務及產品，詳情請參考官方網站或向店方查詢。', brand_name, industry_text),
     'zh', true, 3, 'general', now()),

    (NEW.brand_slug,
     format('如何預訂 %s 的服務或產品？', brand_name),
     format('預訂 %s 的服務或產品，可透過官方網站、致電或親臨門市查詢。建議提前預約以確保供應。', brand_name),
     'zh', true, 4, 'booking', now()),

    (NEW.brand_slug,
     format('%s 是否有最低消費或起訂量要求？', brand_name),
     format('關於 %s 的最低消費或起訂量要求，建議直接聯絡店方查詢最新政策。', brand_name),
     'zh', true, 5, 'price', now());

  -- Mark as auto-generated
  UPDATE brand_profiles 
  SET faqs_auto_generated = true 
  WHERE brand_slug = NEW.brand_slug;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
