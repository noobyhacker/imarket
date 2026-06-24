import { notFound } from 'next/navigation';
import { Store as StoreIcon, BadgeCheck } from 'lucide-react';
import { getStoreById, getStoreListings, getCurrentUser } from '@/lib/queries';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import ListingFeed from '@/components/listing/ListingFeed';

interface StorePageProps {
  params: { id: string };
}

export default async function StorePage({ params }: StorePageProps) {
  const [store, user] = await Promise.all([
    getStoreById(params.id),
    getCurrentUser().catch(() => null),
  ]);

  if (!store) notFound();

  const listings = await getStoreListings(store.id).catch(() => []);

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <TopNav user={user} />

      {/* Store header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-6 sm:px-6">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary">
            {store.logo_url ? (
              <img src={store.logo_url} alt="" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              <StoreIcon size={28} className="text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-xl font-bold text-foreground">{store.business_name || store.name}</h1>
              {store.verified && (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                  <BadgeCheck size={12} /> Verified business
                </span>
              )}
            </div>
            {store.category && <p className="text-sm text-muted-foreground">{store.category}</p>}
            {store.description && <p className="mt-1 text-sm text-foreground/80">{store.description}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{listings.length} listings</p>
          </div>
        </div>
      </header>

      {listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <StoreIcon size={32} className="mb-3 opacity-40" />
          <p className="text-sm">This store has no listings yet</p>
        </div>
      ) : (
        <ListingFeed
          initialListings={listings}
          emptyMessage="This store has no listings yet"
          searchPlaceholder=""
          currentUserId={user?.id}
        />
      )}

      <BottomNav />
    </div>
  );
}
