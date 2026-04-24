import { getCurrentUser } from '@/lib/queries';
import { redirect } from 'next/navigation';
import SettingsClient from '@/components/SettingsClient';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=/settings');
  return <SettingsClient user={user} />;
}
