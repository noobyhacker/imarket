import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type ServerCookieBatch = {
  name: string;
  value: string;
  options?: Parameters<ReturnType<typeof cookies>['set']>[2];
}[];

export async function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: ServerCookieBatch) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

/**
 * Service-role client that bypasses RLS. It deliberately exposes NO cookies, so
 * the SSR client never picks up the caller's session — every request is
 * authenticated as `service_role` (not the logged-in user). This matters
 * because some columns (e.g. users.email) are revoked from `authenticated`; if
 * the session leaked through, admin queries selecting those columns would fail
 * and silently return nothing.
 *
 * Only ever use this AFTER an authorization check (assertRole / layout gate).
 */
export async function createAdminSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}
