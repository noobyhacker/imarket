-- Phase 6 — Auction oversight RPCs (moderator+ only, enforced by can_moderate()
-- against the caller's JWT). All run SECURITY DEFINER so they bypass RLS for the
-- privileged write, and notify affected users.

-- Cancel/halt a live auction.
create or replace function public.admin_cancel_auction(p_id uuid, p_reason text)
returns json language plpgsql security definer set search_path = public as $$
declare v_listing public.listings%rowtype;
begin
  if not public.can_moderate() then raise exception 'forbidden'; end if;
  update public.listings set auction_status = 'cancelled'
    where id = p_id and sale_type = 'auction'
      and coalesce(auction_status, 'live') not in ('ended', 'cancelled')
    returning * into v_listing;
  if not found then return json_build_object('ok', false, 'error', 'not_cancellable'); end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (v_listing.user_id, 'auction_cancelled', 'Your auction was cancelled',
          coalesce(p_reason, v_listing.title_original), '/listing/' || p_id);
  if v_listing.current_winner_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (v_listing.current_winner_id, 'auction_cancelled', 'An auction you led was cancelled',
            coalesce(p_reason, v_listing.title_original), '/listing/' || p_id);
  end if;
  return json_build_object('ok', true);
end;
$$;

-- Void a single bid and recompute the listing's current high bid / winner.
create or replace function public.admin_void_bid(p_bid_id uuid, p_reason text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_bid public.bids%rowtype;
  v_top public.bids%rowtype;
  v_listing public.listings%rowtype;
begin
  if not public.can_moderate() then raise exception 'forbidden'; end if;

  select * into v_bid from public.bids where id = p_bid_id;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;

  delete from public.bids where id = p_bid_id;

  select * into v_top from public.bids
    where listing_id = v_bid.listing_id
    order by amount desc, created_at desc
    limit 1;

  if found then
    update public.listings
      set current_bid = v_top.amount, current_winner_id = v_top.bidder_id
      where id = v_bid.listing_id
      returning * into v_listing;
  else
    update public.listings
      set current_bid = null, current_winner_id = null
      where id = v_bid.listing_id
      returning * into v_listing;
  end if;

  -- Notify the bidder whose bid was voided.
  insert into public.notifications (user_id, type, title, body, link)
  values (v_bid.bidder_id, 'bid_voided', 'Your bid was voided',
          coalesce(p_reason, v_listing.title_original), '/listing/' || v_bid.listing_id);
  -- Notify the new high bidder, if any and different.
  if v_top.bidder_id is not null and v_top.bidder_id <> v_bid.bidder_id then
    insert into public.notifications (user_id, type, title, body, link)
    values (v_top.bidder_id, 'bid_leading', 'You are now the highest bidder',
            v_listing.title_original, '/listing/' || v_bid.listing_id);
  end if;

  return json_build_object('ok', true, 'listing_id', v_bid.listing_id,
                           'current_bid', v_listing.current_bid);
end;
$$;

-- Extend an auction's end time (re-opens an ended, non-cancelled auction).
create or replace function public.admin_extend_auction(p_id uuid, p_new_end timestamptz)
returns json language plpgsql security definer set search_path = public as $$
declare v_listing public.listings%rowtype;
begin
  if not public.can_moderate() then raise exception 'forbidden'; end if;
  if p_new_end <= now() then return json_build_object('ok', false, 'error', 'end_in_past'); end if;
  update public.listings
    set auction_end = p_new_end,
        auction_status = case when coalesce(auction_status,'live') = 'cancelled' then auction_status else 'live' end
    where id = p_id and sale_type = 'auction'
    returning * into v_listing;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  insert into public.notifications (user_id, type, title, body, link)
  values (v_listing.user_id, 'auction_extended', 'Your auction was extended',
          v_listing.title_original, '/listing/' || p_id);
  return json_build_object('ok', true);
end;
$$;

-- Force-close now: reuse finalize_auction by pulling the end time to now().
create or replace function public.admin_force_close(p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.can_moderate() then raise exception 'forbidden'; end if;
  update public.listings set auction_end = now()
    where id = p_id and sale_type = 'auction'
      and coalesce(auction_status, 'live') not in ('ended', 'cancelled');
  if not found then return json_build_object('ok', false, 'error', 'not_closable'); end if;
  perform public.finalize_auction(p_id);
  return json_build_object('ok', true);
end;
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_cancel_auction(uuid, text)',
    'admin_void_bid(uuid, text)',
    'admin_extend_auction(uuid, timestamptz)',
    'admin_force_close(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon;', fn);
    execute format('grant execute on function public.%s to authenticated;', fn);
  end loop;
end $$;
