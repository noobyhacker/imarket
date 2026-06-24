'use client';

import { ArrowLeft, Gavel, MessageCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useRealtimeBids } from '@/hooks/useRealtimeBids';
import { formatPrice, getSupabaseImageUrl, getAvatarUrl, formatRelativeTime } from '@/lib/utils';
import { flagEmoji, getCountryName } from '@/lib/countries';
import type { Bid, Listing, UserProfile } from '@/types';

interface AuctionDetailClientProps {
  listing: Listing;
  initialBids: Bid[];
  currentUser: UserProfile | null;
}

function useCountdown(endIso: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!endIso) return { ended: true, label: '—' };
  const diff = new Date(endIso).getTime() - now;
  if (diff <= 0) return { ended: true, label: 'Ended' };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const label = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  return { ended: false, label };
}

export default function AuctionDetailClient({ listing, initialBids, currentUser }: AuctionDetailClientProps) {
  const router = useRouter();
  const { bids, setBids } = useRealtimeBids(listing.id, initialBids);
  const [activeImage, setActiveImage] = useState(0);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  const images = listing.images?.length ? listing.images.map(getSupabaseImageUrl) : [];
  const seller = listing.seller;
  const isSeller = currentUser?.id === listing.user_id;

  const notStarted = listing.auction_start ? new Date(listing.auction_start).getTime() > Date.now() : false;
  const { ended, label } = useCountdown(listing.auction_end);
  const live = !ended && !notStarted;

  const currentBid = bids[0]?.amount ?? listing.current_bid ?? null;
  const increment = listing.bid_increment ?? 1;
  const minNext = useMemo(() => {
    if (currentBid != null) return currentBid + increment;
    return listing.starting_price ?? 0;
  }, [currentBid, increment, listing.starting_price]);

  useEffect(() => {
    setAmount(String(minNext));
  }, [minNext]);

  const handleBid = async () => {
    setError('');
    const value = parseInt(amount);
    if (!currentUser) { router.push('/login'); return; }
    if (isSeller) { setError('You cannot bid on your own auction'); return; }
    if (isNaN(value) || value < minNext) { setError(`Bid must be at least ${formatPrice(minNext)}`); return; }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('place_bid', {
      p_listing_id: listing.id,
      p_amount: value,
    });
    setSubmitting(false);

    if (rpcError) { setError('Could not place bid. Please try again.'); return; }
    const res = data as { ok: boolean; error?: string; min?: number };
    if (!res?.ok) {
      const map: Record<string, string> = {
        not_authenticated: 'Please sign in to bid.',
        not_an_auction: 'This listing is not an auction.',
        seller_cannot_bid: 'You cannot bid on your own auction.',
        auction_ended: 'This auction has ended.',
        auction_not_started: 'This auction has not started yet.',
        bid_too_low: `Bid must be at least ${formatPrice(res.min ?? minNext)}.`,
      };
      setError(map[res?.error ?? ''] ?? 'Could not place bid.');
      return;
    }
    // Optimistic: realtime will also deliver it; dedupe handles overlap
    setBids((prev) => [
      { id: `temp-${Date.now()}`, listing_id: listing.id, bidder_id: currentUser.id, amount: value, created_at: new Date().toISOString(), bidder: currentUser },
      ...prev,
    ]);
  };

  const handleChat = async () => {
    if (!currentUser) { router.push('/login'); return; }
    if (isSeller) return;
    setStartingChat(true);
    const supabase = createClient();
    const { data: existing } = await supabase
      .from('conversations').select('id')
      .eq('listing_id', listing.id).eq('buyer_id', currentUser.id).single();
    if (existing) { router.push(`/chat/${existing.id}`); return; }
    const { data: created } = await supabase
      .from('conversations')
      .insert({ listing_id: listing.id, buyer_id: currentUser.id, seller_id: listing.user_id })
      .select('id').single();
    if (created) router.push(`/chat/${created.id}`);
    setStartingChat(false);
  };

  return (
    <div className="min-h-screen pb-28">
      {/* Image */}
      <div className="relative">
        {images.length > 0 ? (
          <div className="relative h-80 w-full bg-secondary sm:h-96">
            <Image src={images[activeImage]} alt={listing.title_original} fill className="object-cover" priority />
          </div>
        ) : (
          <div className="h-80 w-full bg-muted sm:h-96" />
        )}
        <div className="absolute left-0 top-0 p-4">
          <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm">
            <ArrowLeft size={18} />
          </button>
        </div>
        <div className="absolute bottom-3 left-3">
          <span className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-sm">
            <Gavel size={12} /> Auction
          </span>
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={() => setActiveImage(i)} className={`h-1.5 rounded-full transition-all ${i === activeImage ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-lg">
        {/* Status + countdown */}
        <div className={`flex items-center justify-between border-b border-border px-4 py-3 ${live ? 'bg-primary/5' : 'bg-secondary/50'}`}>
          <div className="flex items-center gap-2">
            <Clock size={16} className={live ? 'text-primary' : 'text-muted-foreground'} />
            <span className="text-sm font-semibold text-foreground">
              {ended ? 'Auction ended' : notStarted ? 'Starts soon' : 'Ends in'}
            </span>
          </div>
          <span className={`text-sm font-bold ${live ? 'text-primary' : 'text-muted-foreground'}`}>{ended ? 'Ended' : label}</span>
        </div>

        {/* Current bid */}
        <div className="border-b border-border px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {currentBid != null ? 'Current bid' : 'Starting price'}
          </p>
          <p className="mt-1 text-3xl font-extrabold text-foreground">
            {formatPrice(currentBid ?? listing.starting_price ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {bids.length} {bids.length === 1 ? 'bid' : 'bids'} · Increment {formatPrice(increment)}
          </p>
        </div>

        {/* Seller */}
        {seller && (
          <button onClick={() => router.push(`/profile/${seller.id}`)} className="flex w-full items-center gap-3 border-b border-border px-4 py-4 text-left">
            <img src={getAvatarUrl(seller.avatar_url)} alt={seller.nickname} className="h-10 w-10 rounded-full bg-secondary" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{seller.nickname}</p>
              <p className="text-xs text-muted-foreground">{listing.location}</p>
            </div>
          </button>
        )}

        {/* Content */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{listing.title_original}</h1>
            {listing.origin_country_code && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                {flagEmoji(listing.origin_country_code)} {getCountryName(listing.origin_country_code)}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">{listing.description_original}</p>
        </div>

        {/* Bid history */}
        <div className="px-4 pb-6">
          <h2 className="mb-2 text-sm font-bold text-foreground">Bid history</h2>
          {bids.length === 0 ? (
            <p className="rounded-xl bg-secondary/50 py-6 text-center text-sm text-muted-foreground">No bids yet — be the first!</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              {bids.map((bid, i) => (
                <div key={bid.id} className={`flex items-center gap-3 px-3 py-2.5 ${i === 0 ? 'bg-primary/5' : ''} ${i < bids.length - 1 ? 'border-b border-border' : ''}`}>
                  <img src={getAvatarUrl(bid.bidder?.avatar_url ?? null)} alt="" className="h-7 w-7 rounded-full bg-secondary" />
                  <span className="flex-1 truncate text-sm text-foreground">{bid.bidder?.nickname ?? 'Bidder'}</span>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(bid.created_at)}</span>
                  <span className={`text-sm font-bold ${i === 0 ? 'text-primary' : 'text-foreground'}`}>{formatPrice(bid.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom bid bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-area-bottom">
        <div className="mx-auto max-w-lg px-4 py-3">
          {error && <p className="mb-2 text-xs font-semibold text-destructive">{error}</p>}
          {isSeller ? (
            <p className="py-2 text-center text-sm text-muted-foreground">This is your auction.</p>
          ) : ended ? (
            <button onClick={handleChat} disabled={startingChat} className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 text-sm font-bold text-foreground">
              <MessageCircle size={16} /> Message seller
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                disabled={notStarted}
                className="w-32 rounded-xl border border-border bg-card px-3 py-3 text-sm font-bold text-foreground outline-none focus:border-primary disabled:opacity-50"
                placeholder={String(minNext)}
              />
              <button
                onClick={handleBid}
                disabled={submitting || notStarted}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-transform active:scale-[0.98] disabled:opacity-40"
              >
                <Gavel size={16} />
                {notStarted ? 'Not started' : submitting ? 'Placing…' : `Bid ${formatPrice(parseInt(amount) || minNext)}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
