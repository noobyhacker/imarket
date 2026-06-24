-- Phase 5 — Hide listings belonging to suspended stores from public view.
-- The owner-scoped SELECT policy (0007) still lets the owner see their own
-- listings; the service-role admin client bypasses RLS.
drop policy if exists "Active listings are viewable by everyone" on public.listings;
create policy "Active listings are viewable by everyone"
  on public.listings for select
  using (
    status <> 'deleted'
    and (
      store_id is null
      or not exists (
        select 1 from public.stores s
        where s.id = listings.store_id and s.status = 'suspended'
      )
    )
  );
