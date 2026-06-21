-- ============================================================
-- iMarket - Supabase Storage Policies
-- Run this in Supabase SQL Editor after creating the buckets:
--   listings (public)
--   avatars  (public)
-- ============================================================

-- Public read access for public buckets
create policy "Public can view listing images"
  on storage.objects for select
  using (bucket_id = 'listings');

create policy "Public can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Users can manage files inside their own folder:
--   listings/<auth.uid()>/...
--   avatars/<auth.uid()>/...
create policy "Users can upload own listing images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own listing images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own listing images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
