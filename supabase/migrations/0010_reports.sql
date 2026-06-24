-- Phase 4 — Minimal reports system feeding the moderation queue.

do $$ begin
  create type report_target as enum ('listing', 'user', 'message', 'conversation');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('open', 'in_review', 'actioned', 'dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_reason as enum ('spam', 'scam', 'prohibited', 'counterfeit', 'harassment', 'wrong_category', 'other');
exception when duplicate_object then null; end $$;

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.users(id) on delete set null,
  target_type report_target not null,
  target_id   uuid not null,
  reason      report_reason not null,
  details     text,
  status      report_status not null default 'open',
  assigned_to uuid references public.users(id) on delete set null,
  resolution  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_target_idx on public.reports (target_type, target_id);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

alter table public.reports enable row level security;

-- Reporters file their own reports (only while active); they may read their own.
drop policy if exists "Users can file reports" on public.reports;
create policy "Users can file reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id and public.is_user_active(auth.uid()));

drop policy if exists "Reporters and moderators can read reports" on public.reports;
create policy "Reporters and moderators can read reports"
  on public.reports for select
  using (public.can_moderate() or auth.uid() = reporter_id);

drop policy if exists "Moderators can update reports" on public.reports;
create policy "Moderators can update reports"
  on public.reports for update
  using (public.can_moderate())
  with check (public.can_moderate());
