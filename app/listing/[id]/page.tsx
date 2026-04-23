import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getListingById, getListingsBySeller, getCurrentUser } from '@/lib/queries';
import ListingDetailClient from '@/components/listing/ListingDetailClient';
import type { Metadata } from 'next';

interface ListingPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const listing = await getListingById(params.id);
  if (!listing) return { title: 'Listing not found' };
  return {
    title: `${listing.title_original} — iMarket`,
    description: listing.description_original.slice(0, 160),
  };
}

export default async function ListingPage({ params }: ListingPageProps) {
  const t = await getTranslations('listings');

  const [listing, user] = await Promise.all([
    getListingById(params.id),
    getCurrentUser().catch(() => null),
  ]);

  if (!listing) notFound();

  const relatedListings = listing.user_id
    ? await getListingsBySeller(listing.user_id).catch(() => [])
    : [];

  const otherListings = relatedListings.filter((l) => l.id !== listing.id).slice(0, 4);

  return (
    <ListingDetailClient
      listing={listing}
      relatedListings={otherListings}
      currentUser={user}
      chatLabel={t('chatWithSeller')}
      relatedLabel={t('relatedListings')}
    />
  );
}
