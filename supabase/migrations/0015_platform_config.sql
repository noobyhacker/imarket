-- Phase 9 — Taxonomy & platform config (super_admin) + prohibited-item
-- auto-flagging (the piece deferred from Phase 4).

create table if not exists public.banned_keywords (
  id         uuid primary key default gen_random_uuid(),
  keyword    text not null unique,
  category   report_reason not null default 'prohibited',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  key         text primary key,
  enabled     boolean not null default false,
  description text,
  updated_by  uuid references public.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

create table if not exists public.platform_config (
  key        text primary key,
  value      jsonb,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.feature_flags (key, enabled, description)
values ('maintenance_mode', false, 'Show a maintenance screen to non-admins')
on conflict (key) do nothing;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.banned_keywords enable row level security;
alter table public.feature_flags  enable row level security;
alter table public.platform_config enable row level security;

drop policy if exists "Admins read banned keywords" on public.banned_keywords;
create policy "Admins read banned keywords" on public.banned_keywords for select using (public.has_admin_access());
drop policy if exists "Super admins write banned keywords" on public.banned_keywords;
create policy "Super admins write banned keywords" on public.banned_keywords for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Feature flags are world-readable (the app checks maintenance/flags on load).
drop policy if exists "Anyone reads feature flags" on public.feature_flags;
create policy "Anyone reads feature flags" on public.feature_flags for select using (true);
drop policy if exists "Super admins write feature flags" on public.feature_flags;
create policy "Super admins write feature flags" on public.feature_flags for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "Admins read config" on public.platform_config;
create policy "Admins read config" on public.platform_config for select using (public.has_admin_access());
drop policy if exists "Super admins write config" on public.platform_config;
create policy "Super admins write config" on public.platform_config for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ── Prohibited-item auto-flag (Phase 4 hook, implemented here) ───────────────
create or replace function public.flag_prohibited_listing()
returns trigger language plpgsql security definer set search_path = public as $$
declare kw record;
begin
  if new.status = 'deleted' then return new; end if;
  for kw in select keyword, category from public.banned_keywords loop
    if new.title_original ilike '%' || kw.keyword || '%'
       or coalesce(new.description_original, '') ilike '%' || kw.keyword || '%' then
      if not exists (
        select 1 from public.reports
        where target_type = 'listing' and target_id = new.id
          and reporter_id is null and status in ('open', 'in_review')
      ) then
        insert into public.reports (reporter_id, target_type, target_id, reason, details, status)
        values (null, 'listing', new.id, kw.category, 'Auto-flagged: matched "' || kw.keyword || '"', 'open');
      end if;
      return new; -- one auto report per listing is enough
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists listings_prohibited_flag on public.listings;
create trigger listings_prohibited_flag
  after insert or update of title_original, description_original on public.listings
  for each row execute function public.flag_prohibited_listing();

-- Backfill: rescan all active listings against the current keyword list.
create or replace function public.admin_rescan_prohibited()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count int := 0; l record; kw record;
begin
  if not public.can_moderate() then raise exception 'forbidden'; end if;
  for l in select id, title_original, description_original from public.listings where status = 'active' loop
    for kw in select keyword, category from public.banned_keywords loop
      if l.title_original ilike '%' || kw.keyword || '%'
         or coalesce(l.description_original, '') ilike '%' || kw.keyword || '%' then
        if not exists (
          select 1 from public.reports
          where target_type = 'listing' and target_id = l.id
            and reporter_id is null and status in ('open', 'in_review')
        ) then
          insert into public.reports (reporter_id, target_type, target_id, reason, details, status)
          values (null, 'listing', l.id, kw.category, 'Auto-flagged (rescan): matched "' || kw.keyword || '"', 'open');
          v_count := v_count + 1;
        end if;
      end if;
    end loop;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.admin_rescan_prohibited() from public, anon;
grant execute on function public.admin_rescan_prohibited() to authenticated;
