'use client';

import { Settings, Star, Package, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import Image from 'next/image';
import { getAvatarUrl, getSupabaseImageUrl, formatPrice, formatRelativeTime } from '@/lib/utils';
import type { Listing, UserProfile } from '@/types';

interface ProfileClientProps {
  profile: UserProfile;
  activeListings: Listing[];
  soldListings: Listing[];
  isOwnProfile: boolean;
}

export default function ProfileClient({
  profile,
  activeListings,
  soldListings,
  isOwnProfile,
}: ProfileClientProps) {
  const router = useRouter();
  const t = useTranslations('profile');
  const [activeTab, setActiveTab] = useState<'active' | 'sold'>('active');

  const listings = activeTab === 'active' ? activeListings : soldListings;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">{t('title')}</h1>
          {isOwnProfile && (
            <button className="p-1 text-muted-foreground">
              <Settings size={20} />
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-lg">
        {/* Profile card */}
        <div className="flex items-center gap-4 px-4 py-5">
          <img
            src={getAvatarUrl(profile.avatar_url)}
            alt={profile.nickname}
            className="h-16 w-16 rounded-full bg-secondary"
          />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">{profile.nickname}</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-karrot-light px-2 py-0.5 text-xs font-bold text-foreground">
                <Star size={11} className="fill-primary text-primary" />
                {profile.trust_score?.toFixed(1) ?? '5.0'}
              </span>
              {profile.badge && (
                <span className="rounded-full bg-trust-light px-2 py-0.5 text-[11px] font-semibold text-trust">
                  {profile.badge}
                </span>
              )}
            </div>
            {profile.location && (
              <p className="mt-1 text-xs text-muted-foreground">{profile.location}</p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {profile.languages?.map((lang) => (
                <span key={lang} className="text-xs text-muted-foreground">{lang}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-4 grid grid-cols-3 gap-3 rounded-2xl bg-secondary p-4">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{activeListings.length}</p>
            <p className="text-[11px] text-muted-foreground">{t('listings')}</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{profile.review_count ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">{t('reviews')}</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{profile.trust_score?.toFixed(1) ?? '5.0'}</p>
            <p className="text-[11px] text-muted-foreground">{t('trustScore')}</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mx-4 mt-5 flex gap-2">
          {(['active', 'sold'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {t(tab)}
            </button>
          ))}
        </div>

        {/* Listings */}
        <div className="mt-4 px-4">
          <div className="space-y-2">
            {listings.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('noListings')}</p>
            ) : (
              listings.map((item) => (
                <button
                  key={item.id}
                  onClick={() => router.push(`/listing/${item.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl bg-card p-3 shadow-card transition-all hover:shadow-card-hover text-left"
                >
                  <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-secondary">
                    {item.images?.[0] && (
                      <Image
                        src={getSupabaseImageUrl(item.images[0])}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.title_original}</p>
                    <p className="text-sm font-bold text-primary">{formatPrice(item.price)}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(item.created_at)}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Joined date */}
        <p className="px-4 pb-8 pt-4 text-center text-xs text-muted-foreground">
          {t('joinedDate')} {new Date(profile.created_at).toLocaleDateString()}
        </p>
      </div>
    </>
  );
}
