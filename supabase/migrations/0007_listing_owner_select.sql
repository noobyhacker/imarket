-- Soft-deleting a listing (status -> 'deleted') was rejected by RLS.
-- The only SELECT policy was "Active listings are viewable by everyone"
-- USING (status <> 'deleted'). PostgREST requires the row produced by an
-- UPDATE to remain visible to the caller, so flipping status to 'deleted'
-- made the new row invisible and the UPDATE failed with a WITH CHECK /
-- row-level-security violation. ('sold' worked because it still satisfied
-- status <> 'deleted'.)
--
-- Fix: add a permissive SELECT policy so owners can always see their own
-- listings regardless of status. This makes the soft-delete UPDATE's new
-- row visible to its owner, so the update is allowed. It does not leak
-- deleted rows publicly (scoped to auth.uid() = user_id), and owner-facing
-- queries still filter by status explicitly.

create policy "Owners can view their own listings"
  on public.listings
  for select
  using (auth.uid() = user_id);
