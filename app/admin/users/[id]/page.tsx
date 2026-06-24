import { notFound } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { getAdminContext } from '@/lib/adminAuth';
import UserDetailClient, { type UserNote } from '@/components/admin/UserDetailClient';
import type { UserProfile } from '@/types';

// Access enforced by app/admin/layout.tsx; getAdminContext here only to gate
// which actions the viewer can perform.
export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getAdminContext();
  if (!ctx) notFound();

  const supabase = await createAdminSupabaseClient();
  const since24h = new Date(Date.now() - 86_400_000).toISOString();

  const [userRes, listingsCount, recent24h, bidsCount, notesRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', params.id).single(),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('user_id', params.id),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('user_id', params.id).gte('created_at', since24h),
    supabase.from('bids').select('*', { count: 'exact', head: true }).eq('bidder_id', params.id),
    supabase
      .from('admin_audit_log')
      .select('created_at, actor_email, reason')
      .eq('action', 'user.note')
      .eq('target_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (userRes.error || !userRes.data) notFound();

  return (
    <UserDetailClient
      user={userRes.data as UserProfile}
      stats={{
        listings: listingsCount.count ?? 0,
        bids: bidsCount.count ?? 0,
        recentListings24h: recent24h.count ?? 0,
      }}
      notes={(notesRes.data ?? []) as UserNote[]}
      viewerRole={ctx.role}
    />
  );
}
