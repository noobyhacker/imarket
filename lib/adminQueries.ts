import { createAdminSupabaseClient } from '@/lib/supabaseServer';

// Admin dashboard read models. Every count is defensive (a missing table or
// column — e.g. reports/account_status before their phase lands — resolves to
// 0 instead of throwing) so the dashboard always renders.

type SupabaseAdmin = Awaited<ReturnType<typeof createAdminSupabaseClient>>;

async function safeCount(fn: () => PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  try {
    const { count, error } = await fn();
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export interface AdminKpis {
  totalUsers: number;
  signups24h: number;
  signups7d: number;
  activeListings: number;
  liveAuctions: number;
  pendingStores: number;
  openReports: number;
  flaggedUsers: number; // suspended + banned
}

export async function getAdminKpis(): Promise<AdminKpis> {
  const supabase = await createAdminSupabaseClient();
  const head = { count: 'exact' as const, head: true };

  const [
    totalUsers,
    signups24h,
    signups7d,
    activeListings,
    liveAuctions,
    pendingStores,
    openReports,
    flaggedUsers,
  ] = await Promise.all([
    safeCount(() => supabase.from('users').select('*', head)),
    safeCount(() => supabase.from('users').select('*', head).gte('created_at', isoDaysAgo(1))),
    safeCount(() => supabase.from('users').select('*', head).gte('created_at', isoDaysAgo(7))),
    safeCount(() => supabase.from('listings').select('*', head).eq('status', 'active')),
    safeCount(() => supabase.from('listings').select('*', head).eq('sale_type', 'auction').eq('auction_status', 'live')),
    safeCount(() => supabase.from('store_requests').select('*', head).eq('status', 'pending')),
    safeCount(() => supabase.from('reports').select('*', head).eq('status', 'open')),
    safeCount(() => supabase.from('users').select('*', head).in('account_status', ['suspended', 'banned'])),
  ]);

  return { totalUsers, signups24h, signups7d, activeListings, liveAuctions, pendingStores, openReports, flaggedUsers };
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

/** Daily counts of created rows for a table over the last `days` days. */
async function dailyTrend(
  supabase: SupabaseAdmin,
  table: 'users' | 'listings',
  days: number
): Promise<TrendPoint[]> {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10), 0);
  }
  try {
    const { data } = await supabase
      .from(table)
      .select('created_at')
      .gte('created_at', isoDaysAgo(days));
    for (const row of (data ?? []) as { created_at: string }[]) {
      const key = row.created_at.slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  } catch {
    /* keep zeroed buckets */
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

export async function getAdminTrends(days = 30): Promise<{ signups: TrendPoint[]; listings: TrendPoint[] }> {
  const supabase = await createAdminSupabaseClient();
  const [signups, listings] = await Promise.all([
    dailyTrend(supabase, 'users', days),
    dailyTrend(supabase, 'listings', days),
  ]);
  return { signups, listings };
}
