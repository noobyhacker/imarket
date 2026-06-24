-- Phase 8 — Messaging moderation: soft message removal + messaging-only
-- suspension (narrower than a full account suspension).

alter table public.messages add column if not exists removed boolean not null default false;
alter table public.users add column if not exists messaging_suspended boolean not null default false;

-- Can this user send messages? Active account AND not messaging-suspended.
create or replace function public.can_message(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_user_active(uid)
    and not coalesce((select messaging_suspended from public.users where id = uid), false);
$$;

-- Recreate the messages INSERT policy to use can_message().
drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.can_message(auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );
