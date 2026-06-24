'use client';

import { Gavel, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { formatPrice, getSupabaseImageUrl } from '@/lib/utils';
import { flagEmoji } from '@/lib/countries';
import type { Listing } from '@/types';

function countdownLabel(endIso: string | null | undefined, now: number): { label: string; ended: boolean } {
  if (!endIso) return { label: '—', ended: true };
  const diff = new Date(endIso).getTime() - now;
  if (diff <= 0) return { label: 'Ended', ended: true };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { label: d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`, ended: false };
}

export default function AuctionCard({ item }: { item: Listing }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const imageUrl = item.images?.[0] ? getSupabaseImageUrl(item.images[0]) : null;
  const { label, ended } = countdownLabel(item.auction_end, now);
  const price = item.current_bid ?? item.starting_price ?? 0;

  return (
    <Link
      href={`/listing/${item.id}`}
      className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-200 hover:scale-[1.02] hover:shadow-card-hover"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {imageUrl ? (
          <Image src={imageUrl} alt={item.title_original} fill className="object-cover transition-transform duration-200 group-hover:scale-105" sizes="(max-width:640px) 50vw,25vw" />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
          <Gavel size={10} /> Auction
        </span>
        <span className={`absolute bottom-2 right-2 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${ended ? 'bg-muted text-muted-foreground' : 'bg-foreground/80 text-background'}`}>
          <Clock size={10} /> {label}
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-foreground">
          {item.origin_country_code && <span className="mr-1">{flagEmoji(item.origin_country_code)}</span>}
          {item.title_original}
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {item.current_bid != null ? 'Current bid' : 'Starting price'}
        </p>
        <p className="text-base font-bold text-primary">{formatPrice(price)}</p>
      </div>
    </Link>
  );
}
