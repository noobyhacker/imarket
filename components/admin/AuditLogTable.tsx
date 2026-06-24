'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';
import type { Database } from '@/types/database.types';

type AuditRow = Database['public']['Tables']['admin_audit_log']['Row'];

interface Filters {
  actor: string;
  action: string;
  target: string;
  from: string;
  to: string;
}

const TARGET_TYPES = ['', 'listing', 'store_request', 'store', 'user', 'bid', 'auction', 'message', 'conversation', 'config', 'announcement'];

export default function AuditLogTable({
  rows,
  total,
  page,
  pageSize,
  filters,
}: {
  rows: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: Filters;
}) {
  const router = useRouter();
  const t = useTranslations('admin.audit');
  const [local, setLocal] = useState<Filters>(filters);

  const apply = (next: Partial<Filters> & { page?: number }) => {
    const merged = { ...local, ...next };
    const q = new URLSearchParams();
    if (merged.actor) q.set('actor', merged.actor);
    if (merged.action) q.set('action', merged.action);
    if (merged.target) q.set('target', merged.target);
    if (merged.from) q.set('from', merged.from);
    if (merged.to) q.set('to', merged.to);
    q.set('page', String(next.page ?? 0));
    router.push(`/admin/audit?${q.toString()}`);
  };

  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const inputCls = 'rounded-lg border border-border bg-background px-3 py-2 text-sm';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2">
        <input
          className={inputCls}
          placeholder={t('filterActor')}
          value={local.actor}
          onChange={(e) => setLocal({ ...local, actor: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && apply({})}
        />
        <input
          className={inputCls}
          placeholder={t('filterAction')}
          value={local.action}
          onChange={(e) => setLocal({ ...local, action: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && apply({})}
        />
        <select
          className={inputCls}
          value={local.target}
          onChange={(e) => apply({ target: e.target.value })}
        >
          {TARGET_TYPES.map((tt) => (
            <option key={tt} value={tt}>{tt === '' ? t('allTargets') : tt}</option>
          ))}
        </select>
        <input type="date" className={inputCls} value={local.from} onChange={(e) => apply({ from: e.target.value })} />
        <input type="date" className={inputCls} value={local.to} onChange={(e) => apply({ to: e.target.value })} />
        <button
          onClick={() => apply({})}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          {t('apply')}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t('colWhen')}</th>
              <th className="px-3 py-2">{t('colActor')}</th>
              <th className="px-3 py-2">{t('colAction')}</th>
              <th className="px-3 py-2">{t('colTarget')}</th>
              <th className="px-3 py-2">{t('colReason')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">{t('empty')}</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground" title={r.created_at}>
                    {formatRelativeTime(r.created_at)}
                  </td>
                  <td className="px-3 py-2">{r.actor_email ?? r.actor_id ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-foreground">{r.action}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.target_type ? `${r.target_type}${r.target_id ? `:${r.target_id.slice(0, 8)}` : ''}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.reason ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t('countLabel', { count: total })}</span>
        <div className="flex gap-2">
          <button
            disabled={page <= 0}
            onClick={() => apply({ page: page - 1 })}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
          >
            {t('prev')}
          </button>
          <button
            disabled={page >= lastPage}
            onClick={() => apply({ page: page + 1 })}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
          >
            {t('next')}
          </button>
        </div>
      </div>
    </div>
  );
}
