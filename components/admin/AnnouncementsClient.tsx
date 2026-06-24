'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Trash2, Pencil, Plus } from 'lucide-react';
import { adminSaveAnnouncement, adminToggleAnnouncement, adminDeleteAnnouncement, type AnnouncementInput } from '@/lib/adminActions';
import type { Announcement, AnnouncementAudience } from '@/types';

const AUDIENCES: AnnouncementAudience[] = ['all', 'buyers', 'sellers', 'stores', 'country'];
const LANGS = ['en', 'ko', 'ru'] as const;

type LocaleText = { en?: string; ko?: string; ru?: string };

function emptyForm(): AnnouncementInput {
  return { title: { en: '', ko: '', ru: '' }, body: { en: '', ko: '', ru: '' }, audience: 'all', country_code: '', starts_at: '', ends_at: '', published: false };
}

export default function AnnouncementsClient({ items }: { items: Announcement[] }) {
  const router = useRouter();
  const t = useTranslations('admin.announcements');
  const [form, setForm] = useState<AnnouncementInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await fn(); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const startEdit = (a: Announcement) => {
    const title = (a.title ?? {}) as LocaleText;
    const body = (a.body ?? {}) as LocaleText;
    setForm({
      id: a.id,
      title: { en: title.en ?? '', ko: title.ko ?? '', ru: title.ru ?? '' },
      body: { en: body.en ?? '', ko: body.ko ?? '', ru: body.ru ?? '' },
      audience: a.audience,
      country_code: a.country_code ?? '',
      starts_at: a.starts_at ? a.starts_at.slice(0, 16) : '',
      ends_at: a.ends_at ? a.ends_at.slice(0, 16) : '',
      published: a.published,
    });
  };

  const save = () =>
    run(async () => {
      await adminSaveAnnouncement({
        ...form!,
        starts_at: form!.starts_at ? new Date(form!.starts_at).toISOString() : null,
        ends_at: form!.ends_at ? new Date(form!.ends_at).toISOString() : null,
      });
      setForm(null);
    });

  const input = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm';

  return (
    <div className="space-y-6">
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {!form && (
        <button onClick={() => setForm(emptyForm())} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus size={15} /> {t('new')}
        </button>
      )}

      {form && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">{form.id ? t('editTitle') : t('newTitle')}</h2>
          {LANGS.map((l) => (
            <div key={l} className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input className={input} placeholder={`${t('titleLabel')} (${l.toUpperCase()})`} value={form.title[l]} onChange={(e) => setForm({ ...form, title: { ...form.title, [l]: e.target.value } })} />
              <input className={input} placeholder={`${t('bodyLabel')} (${l.toUpperCase()})`} value={form.body[l]} onChange={(e) => setForm({ ...form, body: { ...form.body, [l]: e.target.value } })} />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <select className={input + ' max-w-[180px]'} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as AnnouncementAudience })}>
              {AUDIENCES.map((a) => <option key={a} value={a}>{t(`audience.${a}`)}</option>)}
            </select>
            {form.audience === 'country' && (
              <input className={input + ' max-w-[140px]'} placeholder={t('countryCode')} value={form.country_code ?? ''} onChange={(e) => setForm({ ...form, country_code: e.target.value.toUpperCase() })} />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="text-xs text-muted-foreground">{t('startsAt')}<input type="datetime-local" className={input} value={form.starts_at ?? ''} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></label>
            <label className="text-xs text-muted-foreground">{t('endsAt')}<input type="datetime-local" className={input} value={form.ends_at ?? ''} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></label>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> {t('published')}
          </label>
          <div className="flex gap-3">
            <button onClick={() => setForm(null)} disabled={busy} className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground disabled:opacity-40">{t('cancel')}</button>
            <button onClick={save} disabled={busy} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">{t('save')}</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="rounded-xl border border-border bg-card py-8 text-center text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          items.map((a) => {
            const title = (a.title ?? {}) as LocaleText;
            return (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{title.en || title.ko || title.ru || '—'}</p>
                  <p className="text-xs text-muted-foreground">{t(`audience.${a.audience}`)}{a.country_code ? ` · ${a.country_code}` : ''} · {a.published ? t('statusPublished') : t('statusDraft')}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => run(() => adminToggleAnnouncement(a.id, !a.published))} disabled={busy} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground disabled:opacity-40">{a.published ? t('unpublish') : t('publish')}</button>
                  <button onClick={() => startEdit(a)} disabled={busy} className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs text-foreground disabled:opacity-40"><Pencil size={13} /></button>
                  <button onClick={() => run(() => adminDeleteAnnouncement(a.id))} disabled={busy} className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive disabled:opacity-40"><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
