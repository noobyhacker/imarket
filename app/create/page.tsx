import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/queries';
import CreateListingForm from '@/components/listing/CreateListingForm';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';

export default async function CreatePage() {
  const t = await getTranslations('create');
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <TopNav user={user} />
      <div className="mx-auto max-w-lg px-4 pt-5">
        <h1 className="text-lg font-bold text-foreground">{t('title')}</h1>
      </div>
      <CreateListingForm userId={user?.id ?? ''} />
      <BottomNav />
    </div>
  );
}
