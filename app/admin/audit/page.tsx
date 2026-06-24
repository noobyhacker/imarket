import { getTranslations } from 'next-intl/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import AuditLogTable from '@/components/admin/AuditLogTable';
import type { Database } from '@/types/database.types';

type AuditRow = Database['public']['Tables']['admin_audit_log']['Row'];

// Access enforced by app/admin/layout.tsx.
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: { actor?: string; action?: string; target?: string; from?: string; to?: string; page?: string };
}) {
  const t = await getTranslations('admin.audit');
  const supabase = await createAdminSupabaseClient();

  const page = Math.max(0, parseInt(searchParams.page ?? '0'));
  const limit = 50;
  const actor = searchParams.actor?.trim() ?? '';
  const action = searchParams.action?.trim() ?? '';
  const target = searchParams.target?.trim() ?? '';
  const from = searchParams.from?.trim() ?? '';
  const to = searchParams.to?.trim() ?? '';

  let query = supabase
    .from('admin_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (actor) query = query.ilike('actor_email', `%${actor}%`);
  if (action) query = query.ilike('action', `%${action}%`);
  if (target) query = query.eq('target_type', target);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', `${to}T23:59:59`);

  const { data, count } = await query.range(page * limit, (page + 1) * limit - 1);

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-foreground">{t('title')}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t('subtitle')}</p>
      <AuditLogTable
        rows={(data ?? []) as AuditRow[]}
        total={count ?? 0}
        page={page}
        pageSize={limit}
        filters={{ actor, action, target, from, to }}
      />
    </div>
  );
}
