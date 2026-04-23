'use client';

import { MapPin, Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import type { UserProfile } from '@/types';
import { getAvatarUrl } from '@/lib/utils';
import ListingFilters from '@/components/listing/ListingFilters';

interface TopNavProps {
  user: UserProfile | null;
}

export default function TopNav({ user }: TopNavProps) {
  const t = useTranslations('nav');
  const tTranslation = useTranslations('translation');
  const router = useRouter();
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    setDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto max-w-lg">
        {/* Title row */}
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">
              i<span className="text-primary">Market</span>
            </h1>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={11} /> Seoul, South Korea
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Translate toggle */}
            <button
              onClick={() => setTranslateEnabled(!translateEnabled)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                translateEnabled
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              <Languages size={14} />
              {translateEnabled ? tTranslation('autoTranslateOn') : tTranslation('translate')}
            </button>

            {/* Auth */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="h-8 w-8 overflow-hidden rounded-full ring-2 ring-border"
                >
                  <img
                    src={getAvatarUrl(user.avatar_url)}
                    alt={user.nickname}
                    className="h-full w-full object-cover"
                  />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-10 z-50 w-44 rounded-xl border border-border bg-card shadow-elevated">
                    <button
                      onClick={() => { router.push(`/profile/${user.id}`); setDropdownOpen(false); }}
                      className="flex w-full items-center px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
                    >
                      {t('profile')}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center px-4 py-2.5 text-sm text-destructive hover:bg-secondary"
                    >
                      {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                {t('login')}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <ListingFilters translateEnabled={translateEnabled} />
      </div>
    </header>
  );
}
