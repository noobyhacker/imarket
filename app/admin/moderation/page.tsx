import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { getAdminContext } from '@/lib/adminAuth';
import ReportQueueClient, { type ReportRow } from '@/components/admin/ReportQueueClient';
import ListingModerationClient from '@/components/admin/ListingModerationClient';
import type { Listing } from '@/types';

type RawReport = {
  id: string; reason: string; status: ReportRow['status']; details: string | null;
  created_at: string; reporter_id: string | null; assigned_to: string | null;
  target_type: string; target_id: string;
};

// Access enforced by app/admin/layout.tsx.
export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: { view?: string; status?: string; reason?: string; target?: string; q?: string; page?: string };
}) {
  const t = await getTranslations('admin.moderation');
  const ctx = await getAdminContext();
  const canModerate = ctx?.role === 'moderator' || ctx?.role === 'super_admin';
  const supabase = await createAdminSupabaseClient();

  const view = searchParams.view === 'listings' ? 'listings' : 'reports';
  const page = Math.max(0, parseInt(searchParams.page ?? '0'));
  const limit = 20;

  const tabCls = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold ${active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`;

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-foreground">{t('title')}</h1>
      <div className="mb-4 flex gap-2">
        <Link href="/admin/moderation" className={tabCls(view === 'reports')}>{t('tabReports')}</Link>
        <Link href="/admin/moderation?view=listings" className={tabCls(view === 'listings')}>{t('tabListings')}</Link>
      </div>
      {view === 'reports'
        ? await ReportsView({ supabase, searchParams, page, limit, canModerate })
        : await ListingsView({ supabase, q: searchParams.q?.trim() ?? '', page, limit, canModerate })}
    </div>
  );
}

async function ReportsView({
  supabase, searchParams, page, limit, canModerate,
}: {
  supabase: Awaited<ReturnType<typeof createAdminSupabaseClient>>;
  searchParams: { status?: string; reason?: string; target?: string };
  page: number; limit: number; canModerate: boolean;
}) {
  const status = searchParams.status?.trim() ?? '';
  const reason = searchParams.reason?.trim() ?? '';
  const target = searchParams.target?.trim() ?? '';

  let query = supabase.from('reports').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (reason) query = query.eq('reason', reason);
  if (target) query = query.eq('target_type', target);
  const { data, count } = await query.range(page * limit, (page + 1) * limit - 1);
  const raw = (data ?? []) as RawReport[];

  // Enrich: reporter/assignee nicknames + target labels.
  const userIds = new Set<string>();
  const listingIds = new Set<string>();
  const userTargetIds = new Set<string>();
  for (const r of raw) {
    if (r.reporter_id) userIds.add(r.reporter_id);
    if (r.assigned_to) userIds.add(r.assigned_to);
    if (r.target_type === 'listing') listingIds.add(r.target_id);
    if (r.target_type === 'user') { userTargetIds.add(r.target_id); userIds.add(r.target_id); }
  }
  const [usersRes, listingsRes] = await Promise.all([
    userIds.size ? supabase.from('users').select('id, nickname').in('id', [...userIds]) : Promise.resolve({ data: [] }),
    listingIds.size ? supabase.from('listings').select('id, title_original').in('id', [...listingIds]) : Promise.resolve({ data: [] }),
  ]);
  const nameById = new Map((usersRes.data ?? []).map((u: { id: string; nickname: string }) => [u.id, u.nickname]));
  const titleById = new Map((listingsRes.data ?? []).map((l: { id: string; title_original: string }) => [l.id, l.title_original]));

  const rows: ReportRow[] = raw.map((r) => {
    let targetLabel = r.target_id.slice(0, 8);
    let targetHref: string | null = null;
    if (r.target_type === 'listing') { targetLabel = titleById.get(r.target_id) ?? targetLabel; targetHref = `/listing/${r.target_id}`; }
    else if (r.target_type === 'user') { targetLabel = nameById.get(r.target_id) ?? targetLabel; targetHref = `/admin/users/${r.target_id}`; }
    return {
      id: r.id, reason: r.reason, status: r.status, details: r.details, created_at: r.created_at,
      reporterName: r.reporter_id ? nameById.get(r.reporter_id) ?? null : null,
      assigneeName: r.assigned_to ? nameById.get(r.assigned_to) ?? null : null,
      targetType: r.target_type, targetId: r.target_id, targetLabel, targetHref,
    };
  });

  return <ReportQueueClient rows={rows} total={count ?? 0} page={page} pageSize={limit} canModerate={canModerate} filters={{ status, reason, target }} />;
}

async function ListingsView({
  supabase, q, page, limit, canModerate,
}: {
  supabase: Awaited<ReturnType<typeof createAdminSupabaseClient>>;
  q: string; page: number; limit: number; canModerate: boolean;
}) {
  let query = supabase.from('listings').select('*', { count: 'exact' }).eq('status', 'active').order('created_at', { ascending: false });
  if (q) query = query.or(`title_original.ilike.%${q}%,description_original.ilike.%${q}%`);
  const { data, count } = await query.range(page * limit, (page + 1) * limit - 1);
  return <ListingModerationClient rows={(data ?? []) as Listing[]} total={count ?? 0} page={page} pageSize={limit} search={q} canModerate={canModerate} />;
}
