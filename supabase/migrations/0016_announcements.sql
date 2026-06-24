-- Phase 10 — Platform announcements (multilingual, audience/country targeted).

do $$ begin
  create type announcement_audience as enum ('all', 'buyers', 'sellers', 'stores', 'country');
exception when duplicate_object then null; end $$;

create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       jsonb not null default '{}'::jsonb,   -- { en, ko, ru }
  body        jsonb not null default '{}'::jsonb,
  audience    announcement_audience not null default 'all',
  country_code text,
  starts_at   timestamptz,
  ends_at     timestamptz,
  published   boolean not null default false,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists announcements_active_idx on public.announcements (published, starts_at, ends_at);

alter table public.announcements enable row level security;

-- Public sees only currently-active published announcements; moderators see all.
drop policy if exists "Read active or moderator" on public.announcements;
create policy "Read active or moderator"
  on public.announcements for select
  using (
    public.can_moderate()
    or (
      published
      and (starts_at is null or starts_at <= now())
      and (ends_at   is null or ends_at   >= now())
    )
  );

drop policy if exists "Moderators manage announcements" on public.announcements;
create policy "Moderators manage announcements"
  on public.announcements for all
  using (public.can_moderate())
  with check (public.can_moderate());
