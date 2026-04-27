import { getCurrentUser } from '@/lib/queries';
import { redirect } from 'next/navigation';
import SettingsClient from '@/components/SettingsClient';
import TopNav from '@/components/TopNav';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=/settings');
  return (
    <div className="min-h-screen pb-20">
      <TopNav user={user} />
      <SettingsClient user={user} />
    </div>
  );
}
