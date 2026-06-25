'use client';

import { Heart, Globe, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { formatPrice, formatRelativeTime, getSupabaseImageUrl } from '@/lib/utils';
import { flagEmoji, getCountryName } from '@/lib/countries';
import type { Listing } from '@/types';

interface ItemCardProps {
  item: Listing;
  currentUserId?: string;
  initialSaved?: boolean;
}

export default function ItemCard({ item, currentUserId, initialSaved = false }: ItemCardProps) {
  const router = useRouter();
  const t = useTranslations('listings');
  const [saved, setSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);

  const imageUrl = item.images?.[0]
    ? getSupabaseImageUrl(item.images[0])
    : null;

  const isAuction = item.sale_type === 'auction';
  const displayPrice = isAuction ? (item.current_bid ?? item.starting_price ?? item.price) : item.price;

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) { router.push('/login'); return; }
    setSaving(true);
    const supabase = createClient();
    if (saved) {
      await supabase.from('saved_listings').delete()
        .eq('user_id', currentUserId).eq('listing_id', item.id);
      setSaved(false);
    } else {
      await supabase.from('saved_listings').insert({ user_id: currentUserId, listing_id: item.id });
      setSaved(true);
    }
    setSaving(false);
  };

  return (
    <div className="flex w-full gap-3.5 border-b border-border px-4 py-3.5 transition-colors hover:bg-secondary/50 animate-fade-in">
      <Link href={`/listing/${item.id}`} className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-secondary">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.title_original}
            fill
            className="object-contain"
            sizes="112px"
          />
        ) : (
          <div className="h-full w-full bg-secondary" />
        )}
        {item.foreigner_safe && (
          <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-md bg-safe px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
            <ShieldCheck size={10} /> Safe
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 items-stretch gap-2">
        <Link href={`/listing/${item.id}`} className="flex min-w-0 flex-1 flex-col justify-between py-0.5 text-left">
          <div>
            <h3 className="truncate text-[15px] font-semibold leading-tight text-foreground">
              {item.title_original}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.location} · {formatRelativeTime(item.created_at)}
            </p>
          </div>

          <div>
            {isAuction && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                {item.current_bid != null ? 'Auction · current bid' : 'Auction · starting'}
              </p>
            )}
            <p className={`text-lg font-bold ${isAuction ? 'text-primary' : 'text-foreground'}`}>{formatPrice(displayPrice)}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {item.english_friendly && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-trust-light px-2 py-0.5 text-[10px] font-semibold text-trust">
                  <Globe size={10} /> EN
                </span>
              )}
              {item.origin_country_code && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                  {flagEmoji(item.origin_country_code)} {getCountryName(item.origin_country_code)}
                </span>
              )}
            </div>
          </div>
        </Link>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="self-end p-1"
          aria-label={saved ? 'Unsave' : 'Save'}
        >
          <Heart
            size={20}
            className={saved ? 'fill-primary text-primary' : 'text-muted-foreground'}
          />
        </button>
      </div>
    </div>
  );
}
