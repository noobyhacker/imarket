-- Phase 4 — Verified store owners
-- Extends store applications + stores with business verification fields,
-- adds a private bucket for business-registration certificates.
-- Re-runnable / idempotent.

-- ── store_requests: business application fields ─────────────
alter table public.store_requests add column if not exists business_name text;
alter table public.store_requests add column if not exists business_reg_number text;
alter table public.store_requests add column if not exists category text;
alter table public.store_requests add column if not exists contact text;
alter table public.store_requests add column if not exists document_url text;
alter table public.store_requests add column if not exists review_reason text;

-- ── stores: verified business identity ──────────────────────
alter table public.stores add column if not exists business_name text;
alter table public.stores add column if not exists business_reg_number text;
alter table public.stores add column if not exists category text;
alter table public.stores add column if not exists verified boolean not null default true;

-- ── Public read of active stores (idempotent) ───────────────
do $$ begin
  create policy "Active stores are viewable by everyone"
    on public.stores for select using (status = 'active');
exception when duplicate_object then null; end $$;

-- ── Private bucket for business documents ───────────────────
insert into storage.buckets (id, name, public)
values ('store-docs', 'store-docs', false)
on conflict (id) do nothing;

-- Applicants upload their cert into a folder named after their uid.
do $$ begin
  create policy "Users upload own store docs"
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'store-docs'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users read own store docs"
    on storage.objects for select to authenticated
    using (
      bucket_id = 'store-docs'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

-- Admin review reads documents via the service-role client (bypasses RLS),
-- so no public read policy is added — the bucket stays private.
