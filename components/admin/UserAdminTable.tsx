'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';
import type { UserProfile } from '@/types';

interface Filters {
  q: string;
  status: string;
  role: string;
}

export default function UserAdminTable({
  rows,
  total,
  page,
  pageSize,
  filters,
}: {
  rows: UserProfile[];
  total: number;
  page: number;
  pageSize: number;
  filters: Filters;
}) {
  const router = useRouter();
  const t = useTranslations('admin.usersPage');
  const [local, setLocal] = useState<Filters>(filters);

  const apply = (next: Partial<Filters> & { page?: number }) => {
    const merged = { ...local, ...next };
    const q = new URLSearchParams();
    if (merged.q) q.set('q', merged.q);
    if (merged.status) q.set('status', merged.status);
    if (merged.role) q.set('role', merged.role);
    q.set('page', String(next.page ?? 0));
    router.push(`/admin/users?${q.toString()}`);
  };

  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const inputCls = 'rounded-lg border border-border bg-background px-3 py-2 text-sm';

  const statusBadge = (s: string | null | undefined) => {
    const status = s ?? 'active';
    const tone =
      status === 'banned'
        ? 'bg-destructive/10 text-destructive'
        : status === 'suspended'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{t(`status.${status}`)}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <input
          className={inputCls}
          placeholder={t('searchPlaceholder')}
          value={local.q}
          onChange={(e) => setLocal({ ...local, q: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && apply({})}
        />
        <select className={inputCls} value={local.status} onChange={(e) => apply({ status: e.target.value })}>
          <option value="">{t('allStatuses')}</option>
          <option value="active">{t('status.active')}</option>
          <option value="suspended">{t('status.suspended')}</option>
          <option value="banned">{t('status.banned')}</option>
        </select>
        <select className={inputCls} value={local.role} onChange={(e) => apply({ role: e.target.value })}>
          <option value="">{t('allRoles')}</option>
          <option value="none">{t('role.none')}</option>
          <option value="support">{t('role.support')}</option>
          <option value="moderator">{t('role.moderator')}</option>
          <option value="super_admin">{t('role.super_admin')}</option>
        </select>
        <button onClick={() => apply({})} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          {t('apply')}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t('colUser')}</th>
              <th className="px-3 py-2">{t('colStatus')}</th>
              <th className="px-3 py-2">{t('colRole')}</th>
              <th className="px-3 py-2">{t('colLocation')}</th>
              <th className="px-3 py-2">{t('colJoined')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">{t('empty')}</td></tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="px-3 py-2">
                    <Link href={`/admin/users/${u.id}`} className="font-medium text-foreground hover:text-primary">
                      {u.nickname}
                    </Link>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-3 py-2">{statusBadge((u as { account_status?: string }).account_status)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {u.admin_role ? t(`role.${u.admin_role}`) : '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{u.location ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatRelativeTime(u.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t('countLabel', { count: total })}</span>
        <div className="flex gap-2">
          <button disabled={page <= 0} onClick={() => apply({ page: page - 1 })} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">{t('prev')}</button>
          <button disabled={page >= lastPage} onClick={() => apply({ page: page + 1 })} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">{t('next')}</button>
        </div>
      </div>
    </div>
  );
}
