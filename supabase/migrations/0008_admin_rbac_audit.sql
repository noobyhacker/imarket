-- Phase 1 — Admin RBAC + append-only audit log.
--
-- Replaces the binary users.is_admin model with three admin roles
-- (super_admin > moderator > support) while keeping is_admin() working so
-- existing RLS policies are unaffected. Adds an append-only admin_audit_log.

-- ── Roles ────────────────────────────────────────────────────────────────
do $$ begin
  create type admin_role as enum ('super_admin', 'moderator', 'support');
exception when duplicate_object then null; end $$;

alter table public.users add column if not exists admin_role admin_role;

-- Bootstrap: every existing admin becomes a super_admin.
update public.users set admin_role = 'super_admin' where is_admin = true and admin_role is null;

-- ── Role helpers (SECURITY DEFINER, fixed search_path) ────────────────────
create or replace function public.current_admin_role()
returns admin_role language sql stable security definer set search_path = public as $$
  select admin_role from public.users where id = auth.uid();
$$;

create or replace function public.has_admin_access()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and admin_role is not null);
$$;

create or replace function public.can_moderate()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and admin_role in ('super_admin', 'moderator')
  );
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and admin_role = 'super_admin');
$$;

-- Keep is_admin() valid for all existing RLS: any admin role OR legacy flag.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and (admin_role is not null or is_admin = true)
  );
$$;

-- ── Audit log (append-only) ───────────────────────────────────────────────
create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.users(id) on delete set null,
  actor_email text,
  action      text not null,
  target_type text,
  target_id   text,
  reason      text,
  before      jsonb,
  after       jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx   on public.admin_audit_log (actor_id);
create index if not exists admin_audit_log_target_idx  on public.admin_audit_log (target_type, target_id);

alter table public.admin_audit_log enable row level security;

-- Read-only to admins; NO insert/update/delete policies, so the only writer
-- is the service-role client (which bypasses RLS) via logAdminAction().
-- This makes the log append-only and immutable from any user-facing client.
drop policy if exists "Admins can read the audit log" on public.admin_audit_log;
create policy "Admins can read the audit log"
  on public.admin_audit_log for select
  using (public.has_admin_access());
