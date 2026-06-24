import { getTranslations } from 'next-intl/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { getAdminContext } from '@/lib/adminAuth';
import SettingsClient from '@/components/admin/SettingsClient';
import type { Database } from '@/types/database.types';

type Keyword = Database['public']['Tables']['banned_keywords']['Row'];
type Flag = Database['public']['Tables']['feature_flags']['Row'];

// Access enforced by app/admin/layout.tsx; settings is super_admin-only.
export default async function AdminSettingsPage() {
  const t = await getTranslations('admin.settings');
  const ctx = await getAdminContext();

  if (ctx?.role !== 'super_admin') {
    return <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">{t('forbidden')}</p>;
  }

  const supabase = await createAdminSupabaseClient();
  const [kwRes, flagRes] = await Promise.all([
    supabase.from('banned_keywords').select('*').order('created_at', { ascending: false }),
    supabase.from('feature_flags').select('*').order('key', { ascending: true }),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-foreground">{t('title')}</h1>
      <SettingsClient keywords={(kwRes.data ?? []) as Keyword[]} flags={(flagRes.data ?? []) as Flag[]} />
    </div>
  );
}
