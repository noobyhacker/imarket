import { getTranslations } from 'next-intl/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import AnnouncementsClient from '@/components/admin/AnnouncementsClient';
import type { Announcement } from '@/types';

// Access enforced by app/admin/layout.tsx (moderator+ manage announcements).
export default async function AdminAnnouncementsPage() {
  const t = await getTranslations('admin.announcements');
  const supabase = await createAdminSupabaseClient();
  const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-foreground">{t('title')}</h1>
      <AnnouncementsClient items={(data ?? []) as Announcement[]} />
    </div>
  );
}
