'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AlertTriangle, Ban, Clock, Power } from 'lucide-react';
import { adminCancelAuction, adminExtendAuction, adminForceCloseAuction, adminVoidBid } from '@/lib/adminActions';
import { formatPrice, formatRelativeTime } from '@/lib/utils';

export interface AuctionBid {
  id: string;
  bidderName: string;
  amount: number;
  created_at: string;
}
export interface AuctionRow {
  id: string;
  title: string;
  status: string;
  currentBid: number | null;
  auctionEnd: string | null;
  bidderCount: number;
  suspicious: boolean;
  bids: AuctionBid[];
}

type Modal =
  | { kind: 'cancel' | 'voidbid'; id: string }
  | { kind: 'extend'; id: string };

export default function AuctionOversightClient({ rows, canModerate }: { rows: AuctionRow[]; canModerate: boolean }) {
  const router = useRouter();
  const t = useTranslations('admin.auctions');
  const [open, setOpen] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [reason, setReason] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      setModal(null);
      setReason('');
      setEnd('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const submitModal = () => {
    if (!modal) return;
    if (modal.kind === 'cancel') return run(() => adminCancelAuction(modal.id, reason));
    if (modal.kind === 'voidbid') return run(() => adminVoidBid(modal.id, reason));
    if (modal.kind === 'extend') return run(() => adminExtendAuction(modal.id, new Date(end).toISOString()));
  };

  const statusTone: Record<string, string> = {
    live: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    ended: 'bg-secondary text-muted-foreground',
    cancelled: 'bg-destructive/10 text-destructive',
  };
  const active = (s: string) => s === 'live' || s === 'scheduled';

  return (
    <div className="space-y-3">
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        rows.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/listing/${a.id}`} className="truncate text-sm font-semibold text-foreground hover:text-primary">{a.title}</Link>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone[a.status] ?? statusTone.ended}`}>{t(`status.${a.status}`)}</span>
                  {a.suspicious && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <AlertTriangle size={12} /> {t('suspicious')}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('currentBid')}: {a.currentBid != null ? formatPrice(a.currentBid) : '—'} · {t('bidders', { count: a.bidderCount })}
                  {a.auctionEnd ? ` · ${t('ends')} ${formatRelativeTime(a.auctionEnd)}` : ''}
                </p>
              </div>
              {canModerate && (
                <div className="flex flex-shrink-0 flex-wrap gap-2">
                  {active(a.status) && (
                    <>
                      <button onClick={() => { setModal({ kind: 'extend', id: a.id }); setEnd(''); setError(''); }} disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground disabled:opacity-40"><Clock size={13} /> {t('extend')}</button>
                      <button onClick={() => run(() => adminForceCloseAuction(a.id))} disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground disabled:opacity-40"><Power size={13} /> {t('forceClose')}</button>
                      <button onClick={() => { setModal({ kind: 'cancel', id: a.id }); setReason(''); setError(''); }} disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-40"><Ban size={13} /> {t('cancel')}</button>
                    </>
                  )}
                  {a.bids.length > 0 && (
                    <button onClick={() => setOpen(open === a.id ? null : a.id)} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">
                      {open === a.id ? t('hideBids') : t('showBids', { count: a.bids.length })}
                    </button>
                  )}
                </div>
              )}
            </div>

            {open === a.id && a.bids.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-border pt-3">
                {a.bids.map((b) => (
                  <li key={b.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{formatPrice(b.amount)} <span className="text-muted-foreground">· {b.bidderName} · {formatRelativeTime(b.created_at)}</span></span>
                    {canModerate && (
                      <button onClick={() => { setModal({ kind: 'voidbid', id: b.id }); setReason(''); setError(''); }} disabled={busy}
                        className="rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive disabled:opacity-40">{t('voidBid')}</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-card p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground">{t(`modalTitle.${modal.kind}`)}</h3>
            {modal.kind === 'extend' ? (
              <input type="datetime-local" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={end} onChange={(e) => setEnd(e.target.value)} />
            ) : (
              <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={3} placeholder={t('reasonPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} />
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground">{t('cancelBtn')}</button>
              <button onClick={submitModal} disabled={busy || (modal.kind === 'extend' ? !end : !reason.trim())}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">{t('confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
