-- brand_facts — 品牌事實 SSOT 表（堵「假 VERIFIED 注入根因」）
--
-- 背景：事實層曾三方分裂（brand_kg_injector 硬寫 VERIFIED 0.99 無 source +
--       brand_positioning.json + 磁碟 configs），令無源 claim 當 VERIFIED 入庫。
--       本表為唯一事實 SSOT；唯一合法寫入器 = scripts/brand_facts_writer.py
--       （provenance guard：VERIFIED 必須 source_url AND verified_by，否則強制降級 PENDING_CEO）。
--       下游 KG / insight / schema 一律 WHERE status='VERIFIED'。
--
-- ⚠️ 重要：此表已存在於 Supabase（2026-06-21 read-only 核實，23 rows，schema 與本檔一致），
--       但從未有 migration 檔記錄。本 migration 為冪等補登（codify live state），
--       全部 IF NOT EXISTS / DO $$ guard，重複套用安全、不破壞既有資料。
--
-- 來源設計：~/work/brand-aeo-pipeline-sdd/SDD-brand-aeo-pipeline-2026-06-21.md（Gate 2）
-- 對齊寫入器：~/.openclaw/workspace/scripts/brand_facts_writer.py（欄位/conflict-key 100% 一致）

create table if not exists public.brand_facts (
  id           uuid primary key default gen_random_uuid(),
  brand_slug   text not null,
  category     text,                                   -- product | company | certification | contact | metric ...（writer 將 NULL/空白正規化為 ''）
  fact_key     text not null,
  fact_value   text not null,
  lang         text not null,                          -- zh-Hant | en | ja | pt
  source       text,                                   -- 來源名（e-stat / gov.mo / 官網 ...）
  source_url   text,                                   -- 必填先可 VERIFIED
  status       text not null default 'PENDING_CEO',    -- PENDING_CEO | VERIFIED | DISPUTED | REJECTED
  verified_by  text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  -- 含 category：同 fact_key 跨 category 多值（如 MOQ 有 B2B/B2C）唔互相覆蓋。
  -- writer 將 category NULL→'' 正規化，令此 UNIQUE 對「無 category」嘅 fact 喺 ON CONFLICT 可靠命中。
  constraint brand_facts_brand_slug_category_fact_key_lang_key
    unique (brand_slug, category, fact_key, lang)
);

-- RLS（Rule #2：每個 public 表即時開 RLS）
alter table public.brand_facts enable row level security;

-- service_role 全權限 policy（沿用 brand_config_sync_log 模式）。
-- 註：writer 以 postgres.<ref> pooler superuser 連線會 bypass RLS；此 policy 為
--     PostgREST / service_role 路徑明確授權，並令 RLS 意圖可審計（避免「RLS on 但零 policy」灰區）。
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'brand_facts'
      and policyname = 'brand_facts service full'
  ) then
    execute 'create policy "brand_facts service full" on public.brand_facts for all to service_role using (true) with check (true)';
  end if;
end$$;

-- 下游一律 WHERE status='VERIFIED'：加 (brand_slug, status) 複合 index 加速 VERIFIED 篩選。
-- （單品牌 list 由現有 UNIQUE index 前綴 brand_slug 已可服務，故唔另建 brand_slug 單列 index。）
create index if not exists brand_facts_brand_slug_status_idx
  on public.brand_facts (brand_slug, status);
