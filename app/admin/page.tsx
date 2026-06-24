import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import AdminDashboard from '@/components/admin/AdminDashboard';
import TopNav from '@/components/TopNav';
import { getCurrentUser } from '@/lib/queries';
import type { Conversation, Listing, StoreRequest, UserProfile } from '@/types';

// Server-side admin check using NON-public env vars (never trust the client).
function isAdminEmail(email: string | null | undefined) {
  const allowList = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!email || allowList.length === 0) return false;
  return allowList.includes(email.trim().toLowerCase());
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string; q?: string };
}) {
  const t = await getTranslations('admin');

  // Gate access BEFORE touching the service-role client or any data.
  const currentUser = await getCurrentUser().catch(() => null);
  if (!currentUser || (!currentUser.is_admin && !isAdminEmail(currentUser.email))) {
    redirect('/');
  }

  const supabase = await createAdminSupabaseClient();
  const tab = searchParams.tab ?? 'listings';
  const page = parseInt(searchParams.page ?? '0');
  const q = searchParams.q?.trim() ?? '';
  const limit = 20;

  let listingsQuery = supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .neq('status', 'deleted')
    .order('created_at', { ascending: false });
  if (q) {
    listingsQuery = listingsQuery.or(`title_original.ilike.%${q}%,title_translated.ilike.%${q}%,location.ilike.%${q}%`);
  }

  let storeRequestsQuery = supabase
    .from('store_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (q) {
    storeRequestsQuery = storeRequestsQuery.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }

  let usersQuery = supabase
    .from('users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (q) {
    usersQuery = usersQuery.or(`nickname.ilike.%${q}%,email.ilike.%${q}%`);
  }

  let chatsQuery = supabase
    .from('conversations')
    .select(`*, listing:listings(id,title_original,images,price), buyer:users!conversations_buyer_id_fkey(*), seller:users!conversations_seller_id_fkey(*)`, { count: 'exact' })
    .order('last_message_at', { ascending: false });
  if (q && tab === 'chats') {
    chatsQuery = chatsQuery.or(`last_message.ilike.%${q}%`);
  }

  const [listingsRes, storeRequestsRes, usersRes, chatsRes] = await Promise.all([
    listingsQuery.range(page * limit, (page + 1) * limit - 1),
    storeRequestsQuery.range(page * limit, (page + 1) * limit - 1),
    usersQuery.range(page * limit, (page + 1) * limit - 1),
    tab === 'chats' ? chatsQuery.range(page * limit, (page + 1) * limit - 1) : Promise.resolve({ data: [], count: 0, error: null }),
  ]);

  const users = (usersRes.data ?? []) as UserProfile[];
  const userMap = new Map(users.map((user) => [user.id, user]));
  const listings = ((listingsRes.data ?? []) as Listing[]).map((listing) => ({
    ...listing,
    seller: userMap.get(listing.user_id),
  }));
  const storeRequests = ((storeRequestsRes.data ?? []) as StoreRequest[]).map((request) => ({
    ...request,
    user: userMap.get(request.user_id),
  }));
  const conversations = (chatsRes.data ?? []) as unknown as Conversation[];

  return (
    <div className="min-h-screen bg-background">
      <TopNav user={currentUser} />
      <header className="border-b border-border bg-card/80 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-lg font-bold text-foreground">{t('title')}</h1>
        </div>
      </header>
      <AdminDashboard
        listings={listings}
        storeRequests={storeRequests}
        users={users}
        conversations={conversations}
        listingsCount={listingsRes.count ?? 0}
        storeRequestsCount={storeRequestsRes.count ?? 0}
        usersCount={usersRes.count ?? 0}
        chatsCount={chatsRes.count ?? 0}
        currentTab={tab}
        currentPage={page}
        pageSize={limit}
        searchQuery={q}
      />
    </div>
  );
}
