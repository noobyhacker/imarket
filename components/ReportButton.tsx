'use client';

import { Flag } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createReport } from '@/lib/reportActions';
import type { ReportReason, ReportTarget } from '@/types';

const REASONS: ReportReason[] = ['spam', 'scam', 'prohibited', 'counterfeit', 'harassment', 'wrong_category', 'other'];

export default function ReportButton({
  targetType,
  targetId,
  variant = 'button',
}: {
  targetType: ReportTarget;
  targetId: string;
  variant?: 'button' | 'icon';
}) {
  const t = useTranslations('report');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    setMsg('');
    const res = await createReport({ targetType, targetId, reason, details });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => setOpen(false), 1200);
    } else {
      const key = ['already_reported', 'not_authenticated'].includes(res.error) ? res.error : 'error';
      setMsg(t(key));
    }
  };

  return (
    <>
      {variant === 'icon' ? (
        <button onClick={() => setOpen(true)} aria-label={t('button')} className="text-muted-foreground transition-colors hover:text-destructive">
          <Flag size={18} />
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive">
          <Flag size={15} /> {t('button')}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-sm space-y-3 rounded-2xl bg-card p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground">{t('title')}</h3>
            {done ? (
              <p className="py-4 text-center text-sm font-medium text-green-600">{t('success')}</p>
            ) : (
              <>
                <label className="text-xs font-medium text-muted-foreground">{t('reasonLabel')}</label>
                <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>{t(`reasons.${r}`)}</option>
                  ))}
                </select>
                <textarea
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  rows={3}
                  placeholder={t('detailsPlaceholder')}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
                {msg && <p className="text-sm text-destructive">{msg}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setOpen(false)} disabled={busy} className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground disabled:opacity-40">{t('cancel')}</button>
                  <button onClick={submit} disabled={busy} className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-40">{busy ? '…' : t('submit')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
