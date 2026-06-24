import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getUserProfile, getListingsBySeller, getCurrentUser } from '@/lib/queries';
import ProfileClient from '@/components/profile/ProfileClient';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';
import ReportButton from '@/components/ReportButton';

interface ProfilePageProps {
  params: { id: string };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const t = await getTranslations('profile');

  const [profile, currentUser] = await Promise.all([
    getUserProfile(params.id),
    getCurrentUser().catch(() => null),
  ]);

  if (!profile) notFound();

  const [activeListings, soldListings] = await Promise.all([
    getListingsBySeller(params.id, 'active').catch(() => []),
    getListingsBySeller(params.id, 'sold').catch(() => []),
  ]);

  return (
    <div className="min-h-screen pb-20">
      <TopNav user={currentUser} />
      <ProfileClient
        profile={profile}
        activeListings={activeListings}
        soldListings={soldListings}
        isOwnProfile={currentUser?.id === params.id}
      />
      {currentUser && currentUser.id !== params.id && (
        <div className="mx-auto max-w-lg px-4 py-4">
          <ReportButton targetType="user" targetId={params.id} />
        </div>
      )}
      <BottomNav />
    </div>
  );
}
