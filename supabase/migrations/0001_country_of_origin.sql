-- Phase 2 — Country of origin
-- Adds ISO-3166 alpha-2 origin country to listings.
-- Re-runnable / idempotent.

alter table public.listings
  add column if not exists origin_country_code text;

-- null = "unspecified" / "prefer not to say". No backfill needed (defaults to null).

create index if not exists listings_origin_country_idx
  on public.listings (origin_country_code);
