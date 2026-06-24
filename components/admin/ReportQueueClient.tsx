'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { adminAssignReport, adminResolveReport, adminDeleteListing } from '@/lib/adminActions';
import { formatRelativeTime } from '@/lib/utils';
import type { ReportStatus } from '@/types';

export interface ReportRow {
  id: string;
  reason: string;
  status: ReportStatus;
  details: string | null;
  created_at: string;
  reporterName: string | null;
  assigneeName: string | null;
  targetType: string;
  targetId: string;
  targetLabel: string;
  targetHref: string | null;
}

interface Filters {
  status: string;
  reason: string;
  target: string;
}

export default function ReportQueueClient({
  rows,
  total,
  page,
  pageSize,
  filters,
  canModerate,
}: {
  rows: ReportRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: Filters;
  canModerate: boolean;
}) {
  const router = useRouter();
  const t = useTranslations('admin.moderation');
  const [local, setLocal] = useState<Filters>(filters);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [resolveFor, setResolveFor] = useState<ReportRow | null>(null);
  const [resStatus, setResStatus] = useState<ReportStatus>('actioned');
  const [resolution, setResolution] = useState('');

  const apply = (next: Partial<Filters> & { page?: number }) => {
    const merged = { ...local, ...next };
    const q = new URLSearchParams();
    if (merged.status) q.set('status', merged.status);
    if (merged.reason) q.set('reason', merged.reason);
    if (merged.target) q.set('target', merged.target);
    q.set('page', String(next.page ?? 0));
    router.push(`/admin/moderation?${q.toString()}`);
  };

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError('');
    try {
      await fn();
      setResolveFor(null);
      setResolution('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const inputCls = 'rounded-lg border border-border bg-background px-3 py-2 text-sm';
  const statusTone: Record<string, string> = {
    open: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    in_review: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    actioned: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    dismissed: 'bg-secondary text-muted-foreground',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <select className={inputCls} value={local.status} onChange={(e) => apply({ status: e.target.value })}>
          <option value="">{t('allStatuses')}</option>
          {['open', 'in_review', 'actioned', 'dismissed'].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </select>
        <select className={inputCls} value={local.reason} onChange={(e) => apply({ reason: e.target.value })}>
          <option value="">{t('allReasons')}</option>
          {['spam', 'scam', 'prohibited', 'counterfeit', 'harassment', 'wrong_category', 'other'].map((r) => <option key={r} value={r}>{t(`reasons.${r}`)}</option>)}
        </select>
        <select className={inputCls} value={local.target} onChange={(e) => apply({ target: e.target.value })}>
          <option value="">{t('allTargets')}</option>
          {['listing', 'user', 'message', 'conversation'].map((tt) => <option key={tt} value={tt}>{t(`targets.${tt}`)}</option>)}
        </select>
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone[r.status]}`}>{t(`status.${r.status}`)}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{t(`reasons.${r.reason}`)}</span>
                    <span className="text-xs text-muted-foreground">{t(`targets.${r.targetType}`)}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-foreground">
                    {r.targetHref ? (
                      <Link href={r.targetHref} className="hover:text-primary">{r.targetLabel}</Link>
                    ) : r.targetLabel}
                  </p>
                  {r.details && <p className="mt-1 text-sm text-muted-foreground">{r.details}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('byReporter', { name: r.reporterName ?? '—' })} · {formatRelativeTime(r.created_at)}
                    {r.assigneeName ? ` · ${t('assignedTo', { name: r.assigneeName })}` : ''}
                  </p>
                </div>
                {canModerate && (
                  <div className="flex flex-shrink-0 flex-wrap gap-2">
                    {r.status === 'open' && (
                      <button onClick={() => run(`assign-${r.id}`, () => adminAssignReport(r.id))} disabled={busy !== null}
                        className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground disabled:opacity-40">
                        {t('claim')}
                      </button>
                    )}
                    {r.targetType === 'listing' && (
                      <button onClick={() => run(`rm-${r.id}`, () => adminDeleteListing(r.targetId, `report:${r.reason}`))} disabled={busy !== null}
                        className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-40">
                        {t('removeListing')}
                      </button>
                    )}
                    {(r.status === 'open' || r.status === 'in_review') && (
                      <button onClick={() => { setResolveFor(r); setResStatus('actioned'); setResolution(''); }} disabled={busy !== null}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">
                        {t('resolve')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t('countLabel', { count: total })}</span>
        <div className="flex gap-2">
          <button disabled={page <= 0} onClick={() => apply({ page: page - 1 })} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">{t('prev')}</button>
          <button disabled={page >= lastPage} onClick={() => apply({ page: page + 1 })} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">{t('next')}</button>
        </div>
      </div>

      {/* Resolve modal */}
      {resolveFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm" onClick={() => setResolveFor(null)}>
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-card p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground">{t('resolveTitle')}</h3>
            <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={resStatus} onChange={(e) => setResStatus(e.target.value as ReportStatus)}>
              <option value="actioned">{t('status.actioned')}</option>
              <option value="dismissed">{t('status.dismissed')}</option>
            </select>
            <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={3} placeholder={t('resolutionPlaceholder')} value={resolution} onChange={(e) => setResolution(e.target.value)} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setResolveFor(null)} className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground">{t('cancel')}</button>
              <button onClick={() => run(`resolve-${resolveFor.id}`, () => adminResolveReport(resolveFor.id, resStatus, resolution))} disabled={busy !== null || !resolution.trim()}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
