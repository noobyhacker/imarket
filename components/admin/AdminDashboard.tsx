'use client';

import { Search, MessageSquare, FileText, BadgeCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { adminDeleteListing, adminApproveStoreRequest, adminRejectStoreRequest, adminGetStoreDocUrl } from '@/lib/adminActions';
import { formatBusinessNumber } from '@/lib/businessNumber';
import { formatPrice, formatRelativeTime, getSupabaseImageUrl, getAvatarUrl } from '@/lib/utils';
import type { Conversation, Listing, StoreRequest, UserProfile } from '@/types';

interface AdminDashboardProps {
  listings: Listing[];
  storeRequests: StoreRequest[];
  users: UserProfile[];
  conversations: Conversation[];
  listingsCount: number;
  storeRequestsCount: number;
  usersCount: number;
  chatsCount: number;
  currentTab: string;
  currentPage: number;
  pageSize: number;
  searchQuery: string;
}

export default function AdminDashboard({
  listings: initialListings,
  storeRequests: initialRequests,
  users,
  conversations,
  listingsCount,
  storeRequestsCount,
  usersCount,
  chatsCount,
  currentTab,
  currentPage,
  pageSize,
  searchQuery,
}: AdminDashboardProps) {
  const router = useRouter();
  const t = useTranslations('admin');

  const [listings, setListings] = useState(initialListings);
  const [storeRequests, setStoreRequests] = useState(initialRequests);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState(searchQuery);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [docLoading, setDocLoading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const buildAdminUrl = (params: { tab?: string; page?: number; q?: string }) => {
    const nextTab = params.tab ?? currentTab;
    const nextPage = params.page ?? currentPage;
    const nextQ = params.q ?? searchQuery;
    const query = new URLSearchParams();
    query.set('tab', nextTab);
    query.set('page', String(nextPage));
    if (nextQ.trim()) query.set('q', nextQ.trim());
    return `/admin?${query.toString()}`;
  };

  const setTab = (tab: string) => router.push(buildAdminUrl({ tab, page: 0 }));
  const setPage = (page: number) => router.push(buildAdminUrl({ page }));
  const runSearch = () => router.push(buildAdminUrl({ page: 0, q: search }));

  const handleDeleteListing = async (id: string) => {
    setDeleting(true);
    setDeleteError('');
    try {
      await adminDeleteListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete listing.');
    } finally {
      setDeleting(false);
    }
  };

  const handleApprove = async (id: string) => {
    await adminApproveStoreRequest(id);
    setStoreRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setRejecting(true);
    try {
      await adminRejectStoreRequest(rejectTarget, rejectReason.trim());
      setStoreRequests((prev) =>
        prev.map((r) => (r.id === rejectTarget ? { ...r, status: 'rejected', review_reason: rejectReason.trim() } : r))
      );
      setRejectTarget(null);
      setRejectReason('');
    } finally {
      setRejecting(false);
    }
  };

  const handleViewDoc = async (path: string) => {
    setDocLoading(path);
    try {
      const url = await adminGetStoreDocUrl(path);
      if (url) window.open(url, '_blank', 'noopener');
    } finally {
      setDocLoading(null);
    }
  };

  const tabs = [
    { key: 'listings', label: t('listings'), count: listingsCount },
    { key: 'store_requests', label: t('storeRequests'), count: storeRequestsCount },
    { key: 'users', label: t('users'), count: usersCount },
    { key: 'chats', label: 'Chats', count: chatsCount },
  ];

  const totalPages = Math.ceil(
    currentTab === 'listings'
      ? listingsCount / pageSize
      : currentTab === 'store_requests'
      ? storeRequestsCount / pageSize
      : currentTab === 'chats'
      ? chatsCount / pageSize
      : usersCount / pageSize
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              currentTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              currentTab === tab.key ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-6 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch();
            }}
            placeholder="Search by listing title, request name, user nickname, or email"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          onClick={runSearch}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Search
        </button>
      </div>

      {/* Listings table */}
      {currentTab === 'listings' && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {listings.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t('noData')}</p>
          ) : (
            listings.map((listing) => (
              <div
                key={listing.id}
                className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0"
              >
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {listing.images?.[0] && (
                    <img
                      src={getSupabaseImageUrl(listing.images[0])}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{listing.title_original}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(listing.price)} · {listing.location} · {formatRelativeTime(listing.created_at)}
                  </p>
                  {listing.seller && (
                    <p className="text-xs text-muted-foreground">{listing.seller.nickname} · {listing.seller.email}</p>
                  )}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  listing.status === 'active'
                    ? 'bg-safe-light text-safe'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {t(listing.status as 'active' | 'sold')}
                </span>
                <button
                  onClick={() => setConfirmDelete(listing.id)}
                  className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
                >
                  {t('delete')}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Store requests table */}
      {currentTab === 'store_requests' && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {storeRequests.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t('noData')}</p>
          ) : (
            storeRequests.map((req) => (
              <div key={req.id} className="border-b border-border px-4 py-3 last:border-0">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-foreground">{req.business_name || req.name}</p>
                      {req.status === 'approved' && <BadgeCheck size={14} className="text-primary" />}
                    </div>
                    {/* Side-by-side submitted fields */}
                    <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-2">
                      {req.business_reg_number && <p>사업자등록번호: <span className="text-foreground">{formatBusinessNumber(req.business_reg_number)}</span></p>}
                      {req.category && <p>Category: <span className="text-foreground">{req.category}</span></p>}
                      {req.contact && <p>Contact: <span className="text-foreground">{req.contact}</span></p>}
                      <p>Applicant: <span className="text-foreground">{req.user?.nickname ?? 'Unknown'} · {req.user?.email ?? '—'}</span></p>
                    </div>
                    {req.description && <p className="mt-1 truncate text-xs text-muted-foreground">{req.description}</p>}
                    {req.status === 'rejected' && req.review_reason && (
                      <p className="mt-1 text-xs text-destructive">Reason: {req.review_reason}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground">{formatRelativeTime(req.created_at)}</span>
                      {req.document_url && (
                        <button
                          onClick={() => handleViewDoc(req.document_url!)}
                          disabled={docLoading === req.document_url}
                          className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground hover:bg-muted disabled:opacity-50"
                        >
                          <FileText size={12} /> {docLoading === req.document_url ? 'Opening…' : 'View certificate'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      req.status === 'pending'
                        ? 'bg-karrot-light text-primary'
                        : req.status === 'approved'
                        ? 'bg-safe-light text-safe'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {t(req.status as 'pending' | 'approved' | 'rejected')}
                    </span>
                    {req.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="rounded-lg bg-safe/10 px-3 py-1.5 text-xs font-semibold text-safe transition-colors hover:bg-safe/20"
                        >
                          {t('approve')}
                        </button>
                        <button
                          onClick={() => { setRejectTarget(req.id); setRejectReason(''); }}
                          className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
                        >
                          {t('reject')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Users table */}
      {currentTab === 'users' && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {users.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t('noData')}</p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0"
              >
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                  alt=""
                  className="h-10 w-10 rounded-full bg-secondary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{user.nickname}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(user.created_at)}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Chats table */}
      {currentTab === 'chats' && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {conversations.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t('noData')}</p>
          ) : (
            conversations.map((conv) => {
              const listingImage = conv.listing?.images?.[0]
                ? getSupabaseImageUrl(conv.listing.images[0])
                : null;
              return (
                <button
                  key={conv.id}
                  onClick={() => router.push(`/admin/chat/${conv.id}`)}
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 transition-colors hover:bg-secondary/50"
                >
                  {/* Avatars */}
                  <div className="relative flex-shrink-0">
                    <img src={getAvatarUrl(conv.buyer?.avatar_url ?? null)} alt="" className="h-9 w-9 rounded-full border-2 border-card" />
                    <img src={getAvatarUrl(conv.seller?.avatar_url ?? null)} alt="" className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-2 border-card" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {conv.buyer?.nickname} → {conv.seller?.nickname}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {conv.listing?.title_original} · {formatPrice(conv.listing?.price ?? 0)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground/70">{conv.last_message}</p>
                  </div>
                  {/* Listing thumbnail + time */}
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    {listingImage && (
                      <img src={listingImage} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {conv.last_message_at ? formatRelativeTime(conv.last_message_at) : ''}
                    </span>
                  </div>
                  <MessageSquare size={14} className="flex-shrink-0 text-muted-foreground" />
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground disabled:opacity-40"
          >
            ←
          </button>
          <span className="text-sm text-muted-foreground">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}

      {/* Reject-with-reason modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-card p-6 shadow-elevated">
            <p className="text-sm font-bold text-foreground">Reject store application</p>
            <p className="mt-1 text-xs text-muted-foreground">A reason is required and shown to the applicant.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Certificate does not match the submitted business name."
              className="mt-3 w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground"
              >
                {t('cancelButton')}
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejecting}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-40"
              >
                {rejecting ? '…' : t('reject')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-card p-6 shadow-elevated">
            <p className="text-sm font-semibold text-foreground">{t('confirmDelete')}</p>
            {deleteError && (
              <p className="mt-3 text-xs font-medium text-destructive">{deleteError}</p>
            )}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => { setConfirmDelete(null); setDeleteError(''); }}
                disabled={deleting}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground disabled:opacity-40"
              >
                {t('cancelButton')}
              </button>
              <button
                onClick={() => handleDeleteListing(confirmDelete)}
                disabled={deleting}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-40"
              >
                {t('confirmDeleteButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
