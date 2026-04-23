'use client';

import { Heart, Globe, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { formatPrice, formatRelativeTime, getSupabaseImageUrl } from '@/lib/utils';
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
    <button
      onClick={() => router.push(`/listing/${item.id}`)}
      className="flex w-full gap-3.5 border-b border-border px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 animate-fade-in"
    >
      {/* Thumbnail */}
      <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.title_original}
            fill
            className="object-cover"
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
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <h3 className="truncate text-[15px] font-semibold leading-tight text-foreground">
            {item.title_original}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.location} · {formatRelativeTime(item.created_at)}
          </p>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-foreground">{formatPrice(item.price)}</p>
            <div className="mt-1 flex gap-1.5">
              {item.english_friendly && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-trust-light px-2 py-0.5 text-[10px] font-semibold text-trust">
                  <Globe size={10} /> EN
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="p-1"
            aria-label={saved ? 'Unsave' : 'Save'}
          >
            <Heart
              size={20}
              className={saved ? 'fill-primary text-primary' : 'text-muted-foreground'}
            />
          </button>
        </div>
      </div>
    </button>
  );
}
