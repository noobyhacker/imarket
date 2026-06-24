-- Prevent email harvesting via the public REST API.
-- The users SELECT RLS policy is intentionally public (nickname/avatar/etc. are
-- public profile data), but the email column must NOT be world-readable.
--
-- A column-level REVOKE has no effect while a broad table-level SELECT grant
-- exists, so we drop the table-level SELECT for anon/authenticated and re-grant
-- SELECT on every column EXCEPT email. RLS still governs which rows are visible.
--
-- The owner's own email is sourced from the auth session (auth.users) in
-- getCurrentUser(); the admin dashboard uses the service-role client which
-- retains full access.

revoke select on public.users from anon;
revoke select on public.users from authenticated;

grant select (id, nickname, avatar_url, trust_score, review_count, badge, languages, location, created_at, is_admin, language)
  on public.users to anon;
grant select (id, nickname, avatar_url, trust_score, review_count, badge, languages, location, created_at, is_admin, language)
  on public.users to authenticated;

grant select on public.users to service_role;

notify pgrst, 'reload schema';
