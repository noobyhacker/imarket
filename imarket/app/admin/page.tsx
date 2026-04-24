import { getTranslations } from 'next-intl/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string };
}) {
  const t = await getTranslations('admin');
  const supabase = await createAdminSupabaseClient();
  const tab = searchParams.tab ?? 'listings';
  const page = parseInt(searchParams.page ?? '0');
  const limit = 20;

  const [listingsRes, storeRequestsRes, usersRes] = await Promise.all([
    supabase
      .from('listings')
      .select('*, seller:users(*)', { count: 'exact' })
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1),
    supabase
      .from('store_requests')
      .select('*, user:users(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1),
    supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-lg font-bold text-foreground">{t('title')}</h1>
        </div>
      </header>
      <AdminDashboard
        listings={listingsRes.data ?? []}
        storeRequests={storeRequestsRes.data ?? []}
        users={usersRes.data ?? []}
        listingsCount={listingsRes.count ?? 0}
        storeRequestsCount={storeRequestsRes.count ?? 0}
        usersCount={usersRes.count ?? 0}
        currentTab={tab}
        currentPage={page}
        pageSize={limit}
      />
    </div>
  );
}
