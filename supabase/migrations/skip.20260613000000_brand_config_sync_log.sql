-- Brand config sync audit log table
create table if not exists public.brand_config_sync_log (
  id         bigint generated always as identity primary key,
  slug       text not null,
  field      text not null,
  old_value  text,
  new_value  text,
  targets    jsonb,
  dry_run    boolean default true,
  status     text default 'pending',
  created_at timestamptz default now()
);

alter table public.brand_config_sync_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'brand_config_sync_log'
      and policyname = 'sync_log service full'
  ) then
    execute 'create policy "sync_log service full" on public.brand_config_sync_log for all to service_role using (true) with check (true)';
  end if;
end$$;
