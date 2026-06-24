'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FileText, BadgeCheck, ShieldOff, Ban, Power } from 'lucide-react';
import {
  adminApproveStoreRequest,
  adminRejectStoreRequest,
  adminGetStoreDocUrl,
  adminRevokeStoreVerification,
  adminReverifyStore,
  adminSuspendStore,
  adminUnsuspendStore,
} from '@/lib/adminActions';
import { formatBusinessNumber } from '@/lib/businessNumber';
import type { Store, StoreRequest } from '@/types';

type ReasonAction = { kind: 'reject' | 'revoke' | 'suspend'; id: string };

export default function StoreAdminClient({
  pending,
  stores,
  canModerate,
}: {
  pending: StoreRequest[];
  stores: Store[];
  canModerate: boolean;
}) {
  const router = useRouter();
  const t = useTranslations('admin.storesPage');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [reasonModal, setReasonModal] = useState<ReasonAction | null>(null);
  const [reason, setReason] = useState('');

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError('');
    try {
      await fn();
      setReasonModal(null);
      setReason('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const viewDoc = async (path: string) => {
    const url = await adminGetStoreDocUrl(path);
    if (url) window.open(url, '_blank', 'noopener');
  };

  const submitReason = () => {
    if (!reasonModal) return;
    const { kind, id } = reasonModal;
    if (kind === 'reject') return run(`reject-${id}`, () => adminRejectStoreRequest(id, reason));
    if (kind === 'revoke') return run(`revoke-${id}`, () => adminRevokeStoreVerification(id, reason));
    return run(`suspend-${id}`, () => adminSuspendStore(id, reason));
  };

  const statusTone: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    suspended: 'bg-destructive/10 text-destructive',
    inactive: 'bg-secondary text-muted-foreground',
  };

  return (
    <div className="space-y-8">
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {/* Pending applications */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t('pendingTitle')} ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-border bg-card py-8 text-center text-sm text-muted-foreground">{t('noPending')}</p>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label={t('businessName')} value={r.business_name || r.name} />
                  <Field label={t('regNumber')} value={r.business_reg_number ? formatBusinessNumber(r.business_reg_number) : '—'} />
                  <Field label={t('category')} value={r.category || '—'} />
                  <Field label={t('contact')} value={r.contact || '—'} />
                  <Field label={t('applicant')} value={(r as { user?: { nickname?: string } }).user?.nickname || r.user_id.slice(0, 8)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.document_url && (
                    <button onClick={() => viewDoc(r.document_url!)} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">
                      <FileText size={14} /> {t('viewDoc')}
                    </button>
                  )}
                  {canModerate && (
                    <>
                      <button onClick={() => run(`approve-${r.id}`, () => adminApproveStoreRequest(r.id))} disabled={busy !== null}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">{t('approve')}</button>
                      <button onClick={() => { setReasonModal({ kind: 'reject', id: r.id }); setReason(''); }} disabled={busy !== null}
                        className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-40">{t('reject')}</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Existing stores */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t('storesTitle')} ({stores.length})</h2>
        {stores.length === 0 ? (
          <p className="rounded-xl border border-border bg-card py-8 text-center text-sm text-muted-foreground">{t('noStores')}</p>
        ) : (
          <div className="space-y-2">
            {stores.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/stores/${s.id}`} className="truncate text-sm font-medium text-foreground hover:text-primary">{s.business_name || s.name}</Link>
                    {s.verified && <BadgeCheck size={15} className="text-primary" />}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone[s.status] ?? statusTone.inactive}`}>{t(`status.${s.status}`)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.business_reg_number ? formatBusinessNumber(s.business_reg_number) : '—'}</p>
                </div>
                {canModerate && (
                  <div className="flex flex-wrap gap-2">
                    {s.verified ? (
                      <button onClick={() => { setReasonModal({ kind: 'revoke', id: s.id }); setReason(''); }} disabled={busy !== null}
                        className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground disabled:opacity-40"><ShieldOff size={13} /> {t('revoke')}</button>
                    ) : (
                      <button onClick={() => run(`reverify-${s.id}`, () => adminReverifyStore(s.id))} disabled={busy !== null}
                        className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground disabled:opacity-40"><BadgeCheck size={13} /> {t('reverify')}</button>
                    )}
                    {s.status === 'suspended' ? (
                      <button onClick={() => run(`unsuspend-${s.id}`, () => adminUnsuspendStore(s.id))} disabled={busy !== null}
                        className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"><Power size={13} /> {t('unsuspend')}</button>
                    ) : (
                      <button onClick={() => { setReasonModal({ kind: 'suspend', id: s.id }); setReason(''); }} disabled={busy !== null}
                        className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-40"><Ban size={13} /> {t('suspend')}</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {reasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm" onClick={() => setReasonModal(null)}>
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-card p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground">{t(`reasonTitle.${reasonModal.kind}`)}</h3>
            <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={3} placeholder={t('reasonPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setReasonModal(null)} className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground">{t('cancel')}</button>
              <button onClick={submitReason} disabled={busy !== null || !reason.trim()} className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-40">{t('confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}
