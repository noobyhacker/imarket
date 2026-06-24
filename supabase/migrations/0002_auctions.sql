-- Phase 3 — Auctions + Notifications
-- Adds auction listing type, bids, atomic bidding RPC, lazy/cron close-out,
-- and an in-app notifications table. Re-runnable / idempotent.

-- ── Enums ───────────────────────────────────────────────────
do $$ begin
  create type sale_type as enum ('fixed', 'auction');
exception when duplicate_object then null; end $$;

do $$ begin
  create type auction_status as enum ('scheduled', 'live', 'ended', 'cancelled');
exception when duplicate_object then null; end $$;

-- ── Listings: auction columns ───────────────────────────────
alter table public.listings add column if not exists sale_type sale_type not null default 'fixed';
alter table public.listings add column if not exists starting_price integer;
alter table public.listings add column if not exists bid_increment integer;
alter table public.listings add column if not exists auction_start timestamptz;
alter table public.listings add column if not exists auction_end timestamptz;
alter table public.listings add column if not exists current_bid integer;
alter table public.listings add column if not exists current_winner_id uuid references public.users(id);
alter table public.listings add column if not exists auction_status auction_status;

create index if not exists listings_sale_type_idx on public.listings (sale_type);
create index if not exists listings_auction_end_idx on public.listings (auction_end);

-- ── Bids ────────────────────────────────────────────────────
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  bidder_id uuid not null references public.users(id),
  amount integer not null,
  created_at timestamptz not null default now()
);
create index if not exists bids_listing_idx on public.bids (listing_id);
create index if not exists bids_listing_amount_idx on public.bids (listing_id, amount desc);

alter table public.bids enable row level security;

do $$ begin
  create policy "Bids are viewable by everyone" on public.bids for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can insert own bids" on public.bids for insert
    with check (auth.uid() = bidder_id);
exception when duplicate_object then null; end $$;

-- ── Notifications ───────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;

do $$ begin
  create policy "Users read own notifications" on public.notifications for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users update own notifications" on public.notifications for update
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users delete own notifications" on public.notifications for delete
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Inserts happen via security-definer functions (place_bid / finalize) and the
-- service-role admin client; allow self-insert too for completeness.
do $$ begin
  create policy "Users insert own notifications" on public.notifications for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ── place_bid: atomic, race-safe bidding ────────────────────
create or replace function public.place_bid(p_listing_id uuid, p_amount integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings%rowtype;
  v_min integer;
  v_prev_winner uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- Lock the listing row to serialize concurrent bids
  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_listing.sale_type <> 'auction' then
    return json_build_object('ok', false, 'error', 'not_an_auction');
  end if;
  if v_listing.user_id = v_uid then
    return json_build_object('ok', false, 'error', 'seller_cannot_bid');
  end if;
  if v_listing.auction_end is not null and v_listing.auction_end <= now() then
    return json_build_object('ok', false, 'error', 'auction_ended');
  end if;
  if v_listing.auction_start is not null and v_listing.auction_start > now() then
    return json_build_object('ok', false, 'error', 'auction_not_started');
  end if;

  v_min := greatest(
    coalesce(v_listing.current_bid + coalesce(v_listing.bid_increment, 1), 0),
    coalesce(v_listing.starting_price, 0)
  );
  if p_amount < v_min then
    return json_build_object('ok', false, 'error', 'bid_too_low', 'min', v_min);
  end if;

  v_prev_winner := v_listing.current_winner_id;

  insert into public.bids (listing_id, bidder_id, amount)
  values (p_listing_id, v_uid, p_amount);

  update public.listings
    set current_bid = p_amount,
        current_winner_id = v_uid,
        auction_status = 'live'
    where id = p_listing_id;

  -- Outbid notification to the previous high bidder
  if v_prev_winner is not null and v_prev_winner <> v_uid then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      v_prev_winner, 'outbid', 'You have been outbid',
      v_listing.title_original, '/listing/' || p_listing_id
    );
  end if;

  return json_build_object('ok', true, 'amount', p_amount);
end;
$$;

-- ── finalize_auction: lazy close-on-read (single listing) ───
create or replace function public.finalize_auction(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings%rowtype;
begin
  update public.listings
    set auction_status = 'ended'
    where id = p_listing_id
      and sale_type = 'auction'
      and auction_end is not null
      and auction_end <= now()
      and coalesce(auction_status, 'live') not in ('ended', 'cancelled')
    returning * into v_listing;

  if found then
    -- Notify seller
    insert into public.notifications (user_id, type, title, body, link)
    values (v_listing.user_id, 'auction_ended_seller', 'Your auction ended',
            v_listing.title_original, '/listing/' || p_listing_id);
    -- Notify winner (if any)
    if v_listing.current_winner_id is not null then
      insert into public.notifications (user_id, type, title, body, link)
      values (v_listing.current_winner_id, 'auction_won', 'You won an auction!',
              v_listing.title_original, '/listing/' || p_listing_id);
    end if;
  end if;
end;
$$;

-- ── close_due_auctions: cron backstop (all due) ─────────────
create or replace function public.close_due_auctions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select id from public.listings
    where sale_type = 'auction'
      and auction_end is not null
      and auction_end <= now()
      and coalesce(auction_status, 'live') not in ('ended', 'cancelled')
  loop
    perform public.finalize_auction(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ── Realtime ────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.bids;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
