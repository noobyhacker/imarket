import { getTranslations } from 'next-intl/server';
import { getListings, getCurrentUser } from '@/lib/queries';
import ListingFeed from '@/components/listing/ListingFeed';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';
import type { ListingCategory, SortOption } from '@/types';

interface HomePageProps {
  searchParams: {
    search?: string;
    category?: string;
    location?: string;
    sort?: string;
    filter?: string;
    lang?: string;
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const t = await getTranslations('listings');

  const sort = (searchParams.sort as SortOption) || 'newest';
  const englishFriendly = searchParams.filter === 'english';
  const language = searchParams.lang || undefined;

  const [listings, user] = await Promise.all([
    getListings({
      search: searchParams.search,
      category: searchParams.category as ListingCategory | undefined,
      location: searchParams.location,
      sort,
      englishFriendly,
      language,
    }).catch(() => []),
    getCurrentUser().catch(() => null),
  ]);

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <TopNav user={user} />
      <ListingFeed
        initialListings={listings}
        emptyMessage={t('empty')}
        searchPlaceholder={t('search')}
        currentUserId={user?.id}
      />
      <BottomNav />
    </div>
  );
}
