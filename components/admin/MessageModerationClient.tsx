'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import {
  adminResolveReport,
  adminWarnUser,
  adminSuspendMessaging,
  adminRemoveMessage,
  adminBanUser,
} from '@/lib/adminActions';
import { formatRelativeTime } from '@/lib/utils';
import type { ReportStatus } from '@/types';

export interface MessageReportRow {
  reportId: string;
  reason: string;
  status: ReportStatus;
  targetType: string;
  conversationId: string | null;
  messageId: string | null;
  subjectUserId: string | null;
  subjectName: string | null;
  reporterName: string | null;
  snippet: string | null;
  createdAt: string;
}

type Modal = { kind: 'warn' | 'suspend' | 'remove' | 'ban' | 'resolve'; row: MessageReportRow };

export default function MessageModerationClient({ rows, canModerate }: { rows: MessageReportRow[]; canModerate: boolean }) {
  const router = useRouter();
  const t = useTranslations('admin.messages');
  const [modal, setModal] = useState<Modal | null>(null);
  const [reason, setReason] = useState('');
  const [resStatus, setResStatus] = useState<ReportStatus>('actioned');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await fn(); setModal(null); setReason(''); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const submit = () => {
    if (!modal) return;
    const { kind, row } = modal;
    if (kind === 'resolve') return run(() => adminResolveReport(row.reportId, resStatus, reason));
    if (kind === 'warn' && row.subjectUserId) return run(() => adminWarnUser(row.subjectUserId!, reason));
    if (kind === 'suspend' && row.subjectUserId) return run(() => adminSuspendMessaging(row.subjectUserId!, reason));
    if (kind === 'remove' && row.messageId) return run(() => adminRemoveMessage(row.messageId!, reason));
    if (kind === 'ban' && row.subjectUserId) return run(() => adminBanUser(row.subjectUserId!, reason));
  };

  const statusTone: Record<string, string> = {
    open: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    in_review: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    actioned: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    dismissed: 'bg-secondary text-muted-foreground',
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t('privacyNote')}</p>
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        rows.map((r) => (
          <div key={r.reportId} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone[r.status]}`}>{t(`status.${r.status}`)}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{t(`reasons.${r.reason}`)}</span>
                  <span className="text-xs text-muted-foreground">{t(`targets.${r.targetType}`)}</span>
                </div>
                {r.snippet && <p className="mt-1.5 line-clamp-2 text-sm text-foreground">“{r.snippet}”</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('byReporter', { name: r.reporterName ?? '—' })}
                  {r.subjectName ? ` · ${t('subject', { name: r.subjectName })}` : ''} · {formatRelativeTime(r.createdAt)}
                </p>
              </div>
              {canModerate && (
                <div className="flex flex-shrink-0 flex-wrap gap-2">
                  {r.conversationId && (
                    <Link href={`/admin/chat/${r.conversationId}`} className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">
                      <MessageSquare size={13} /> {t('openThread')}
                    </Link>
                  )}
                  {r.messageId && <button onClick={() => { setModal({ kind: 'remove', row: r }); setReason(''); setError(''); }} className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">{t('removeMessage')}</button>}
                  {r.subjectUserId && <button onClick={() => { setModal({ kind: 'warn', row: r }); setReason(''); setError(''); }} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">{t('warn')}</button>}
                  {r.subjectUserId && <button onClick={() => { setModal({ kind: 'suspend', row: r }); setReason(''); setError(''); }} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">{t('suspendMessaging')}</button>}
                  {r.subjectUserId && <button onClick={() => { setModal({ kind: 'ban', row: r }); setReason(''); setError(''); }} className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground">{t('escalateBan')}</button>}
                  {(r.status === 'open' || r.status === 'in_review') && <button onClick={() => { setModal({ kind: 'resolve', row: r }); setReason(''); setResStatus('actioned'); setError(''); }} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">{t('resolve')}</button>}
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-card p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground">{t(`modalTitle.${modal.kind}`)}</h3>
            {modal.kind === 'resolve' && (
              <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={resStatus} onChange={(e) => setResStatus(e.target.value as ReportStatus)}>
                <option value="actioned">{t('status.actioned')}</option>
                <option value="dismissed">{t('status.dismissed')}</option>
              </select>
            )}
            <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={3} placeholder={t('reasonPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground">{t('cancel')}</button>
              <button onClick={submit} disabled={busy || !reason.trim()} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">{t('confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
