import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/queries';
import CreateListingForm from '@/components/listing/CreateListingForm';
import BottomNav from '@/components/BottomNav';

export default async function CreatePage() {
  const t = await getTranslations('create');
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <h1 className="text-lg font-bold text-foreground">{t('title')}</h1>
        </div>
      </header>
      <CreateListingForm userId={user?.id ?? ''} />
      <BottomNav />
    </div>
  );
}
