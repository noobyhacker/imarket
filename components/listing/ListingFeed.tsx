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
  return (
    <main className="mx-auto max-w-lg">
      {initialListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm">{emptyMessage}</p>
        </div>
      ) : (
        initialListings.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            currentUserId={currentUserId}
            initialSaved={savedIds.includes(item.id)}
          />
        ))
      )}
    </main>
  );
}
