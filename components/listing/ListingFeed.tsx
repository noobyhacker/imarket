'use client';

import type { Listing } from '@/types';
import ItemCard from './ItemCard';

interface ListingFeedProps {
  initialListings: Listing[];
  emptyMessage: string;
  searchPlaceholder: string;
  currentUserId?: string;
  savedIds?: string[];
}

export default function ListingFeed({
  initialListings,
  emptyMessage,
  currentUserId,
  savedIds = [],
}: ListingFeedProps) {
  if (initialListings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      {/* Desktop: 3-col grid. Tablet: 2-col. Mobile: single list */}
      <div className="hidden sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {initialListings.map((item) => (
          <ItemCardGrid
            key={item.id}
            item={item}
            currentUserId={currentUserId}
            initialSaved={savedIds.includes(item.id)}
          />
        ))}
      </div>

      {/* Mobile: original list layout */}
      <div className="sm:hidden">
        {initialListings.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            currentUserId={currentUserId}
            initialSaved={savedIds.includes(item.id)}
          />
        ))}
      </div>
    </main>
  );
}

// Grid card for desktop
import { Heart, Globe, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { formatPrice, formatRelativeTime, getSupabaseImageUrl } from '@/lib/utils';
import { flagEmoji, getCountryName } from '@/lib/countries';

function ItemCardGrid({ item, currentUserId, initialSaved = false }: { item: Listing; currentUserId?: string; initialSaved?: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);

  const imageUrl = item.images?.[0] ? getSupabaseImageUrl(item.images[0]) : null;
  const isAuction = item.sale_type === 'auction';
  const displayPrice = isAuction ? (item.current_bid ?? item.starting_price ?? item.price) : item.price;

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) { router.push('/login'); return; }
    const supabase = createClient();
    if (saved) {
      await supabase.from('saved_listings').delete().eq('user_id', currentUserId).eq('listing_id', item.id);
      setSaved(false);
    } else {
      await supabase.from('saved_listings').insert({ user_id: currentUserId, listing_id: item.id });
      setSaved(true);
    }
  };

  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-card text-left shadow-card transition-all duration-200 hover:scale-[1.02] hover:shadow-card-hover animate-fade-in">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <Link href={`/listing/${item.id}`} className="block h-full w-full">
          {imageUrl ? (
            <Image src={imageUrl} alt={item.title_original} fill className="object-contain transition-transform duration-200 group-hover:scale-105" sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,25vw" />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
        </Link>
        <button
          type="button"
          onClick={handleSave}
          aria-label={saved ? 'Unsave' : 'Save'}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm"
        >
          <Heart size={15} className={saved ? 'fill-primary text-primary' : 'text-foreground'} />
        </button>
        {item.foreigner_safe && (
          <span className="absolute left-2 top-2 flex items-center gap-0.5 rounded-md bg-safe px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
            <ShieldCheck size={10} /> Safe
          </span>
        )}
      </div>
      <Link href={`/listing/${item.id}`} className="block p-3">
        <p className="truncate text-sm font-semibold text-foreground">{item.title_original}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.location} · {formatRelativeTime(item.created_at)}</p>
        <div className="mt-2 flex items-center justify-between gap-1">
          <p className={`text-base font-bold ${isAuction ? 'text-primary' : 'text-foreground'}`}>{formatPrice(displayPrice)}</p>
          <div className="flex flex-wrap items-center justify-end gap-1">
            {item.origin_country_code && (
              <span className="flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                {flagEmoji(item.origin_country_code)} {getCountryName(item.origin_country_code)}
              </span>
            )}
            {item.english_friendly && (
              <span className="flex items-center gap-0.5 rounded-full bg-trust-light px-2 py-0.5 text-[10px] font-semibold text-trust">
                <Globe size={10} /> EN
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
