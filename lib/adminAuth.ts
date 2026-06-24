import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { emailInAllowlist } from '@/lib/adminEmails';

export type AdminRole = 'super_admin' | 'moderator' | 'support';

const RANK: Record<AdminRole, number> = { support: 1, moderator: 2, super_admin: 3 };

export interface AdminContext {
  userId: string;
  email: string;
  role: AdminRole;
}

/**
 * Resolve the caller's admin role from the cookie-based session.
 *
 * Identity MUST come from the session client (never the service-role client,
 * which authenticates as the service_role key and cannot resolve the caller).
 * The DB `admin_role` column is authoritative; the ADMIN_EMAILS env allowlist
 * is an emergency super-admin bootstrap so operators can never be locked out.
 *
 * Returns null for non-admins.
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('admin_role')
    .eq('id', user.id)
    .single();

  let role = (profile?.admin_role ?? null) as AdminRole | null;

  // Env allowlist → super_admin bootstrap (even if the column is unset).
  if (!role && emailInAllowlist(user.email, process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL)) {
    role = 'super_admin';
  }
  if (!role) return null;

  return { userId: user.id, email: user.email ?? '', role };
}

export function roleRank(role: AdminRole): number {
  return RANK[role];
}

/**
 * Throw unless the caller has at least `min` privilege. Use at the top of every
 * admin server action — server-enforced authorization, never UI-hiding alone.
 */
export async function assertRole(min: AdminRole): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx || RANK[ctx.role] < RANK[min]) {
    throw new Error('Unauthorized');
  }
  return ctx;
}
