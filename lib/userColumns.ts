// Public profile columns — deliberately EXCLUDES `email`. Email is revoked from
// the anon/authenticated roles at the DB level (migration 0005), so it must
// never be selected in client/anon-context reads. Kept in its own module (no
// server imports) so both server queries and client hooks can use it.
export const USER_PUBLIC_COLS =
  'id, nickname, avatar_url, trust_score, review_count, badge, languages, location, created_at, is_admin, language';
