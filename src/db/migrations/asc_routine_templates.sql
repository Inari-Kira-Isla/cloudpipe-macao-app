-- Migration: asc_routine_templates
-- Add routine_templates column for storing approved job outputs as templates

ALTER TABLE asc_content_jobs 
ADD COLUMN IF NOT EXISTS routine_templates JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS used_template_id UUID;

-- Index for faster template lookups
-- 2026-08-15: fixed invalid syntax — USING <method> must precede the column
-- list, not follow it (`ON tbl(col) USING gin` is a Postgres syntax error;
-- confirmed by direct execution against production). Correct form below.
CREATE INDEX IF NOT EXISTS idx_asc_jobs_routine_templates ON asc_content_jobs USING gin (routine_templates);
