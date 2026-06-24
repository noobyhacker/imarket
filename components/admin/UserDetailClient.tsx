'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Ban, ShieldCheck, Clock, LogOut, UserCog, StickyNote, AlertTriangle } from 'lucide-react';
import {
  adminSuspendUser,
  adminBanUser,
  adminReinstateUser,
  adminForceLogoutUser,
  adminSetUserRole,
  adminAddUserNote,
} from '@/lib/adminActions';
import { formatRelativeTime } from '@/lib/utils';
import type { AdminRole } from '@/lib/adminAuth';
import type { UserProfile } from '@/types';

export interface UserNote {
  created_at: string;
  actor_email: string | null;
  reason: string | null;
}

interface Props {
  user: UserProfile;
  stats: { listings: number; bids: number; recentListings24h: number };
  notes: UserNote[];
  viewerRole: AdminRole;
}

export default function UserDetailClient({ user, stats, notes, viewerRole }: Props) {
  const router = useRouter();
  const t = useTranslations('admin.userDetail');
  const status = (user as { account_status?: string }).account_status ?? 'active';

  const canModerate = viewerRole === 'moderator' || viewerRole === 'super_admin';
  const isSuper = viewerRole === 'super_admin';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<null | 'suspend' | 'ban' | 'role'>(null);
  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');
  const [role, setRole] = useState<string>(user.admin_role ?? 'none');
  const [note, setNote] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      setModal(null);
      setReason('');
      setUntil('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const statusTone =
    status === 'banned'
      ? 'bg-destructive/10 text-destructive'
      : status === 'suspended'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';

  const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground">{user.nickname}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone}`}>{t(`status.${status}`)}</span>
            {user.admin_role && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{t(`role.${user.admin_role}`)}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground">{user.location ?? '—'} · {t('joined')} {formatRelativeTime(user.created_at)}</p>
          {(user as { status_reason?: string }).status_reason && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{t('reasonLabel')}: {(user as { status_reason?: string }).status_reason}</p>
          )}
        </div>
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {canModerate && status !== 'active' && (
            <button className={`${btn} bg-green-600 text-white`} disabled={busy} onClick={() => run(() => adminReinstateUser(user.id))}>
              <ShieldCheck size={15} /> {t('reinstate')}
            </button>
          )}
          {canModerate && status !== 'suspended' && (
            <button className={`${btn} bg-amber-500 text-white`} disabled={busy} onClick={() => setModal('suspend')}>
              <Clock size={15} /> {t('suspend')}
            </button>
          )}
          {canModerate && status !== 'banned' && (
            <button className={`${btn} bg-destructive text-destructive-foreground`} disabled={busy} onClick={() => setModal('ban')}>
              <Ban size={15} /> {t('ban')}
            </button>
          )}
          {canModerate && (
            <button className={`${btn} bg-secondary text-secondary-foreground`} disabled={busy} onClick={() => run(() => adminForceLogoutUser(user.id))}>
              <LogOut size={15} /> {t('forceLogout')}
            </button>
          )}
          {isSuper && (
            <button className={`${btn} bg-secondary text-secondary-foreground`} disabled={busy} onClick={() => setModal('role')}>
              <UserCog size={15} /> {t('setRole')}
            </button>
          )}
        </div>
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('listings')} value={stats.listings} />
        <Stat label={t('bids')} value={stats.bids} />
        <Stat label={t('recent24h')} value={stats.recentListings24h} />
      </div>

      {/* Fraud signals */}
      {stats.recentListings24h >= 10 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertTriangle size={16} /> {t('fraudRapidListings', { count: stats.recentListings24h })}
        </div>
      )}

      {/* Internal notes */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><StickyNote size={15} /> {t('notesTitle')}</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder={t('addNotePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            disabled={busy || !note.trim()}
            onClick={() => run(async () => { await adminAddUserNote(user.id, note); setNote(''); })}
          >
            {t('addNote')}
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {notes.length === 0 ? (
            <li className="text-xs text-muted-foreground">{t('noNotes')}</li>
          ) : (
            notes.map((n, i) => (
              <li key={i} className="rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                <p className="text-foreground">{n.reason}</p>
                <p className="text-xs text-muted-foreground">{n.actor_email ?? '—'} · {formatRelativeTime(n.created_at)}</p>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Modals */}
      {modal === 'suspend' && (
        <Modal title={t('suspendTitle')} onClose={() => setModal(null)}>
          <label className="text-xs font-medium text-muted-foreground">{t('untilLabel')}</label>
          <input type="datetime-local" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={until} onChange={(e) => setUntil(e.target.value)} />
          <label className="mt-3 text-xs font-medium text-muted-foreground">{t('reasonLabel')}</label>
          <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <ModalActions
            busy={busy}
            disabled={!reason.trim() || !until}
            onCancel={() => setModal(null)}
            onConfirm={() => run(() => adminSuspendUser(user.id, new Date(until).toISOString(), reason))}
            confirmLabel={t('suspend')}
          />
        </Modal>
      )}

      {modal === 'ban' && (
        <Modal title={t('banTitle')} onClose={() => setModal(null)}>
          <label className="text-xs font-medium text-muted-foreground">{t('reasonLabel')}</label>
          <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <ModalActions
            busy={busy}
            disabled={!reason.trim()}
            onCancel={() => setModal(null)}
            onConfirm={() => run(() => adminBanUser(user.id, reason))}
            confirmLabel={t('ban')}
            danger
          />
        </Modal>
      )}

      {modal === 'role' && (
        <Modal title={t('setRoleTitle')} onClose={() => setModal(null)}>
          <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="none">{t('role.none')}</option>
            <option value="support">{t('role.support')}</option>
            <option value="moderator">{t('role.moderator')}</option>
            <option value="super_admin">{t('role.super_admin')}</option>
          </select>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <ModalActions
            busy={busy}
            disabled={false}
            onCancel={() => setModal(null)}
            onConfirm={() => run(() => adminSetUserRole(user.id, role === 'none' ? null : (role as AdminRole)))}
            confirmLabel={t('save')}
          />
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md space-y-2 rounded-2xl bg-card p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ busy, disabled, onCancel, onConfirm, confirmLabel, danger }: {
  busy: boolean; disabled: boolean; onCancel: () => void; onConfirm: () => void; confirmLabel: string; danger?: boolean;
}) {
  const t = useTranslations('admin.userDetail');
  return (
    <div className="mt-4 flex gap-3">
      <button onClick={onCancel} disabled={busy} className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground disabled:opacity-40">{t('cancel')}</button>
      <button
        onClick={onConfirm}
        disabled={busy || disabled}
        className={`flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40 ${danger ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}
      >
        {busy ? '…' : confirmLabel}
      </button>
    </div>
  );
}
