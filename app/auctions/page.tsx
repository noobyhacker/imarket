import { Gavel } from 'lucide-react';
import { getAuctions, getCurrentUser } from '@/lib/queries';
import AuctionCard from '@/components/listing/AuctionCard';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';
import type { ListingCategory } from '@/types';

interface AuctionsPageProps {
  searchParams: { search?: string; category?: string; origin?: string };
}

export default async function AuctionsPage({ searchParams }: AuctionsPageProps) {
  const originCountries = (searchParams.origin ?? '').split(',').filter(Boolean);

  const [auctions, user] = await Promise.all([
    getAuctions({
      search: searchParams.search,
      category: searchParams.category as ListingCategory | undefined,
      originCountries,
    }).catch(() => []),
    getCurrentUser().catch(() => null),
  ]);

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <TopNav user={user} />

      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2">
          <Gavel size={18} className="text-primary" />
          <h1 className="text-lg font-bold text-foreground">Auctions</h1>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {auctions.length}
          </span>
        </div>

        {auctions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Gavel size={32} className="mb-3 opacity-40" />
            <p className="text-sm">No live auctions right now</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {auctions.map((item) => (
              <AuctionCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
