'use client';

import { ArrowLeft, Heart, Share2, Star, ShieldCheck, Globe, MessageCircle, Pencil, CheckCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { toggleListingStatus, deleteOwnListing } from '@/lib/listingActions';
import { formatPrice, formatRelativeTime, getSupabaseImageUrl, getAvatarUrl } from '@/lib/utils';
import type { Listing, UserProfile } from '@/types';

interface ListingDetailClientProps {
  listing: Listing;
  relatedListings: Listing[];
  currentUser: UserProfile | null;
  initialSaved?: boolean;
  chatLabel: string;
  relatedLabel: string;
}

export default function ListingDetailClient({
  listing,
  relatedListings,
  currentUser,
  initialSaved = false,
  chatLabel,
  relatedLabel,
}: ListingDetailClientProps) {
  const router = useRouter();
  const tCategories = useTranslations('categories');
  const [saved, setSaved] = useState(initialSaved);
  const [activeImage, setActiveImage] = useState(0);
  const [startingChat, setStartingChat] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [listingStatus, setListingStatus] = useState(listing.status);
  const [toggling, setToggling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isSeller = currentUser?.id === listing.user_id;

  const handleToggleStatus = async () => {
    setToggling(true);
    const next = listingStatus === 'active' ? 'sold' : 'active';
    await toggleListingStatus(listing.id, next);
    setListingStatus(next);
    setToggling(false);
  };

  const handleDelete = async () => {
    await deleteOwnListing(listing.id);
    router.push('/');
    router.refresh();
  };

  const images = listing.images?.length
    ? listing.images.map(getSupabaseImageUrl)
    : [];

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = { title: listing.title_original, text: listing.title_original, url };
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMsg('Link copied');
      setTimeout(() => setShareMsg(''), 2000);
    } catch {
      // User cancelled share sheet or clipboard blocked — no-op
    }
  };

  const handleSave = async () => {
    if (!currentUser) { router.push('/login'); return; }
    const supabase = createClient();
    if (saved) {
      await supabase.from('saved_listings').delete()
        .eq('user_id', currentUser.id).eq('listing_id', listing.id);
      setSaved(false);
    } else {
      await supabase.from('saved_listings').insert({ user_id: currentUser.id, listing_id: listing.id });
      setSaved(true);
    }
  };

  const handleChat = async () => {
    if (!currentUser) { router.push('/login'); return; }
    if (currentUser.id === listing.user_id) return;
    setStartingChat(true);
    const supabase = createClient();

    // Find or create conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', listing.id)
      .eq('buyer_id', currentUser.id)
      .single();

    if (existing) {
      router.push(`/chat/${existing.id}`);
      return;
    }

    const { data: created, error } = await supabase
      .from('conversations')
      .insert({
        listing_id: listing.id,
        buyer_id: currentUser.id,
        seller_id: listing.user_id,
      })
      .select('id')
      .single();

    if (!error && created) {
      router.push(`/chat/${created.id}`);
    }
    setStartingChat(false);
  };

  const seller = listing.seller;

  return (
    <div className="min-h-screen pb-24">
      {/* Image */}
      <div className="relative">
        {images.length > 0 ? (
          <div className="relative h-80 w-full sm:h-96 bg-secondary">
            <Image
              src={images[activeImage]}
              alt={listing.title_original}
              fill
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div className="h-80 w-full bg-muted sm:h-96" />
        )}

        {/* Top controls */}
        <div className="absolute left-0 top-0 flex w-full items-center justify-between p-4">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              aria-label="Share"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm transition-transform active:scale-90"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={handleSave}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm"
            >
              <Heart size={16} className={saved ? 'fill-primary text-primary' : ''} />
            </button>
          </div>
        </div>

        {shareMsg && (
          <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-foreground/90 px-3 py-1.5 text-xs font-semibold text-background">
            {shareMsg}
          </div>
        )}

        {/* Image thumbnails */}
        {images.length > 1 && (
          <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeImage ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Badges */}
        <div className="absolute bottom-3 left-3 flex gap-2">
          {listing.foreigner_safe && (
            <span className="flex items-center gap-1 rounded-lg bg-safe px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-sm">
              <ShieldCheck size={12} /> Foreigner Safe 거래
            </span>
          )}
          {listing.english_friendly && (
            <span className="flex items-center gap-1 rounded-lg bg-trust px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-sm">
              <Globe size={12} /> English-Friendly
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-lg">
        {/* Seller */}
        {seller && (
          <button
            onClick={() => router.push(`/profile/${seller.id}`)}
            className="flex w-full items-center gap-3 border-b border-border px-4 py-4 text-left"
          >
            <img
              src={getAvatarUrl(seller.avatar_url)}
              alt={seller.nickname}
              className="h-11 w-11 rounded-full bg-secondary"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{seller.nickname}</p>
              <p className="text-xs text-muted-foreground">{listing.location}</p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-karrot-light px-2.5 py-1">
              <Star size={12} className="fill-primary text-primary" />
              <span className="text-xs font-bold text-foreground">{seller.trust_score?.toFixed(1)}</span>
            </div>
          </button>
        )}

        {/* Content */}
        <div className="px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {tCategories(listing.category as Parameters<typeof tCategories>[0])}
          </p>
          <h2 className="mt-1 text-xl font-bold text-foreground">{listing.title_original}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatRelativeTime(listing.created_at)}</p>
          <p className="mt-4 text-sm leading-relaxed text-foreground/80">{listing.description_original}</p>

          {seller?.languages && seller.languages.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {seller.languages.map((lang) => (
                <span
                  key={lang}
                  className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
                >
                  {lang}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Related listings */}
        {relatedListings.length > 0 && (
          <div className="px-4 pb-4">
            <h3 className="mb-3 text-sm font-bold text-foreground">{relatedLabel}</h3>
            <div className="grid grid-cols-2 gap-3">
              {relatedListings.map((rel) => (
                <button
                  key={rel.id}
                  onClick={() => router.push(`/listing/${rel.id}`)}
                  className="overflow-hidden rounded-xl border border-border bg-card text-left shadow-card transition-all hover:shadow-card-hover"
                >
                  <div className="relative aspect-[4/3] bg-secondary">
                    {rel.images?.[0] && (
                      <Image
                        src={getSupabaseImageUrl(rel.images[0])}
                        alt={rel.title_original}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 200px"
                      />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-semibold text-foreground">{rel.title_original}</p>
                    <p className="text-sm font-bold text-primary">{formatPrice(rel.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-area-bottom">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <p className="text-xl font-extrabold text-foreground">{formatPrice(listing.price)}</p>

          {isSeller ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/listing/${listing.id}/edit`)}
                className="flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-foreground transition-transform active:scale-[0.97]"
              >
                <Pencil size={15} /> Edit
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={toggling}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-bold transition-transform active:scale-[0.97] disabled:opacity-40 ${
                  listingStatus === 'active'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}
              >
                <CheckCircle size={15} />
                {listingStatus === 'active' ? 'Mark Sold' : 'Relist'}
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center justify-center rounded-xl bg-destructive/10 px-3 py-3 text-destructive transition-transform active:scale-[0.97]"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleChat}
              disabled={startingChat}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-transform active:scale-[0.97] disabled:opacity-40"
            >
              <MessageCircle size={16} />
              {chatLabel}
            </button>
          )}
        </div>
      </div>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-card p-6 shadow-elevated">
            <p className="text-sm font-bold text-foreground">Delete this listing?</p>
            <p className="mt-1 text-xs text-muted-foreground">This cannot be undone. Active chats about this item will remain.</p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
