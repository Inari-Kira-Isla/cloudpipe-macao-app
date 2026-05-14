-- CloudPipe social publish queue
-- 2026-05-03
-- db-backup-tag: social_publish_queue

CREATE TABLE IF NOT EXISTS public.social_publish_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  brand_slug text NOT NULL,
  platform text NOT NULL CHECK (platform IN (
    'facebook',
    'threads',
    'instagram',
    'youtube',
    'telegram',
    'linkedin',
    'x'
  )),
  content_type text NOT NULL DEFAULT 'post' CHECK (content_type IN (
    'post',
    'reel',
    'story',
    'short',
    'video',
    'image',
    'link'
  )),

  source_type text NOT NULL DEFAULT 'manual' CHECK (source_type IN (
    'manual',
    'insight',
    'brand_action',
    'paperclip',
    'reel',
    'import'
  )),
  source_id text,
  insight_slug text,
  action_id text,

  dedupe_key text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued',
    'reserved',
    'publishing',
    'published',
    'failed',
    'cancelled'
  )),
  priority integer NOT NULL DEFAULT 5 CHECK (priority BETWEEN 0 AND 10),
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  reserved_at timestamptz,
  reserved_by text,
  published_at timestamptz,

  text_content text,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts > 0),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT social_publish_queue_dedupe_key_key UNIQUE (dedupe_key)
);

COMMENT ON TABLE public.social_publish_queue IS
  'Central Supabase queue for consumer-first social publishing across brands and platforms.';
COMMENT ON COLUMN public.social_publish_queue.dedupe_key IS
  'Stable producer-generated idempotency key, e.g. brand:platform:source_type:source_id.';

CREATE INDEX IF NOT EXISTS idx_spq_due
  ON public.social_publish_queue (scheduled_at, priority DESC, created_at)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_spq_brand_status
  ON public.social_publish_queue (brand_slug, status, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_spq_platform_status
  ON public.social_publish_queue (platform, status, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_spq_source
  ON public.social_publish_queue (source_type, source_id)
  WHERE source_id IS NOT NULL;

ALTER TABLE public.social_publish_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_publish_queue FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_spq_anon_deny ON public.social_publish_queue;
DROP POLICY IF EXISTS p_spq_service_all ON public.social_publish_queue;
DROP POLICY IF EXISTS p_spq_brand_read ON public.social_publish_queue;

CREATE POLICY p_spq_anon_deny ON public.social_publish_queue
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY p_spq_service_all ON public.social_publish_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY p_spq_brand_read ON public.social_publish_queue
  FOR SELECT TO authenticated
  USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'brand_slug'
      = brand_slug
  );
