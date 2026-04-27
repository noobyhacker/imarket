-- ============================================================
-- iMarket — Supabase SQL Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type listing_status as enum ('active', 'sold', 'deleted');
create type listing_category as enum (
  'electronics', 'furniture', 'clothing', 'vehicles',
  'home_appliances', 'books', 'services', 'other'
);
create type store_status as enum ('active', 'inactive');
create type request_status as enum ('pending', 'approved', 'rejected');

-- ============================================================
-- TABLES
-- ============================================================

-- Users (mirrors auth.users)
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  nickname      text not null,
  avatar_url    text,
  location      text,
  language      text not null default 'ko',
  languages     text[] not null default '{}',
  trust_score   numeric(3,1) not null default 5.0,
  review_count  int not null default 0,
  badge         text,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Stores
create table public.stores (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references public.users(id) on delete cascade,
  name        text not null,
  description text not null default '',
  logo_url    text,
  status      store_status not null default 'active',
  created_at  timestamptz not null default now()
);

-- Listings
create table public.listings (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references public.users(id) on delete cascade,
  store_id              uuid references public.stores(id) on delete set null,
  title_original        text not null,
  title_translated      text,
  description_original  text not null default '',
  description_translated text,
  price                 int not null check (price >= 0),
  category              listing_category not null,
  location              text not null default '',
  status                listing_status not null default 'active',
  english_friendly      boolean not null default false,
  foreigner_safe        boolean not null default false,
  languages             text[] not null default '{}',
  images                text[] not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Saved listings
create table public.saved_listings (
  user_id     uuid not null references public.users(id) on delete cascade,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- Conversations
create table public.conversations (
  id               uuid primary key default uuid_generate_v4(),
  listing_id       uuid not null references public.listings(id) on delete cascade,
  buyer_id         uuid not null references public.users(id) on delete cascade,
  seller_id        uuid not null references public.users(id) on delete cascade,
  last_message     text,
  last_message_at  timestamptz,
  buyer_unread     int not null default 0,
  seller_unread    int not null default 0,
  created_at       timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

-- Messages
create table public.messages (
  id                uuid primary key default uuid_generate_v4(),
  conversation_id   uuid not null references public.conversations(id) on delete cascade,
  sender_id         uuid not null references public.users(id) on delete cascade,
  text_original     text not null,
  text_translated   text,
  original_language text,
  created_at        timestamptz not null default now()
);

-- Store requests
create table public.store_requests (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  name        text not null,
  description text not null default '',
  logo_url    text,
  status      request_status not null default 'pending',
  created_at  timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index listings_user_id_idx on public.listings(user_id);
create index listings_status_idx on public.listings(status);
create index listings_category_idx on public.listings(category);
create index listings_created_at_idx on public.listings(created_at desc);
create index listings_price_idx on public.listings(price);
create index messages_conversation_id_idx on public.messages(conversation_id);
create index messages_created_at_idx on public.messages(created_at asc);
create index conversations_buyer_id_idx on public.conversations(buyer_id);
create index conversations_seller_id_idx on public.conversations(seller_id);
create index conversations_last_message_at_idx on public.conversations(last_message_at desc);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at on listings
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger listings_updated_at
  before update on public.listings
  for each row execute function update_updated_at();

-- Auto-create user profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, nickname)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.listings enable row level security;
alter table public.saved_listings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.stores enable row level security;
alter table public.store_requests enable row level security;

-- Helper: is current user admin
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and is_admin = true
  );
$$ language sql security definer;

-- USERS
create policy "Public profiles are viewable by everyone"
  on public.users for select using (true);

create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

-- LISTINGS
create policy "Active listings are viewable by everyone"
  on public.listings for select using (status != 'deleted');

create policy "Authenticated users can create listings"
  on public.listings for insert with check (auth.uid() = user_id);

create policy "Users can update own listings"
  on public.listings for update using (auth.uid() = user_id);

create policy "Admin can update any listing"
  on public.listings for update using (is_admin());

-- SAVED LISTINGS
create policy "Users can view own saved listings"
  on public.saved_listings for select using (auth.uid() = user_id);

create policy "Users can save listings"
  on public.saved_listings for insert with check (auth.uid() = user_id);

create policy "Users can unsave listings"
  on public.saved_listings for delete using (auth.uid() = user_id);

-- CONVERSATIONS
create policy "Participants can view their conversations"
  on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Buyers can create conversations"
  on public.conversations for insert with check (auth.uid() = buyer_id);

create policy "Participants can update conversations"
  on public.conversations for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- MESSAGES
create policy "Participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create policy "Participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- STORES
create policy "Stores are viewable by everyone"
  on public.stores for select using (status = 'active');

create policy "Admin can manage stores"
  on public.stores for all using (is_admin());

-- STORE REQUESTS
create policy "Users can view own store requests"
  on public.store_requests for select using (auth.uid() = user_id);

create policy "Authenticated users can submit store requests"
  on public.store_requests for insert with check (auth.uid() = user_id);

create policy "Admin can manage store requests"
  on public.store_requests for all using (is_admin());

-- ============================================================
-- REALTIME
-- Enable in Supabase Dashboard > Database > Replication
-- OR run:
-- ============================================================
-- alter publication supabase_realtime add table public.messages;
-- alter publication supabase_realtime add table public.conversations;

-- ============================================================
-- STORAGE
-- Create in Supabase Dashboard > Storage:
--   Bucket name: listings   (public: true)
--   Bucket name: avatars    (public: true)
-- Set file size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp
-- Then run: supabase_storage_policies.sql
-- ============================================================
