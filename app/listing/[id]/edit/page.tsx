import { notFound, redirect } from 'next/navigation';
import { getListingById, getCurrentUser, getStoreByOwner } from '@/lib/queries';
import EditListingForm from '@/components/listing/EditListingForm';
import TopNav from '@/components/TopNav';

interface EditListingPageProps {
  params: { id: string };
}

export default async function EditListingPage({ params }: EditListingPageProps) {
  const [listing, user] = await Promise.all([
    getListingById(params.id),
    getCurrentUser().catch(() => null),
  ]);

  if (!listing) notFound();
  if (!user || user.id !== listing.user_id) redirect(`/listing/${params.id}`);

  const store = await getStoreByOwner(user.id).catch(() => null);

  return (
    <div className="min-h-screen pb-20">
      <TopNav user={user} />
      <div className="mx-auto max-w-lg px-4 pt-5">
        <h1 className="text-lg font-bold text-foreground">Edit Listing</h1>
      </div>
      <EditListingForm listing={listing} store={store} />
    </div>
  );
}
