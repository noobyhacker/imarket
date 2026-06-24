import { redirect } from 'next/navigation';
import { getCurrentUser, getStoreByOwner, getStoreRequestByUser } from '@/lib/queries';
import StoreApplyClient from '@/components/store/StoreApplyClient';
import TopNav from '@/components/TopNav';

export default async function StoreApplyPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect('/login');

  const [existingStore, latestRequest] = await Promise.all([
    getStoreByOwner(user.id).catch(() => null),
    getStoreRequestByUser(user.id).catch(() => null),
  ]);

  return (
    <div className="min-h-screen pb-20">
      <TopNav user={user} />
      <div className="mx-auto max-w-lg px-4 pt-5">
        <h1 className="text-lg font-bold text-foreground">Open a Store</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sell under your verified business name.</p>
      </div>
      <StoreApplyClient userId={user.id} existingStore={existingStore} latestRequest={latestRequest} />
    </div>
  );
}
