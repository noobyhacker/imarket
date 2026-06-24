'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Trash2, RefreshCw } from 'lucide-react';
import {
  adminAddBannedKeyword,
  adminDeleteBannedKeyword,
  adminSetFeatureFlag,
  adminRescanProhibited,
} from '@/lib/adminActions';
import type { Database } from '@/types/database.types';
import type { ReportReason } from '@/types';

type Keyword = Database['public']['Tables']['banned_keywords']['Row'];
type Flag = Database['public']['Tables']['feature_flags']['Row'];

const REASONS: ReportReason[] = ['prohibited', 'counterfeit', 'scam', 'spam', 'harassment', 'wrong_category', 'other'];

export default function SettingsClient({ keywords, flags }: { keywords: Keyword[]; flags: Flag[] }) {
  const router = useRouter();
  const t = useTranslations('admin.settings');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [kw, setKw] = useState('');
  const [cat, setCat] = useState<ReportReason>('prohibited');
  const [rescanMsg, setRescanMsg] = useState('');

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await fn(); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-8">
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {/* Maintenance + feature flags */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t('flagsTitle')}</h2>
        <div className="space-y-2">
          {flags.map((f) => (
            <div key={f.key} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{f.key === 'maintenance_mode' ? t('maintenanceMode') : f.key}</p>
                {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
              </div>
              <button
                onClick={() => run(() => adminSetFeatureFlag(f.key, !f.enabled, f.description ?? undefined))}
                disabled={busy}
                className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-40 ${f.enabled ? 'bg-primary' : 'bg-secondary'}`}
                aria-pressed={f.enabled}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${f.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Banned keywords */}
      <section>
        <h2 className="mb-1 text-sm font-semibold text-foreground">{t('keywordsTitle')}</h2>
        <p className="mb-3 text-xs text-muted-foreground">{t('keywordsHint')}</p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={t('keywordPlaceholder')} value={kw} onChange={(e) => setKw(e.target.value)} />
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={cat} onChange={(e) => setCat(e.target.value as ReportReason)}>
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={() => run(async () => { await adminAddBannedKeyword(kw, cat); setKw(''); })} disabled={busy || !kw.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">{t('addKeyword')}</button>
          <button onClick={() => run(async () => { const n = await adminRescanProhibited(); setRescanMsg(t('rescanResult', { count: n })); })} disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground disabled:opacity-40"><RefreshCw size={14} /> {t('rescan')}</button>
        </div>
        {rescanMsg && <p className="mb-2 text-xs text-muted-foreground">{rescanMsg}</p>}
        <div className="flex flex-wrap gap-2">
          {keywords.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noKeywords')}</p>
          ) : (
            keywords.map((k) => (
              <span key={k.id} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                {k.keyword} <span className="text-xs text-muted-foreground">({k.category})</span>
                <button onClick={() => run(() => adminDeleteBannedKeyword(k.id))} disabled={busy} className="text-destructive disabled:opacity-40"><Trash2 size={13} /></button>
              </span>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
