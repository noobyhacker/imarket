import { Search, Store as StoreIcon, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import { getStores, getCurrentUser } from '@/lib/queries';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';

interface StoresPageProps {
  searchParams: { q?: string };
}

export default async function StoresPage({ searchParams }: StoresPageProps) {
  const q = searchParams.q?.trim() ?? '';
  const [stores, user] = await Promise.all([
    getStores(q || undefined).catch(() => []),
    getCurrentUser().catch(() => null),
  ]);

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <TopNav user={user} />

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StoreIcon size={18} className="text-primary" />
            <h1 className="text-lg font-bold text-foreground">Verified Stores</h1>
          </div>
          <Link href="/stores/apply" className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
            Open a store
          </Link>
        </div>

        {/* Native GET search — works without JS */}
        <form action="/stores" method="get" className="mb-5 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
          <Search size={16} className="text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search stores by name or category"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </form>

        {stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <StoreIcon size={32} className="mb-3 opacity-40" />
            <p className="text-sm">No stores found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`/stores/${store.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-card-hover"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-secondary">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt="" className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    <StoreIcon size={20} className="text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-sm font-bold text-foreground">{store.business_name || store.name}</p>
                    {store.verified && <BadgeCheck size={14} className="flex-shrink-0 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{store.category ?? 'Store'}</p>
                  <p className="text-xs text-muted-foreground">{store.listingCount ?? 0} listings</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
