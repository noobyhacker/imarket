-- Phase 3 — User moderation: account status + data-layer capability loss.
--
-- A suspended/banned user must lose the ability to list, bid, and message at
-- the data layer (RLS + place_bid), not merely in the UI.

do $$ begin
  create type account_status as enum ('active', 'suspended', 'banned');
exception when duplicate_object then null; end $$;

alter table public.users
  add column if not exists account_status account_status not null default 'active',
  add column if not exists suspended_until timestamptz,
  add column if not exists status_reason text;

-- A user is "active" if not restricted, or if a temporary suspension has lapsed.
create or replace function public.is_user_active(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when u.account_status = 'active' then true
      when u.account_status = 'suspended'
           and u.suspended_until is not null
           and u.suspended_until <= now() then true
      else false
    end
    from public.users u where u.id = uid
  ), false);
$$;

-- ── Enforce on write paths (recreate INSERT policies with the active check) ──
drop policy if exists "Authenticated users can create listings" on public.listings;
create policy "Authenticated users can create listings"
  on public.listings for insert
  with check (auth.uid() = user_id and public.is_user_active(auth.uid()));

drop policy if exists "Users can insert own bids" on public.bids;
create policy "Users can insert own bids"
  on public.bids for insert
  with check (auth.uid() = bidder_id and public.is_user_active(auth.uid()));

drop policy if exists "Buyers can create conversations" on public.conversations;
create policy "Buyers can create conversations"
  on public.conversations for insert
  with check (auth.uid() = buyer_id and public.is_user_active(auth.uid()));

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_user_active(auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- ── Enforce in the bidding RPC (defense in depth; bids also go through it) ──
create or replace function public.place_bid(p_listing_id uuid, p_amount integer)
returns json language plpgsql security definer set search_path = 'public' as $function$
declare
  v_listing public.listings%rowtype;
  v_min integer;
  v_prev_winner uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.is_user_active(v_uid) then
    return json_build_object('ok', false, 'error', 'account_restricted');
  end if;

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

  if v_prev_winner is not null and v_prev_winner <> v_uid then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      v_prev_winner, 'outbid', 'You have been outbid',
      v_listing.title_original, '/listing/' || p_listing_id
    );
  end if;

  return json_build_object('ok', true, 'amount', p_amount);
end;
$function$;

-- Force-logout: revoke a user's auth sessions + refresh tokens. Caller must be
-- a moderator+ (checked against the caller's own JWT). Access tokens remain
-- valid until their short TTL expires; refresh is blocked immediately.
create or replace function public.admin_force_logout(target uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.can_moderate() then
    raise exception 'forbidden';
  end if;
  delete from auth.refresh_tokens where user_id = target::text;
  delete from auth.sessions where user_id = target;
end;
$$;
revoke all on function public.admin_force_logout(uuid) from public, anon;
grant execute on function public.admin_force_logout(uuid) to authenticated;
