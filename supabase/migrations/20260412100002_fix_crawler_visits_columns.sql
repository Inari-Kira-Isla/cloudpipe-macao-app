-- Add missing merchant_slug column to crawler_visits if not exists
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crawler_visits' AND column_name = 'merchant_slug') THEN
       ALTER TABLE crawler_visits ADD COLUMN merchant_slug TEXT;
   END IF;
   
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crawler_visits' AND column_name = 'url') THEN
       ALTER TABLE crawler_visits ADD COLUMN url TEXT;
   END IF;
   
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crawler_visits' AND column_name = 'error_message') THEN
       ALTER TABLE crawler_visits ADD COLUMN error_message TEXT;
   END IF;
   
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crawler_visits' AND column_name = 'visited_at') THEN
       ALTER TABLE crawler_visits ADD COLUMN visited_at TIMESTAMPTZ;
   END IF;
END $$;

-- Create indexes (if not exist)
CREATE INDEX IF NOT EXISTS idx_crawler_visits_merchant ON crawler_visits(merchant_slug);
CREATE INDEX IF NOT EXISTS idx_crawler_visits_url ON crawler_visits(url);
CREATE INDEX IF NOT EXISTS idx_crawler_visits_visited_at ON crawler_visits(visited_at);
