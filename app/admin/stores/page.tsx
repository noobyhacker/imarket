import { getTranslations } from 'next-intl/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { getAdminContext } from '@/lib/adminAuth';
import StoreAdminClient from '@/components/admin/StoreAdminClient';
import type { Store, StoreRequest, UserProfile } from '@/types';

// Access enforced by app/admin/layout.tsx.
export default async function AdminStoresPage() {
  const t = await getTranslations('admin.storesPage');
  const ctx = await getAdminContext();
  const canModerate = ctx?.role === 'moderator' || ctx?.role === 'super_admin';
  const supabase = await createAdminSupabaseClient();

  const [pendingRes, storesRes] = await Promise.all([
    supabase.from('store_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    supabase.from('stores').select('*').order('created_at', { ascending: false }),
  ]);

  const pending = (pendingRes.data ?? []) as StoreRequest[];
  const applicantIds = [...new Set(pending.map((r) => r.user_id))];
  const { data: applicants } = applicantIds.length
    ? await supabase.from('users').select('id, nickname').in('id', applicantIds)
    : { data: [] };
  const nameById = new Map((applicants ?? []).map((u: { id: string; nickname: string }) => [u.id, u.nickname]));
  const pendingWithUser = pending.map((r) => ({ ...r, user: { nickname: nameById.get(r.user_id) } as UserProfile }));

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-foreground">{t('title')}</h1>
      <StoreAdminClient pending={pendingWithUser as StoreRequest[]} stores={(storesRes.data ?? []) as Store[]} canModerate={canModerate} />
    </div>
  );
}
