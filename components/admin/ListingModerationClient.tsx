'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { adminBulkRemoveListings, adminSetListingCategory } from '@/lib/adminActions';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import type { Listing, ListingCategory } from '@/types';

const CATEGORIES: ListingCategory[] = ['electronics', 'furniture', 'clothing', 'vehicles', 'home_appliances', 'books', 'services', 'other'];

export default function ListingModerationClient({
  rows,
  total,
  page,
  pageSize,
  search,
  canModerate,
}: {
  rows: Listing[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  canModerate: boolean;
}) {
  const router = useRouter();
  const t = useTranslations('admin.moderation');
  const tCat = useTranslations('categories');
  const [q, setQ] = useState(search);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [reason, setReason] = useState('');

  const nav = (params: { q?: string; page?: number }) => {
    const sp = new URLSearchParams();
    sp.set('view', 'listings');
    if (params.q ?? q) sp.set('q', params.q ?? q);
    sp.set('page', String(params.page ?? 0));
    router.push(`/admin/moderation?${sp.toString()}`);
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      setBulkOpen(false);
      setReason('');
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder={t('searchListings')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && nav({ page: 0 })}
        />
        <button onClick={() => nav({ page: 0 })} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{t('apply')}</button>
        {canModerate && selected.size > 0 && (
          <button onClick={() => setBulkOpen(true)} className="rounded-lg bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive">
            {t('bulkRemove', { count: selected.size })}
          </button>
        )}
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">{t('noListings')}</p>
        ) : (
          rows.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              {canModerate && (
                <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} className="h-4 w-4" />
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/listing/${l.id}`} className="truncate text-sm font-medium text-foreground hover:text-primary">{l.title_original}</Link>
                <p className="text-xs text-muted-foreground">{formatPrice(l.price)} · {formatRelativeTime(l.created_at)}</p>
              </div>
              {canModerate && (
                <select
                  className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                  value={l.category}
                  disabled={busy}
                  onChange={(e) => run(() => adminSetListingCategory(l.id, e.target.value as ListingCategory))}
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{tCat(c as Parameters<typeof tCat>[0])}</option>)}
                </select>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t('countLabel', { count: total })}</span>
        <div className="flex gap-2">
          <button disabled={page <= 0} onClick={() => nav({ page: page - 1 })} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">{t('prev')}</button>
          <button disabled={page >= lastPage} onClick={() => nav({ page: page + 1 })} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">{t('next')}</button>
        </div>
      </div>

      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm" onClick={() => setBulkOpen(false)}>
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-card p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground">{t('bulkRemoveTitle', { count: selected.size })}</h3>
            <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={3} placeholder={t('reasonPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setBulkOpen(false)} className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground">{t('cancel')}</button>
              <button onClick={() => run(() => adminBulkRemoveListings([...selected], reason))} disabled={busy || !reason.trim()}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-40">{t('confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
