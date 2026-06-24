import { getTranslations } from 'next-intl/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import UserAdminTable from '@/components/admin/UserAdminTable';
import type { UserProfile } from '@/types';

// Access enforced by app/admin/layout.tsx.
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; role?: string; page?: string };
}) {
  const t = await getTranslations('admin.usersPage');
  const supabase = await createAdminSupabaseClient();

  const page = Math.max(0, parseInt(searchParams.page ?? '0'));
  const limit = 25;
  const q = searchParams.q?.trim() ?? '';
  const status = searchParams.status?.trim() ?? '';
  const role = searchParams.role?.trim() ?? '';

  let query = supabase.from('users').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (q) query = query.or(`nickname.ilike.%${q}%,email.ilike.%${q}%,location.ilike.%${q}%`);
  if (status) query = query.eq('account_status', status);
  if (role === 'none') query = query.is('admin_role', null);
  else if (role) query = query.eq('admin_role', role);

  const { data, count } = await query.range(page * limit, (page + 1) * limit - 1);

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-foreground">{t('title')}</h1>
      <UserAdminTable
        rows={(data ?? []) as UserProfile[]}
        total={count ?? 0}
        page={page}
        pageSize={limit}
        filters={{ q, status, role }}
      />
    </div>
  );
}
