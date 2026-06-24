'use client';

import { MapPin, Languages, Settings, ShieldCheck, LogOut, User, MessageCircle, Gavel, Store } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';
import type { UserProfile } from '@/types';
import { getAvatarUrl } from '@/lib/utils';
import ListingFilters from '@/components/listing/ListingFilters';
import NotificationBell from '@/components/NotificationBell';

interface TopNavProps {
  user: UserProfile | null;
}

function isAdminEmail(email: string | null | undefined) {
  const allowList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!email) return false;
  if (allowList.length === 0) return false;
  return allowList.includes(email.trim().toLowerCase());
}

export default function TopNav({ user }: TopNavProps) {
  const t = useTranslations('nav');
  const tTranslation = useTranslations('translation');
  const router = useRouter();
  const pathname = usePathname();
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [location, setLocation] = useState<string>('');
  const [totalUnread, setTotalUnread] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch + subscribe to total unread count across all conversations
  useEffect(() => {
    if (!user) return;
    const client = createClient();

    const fetchUnread = async () => {
      const { data } = await client
        .from('conversations')
        .select('buyer_id, buyer_unread, seller_unread')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
      if (!data) return;
      const total = data.reduce((sum, c) => {
        return sum + (c.buyer_id === user.id ? (c.buyer_unread ?? 0) : (c.seller_unread ?? 0));
      }, 0);
      setTotalUnread(total);
    };

    fetchUnread();

    const channel = client
      .channel('topnav-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchUnread)
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
        const country = data.address?.country || '';
        setLocation([city, country].filter(Boolean).join(', '));
      } catch {
        setLocation('');
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
    setDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 py-3">
          <button onClick={() => router.push('/')} className="flex-shrink-0">
            <img src="/logo.svg" alt="iMarket" className="h-10 w-auto" />
          </button>

          {location && (
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
              <MapPin size={11} /> {location}
            </span>
          )}

          <div className="flex-1">
            <ListingFilters translateEnabled={translateEnabled} compact />
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              onClick={() => router.push('/auctions')}
              aria-label="Auctions"
              className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                pathname.startsWith('/auctions') ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
              }`}
            >
              <Gavel size={18} />
            </button>

            {user && <NotificationBell userId={user.id} />}

            {user && (
              <button
                onClick={() => router.push('/chat')}
                className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  pathname === '/chat' || pathname.startsWith('/chat/')
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary text-foreground'
                }`}
              >
                <MessageCircle size={18} />
                {totalUnread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setTranslateEnabled(!translateEnabled)}
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all sm:flex ${
                translateEnabled ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
              }`}
            >
              <Languages size={14} />
              <span className="hidden lg:inline">{translateEnabled ? tTranslation('autoTranslateOn') : tTranslation('translate')}</span>
            </button>

            {user && (
              <button onClick={() => router.push('/create')} className="hidden rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground sm:block">
                + {t('sell')}
              </button>
            )}

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-full border border-border p-1 pr-3 transition-colors hover:bg-secondary"
                >
                  <img src={getAvatarUrl(user.avatar_url)} alt={user.nickname} className="h-7 w-7 rounded-full object-cover" />
                  <span className="hidden text-xs font-semibold text-foreground sm:block">{user.nickname}</span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-sm font-bold text-foreground">{user.nickname}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <button onClick={() => { router.push(`/profile/${user.id}`); setDropdownOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary">
                        <User size={15} className="text-muted-foreground" /> {t('profile')}
                      </button>
                      <button onClick={() => { router.push('/stores'); setDropdownOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary">
                        <Store size={15} className="text-muted-foreground" /> Stores
                      </button>
                      <button onClick={() => { router.push('/settings'); setDropdownOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary">
                        <Settings size={15} className="text-muted-foreground" /> Settings
                      </button>
                      {(user.is_admin || isAdminEmail(user.email)) && (
                        <button onClick={() => { router.push('/admin'); setDropdownOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary">
                          <ShieldCheck size={15} className="text-muted-foreground" /> {t('admin')}
                        </button>
                      )}
                    </div>
                    <div className="border-t border-border py-1">
                      <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-secondary">
                        <LogOut size={15} /> {t('logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => router.push('/login')} className="rounded-full px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary">
                  {t('login')}
                </button>
                <button onClick={() => router.push('/signup')} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                  {t('signup')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="pb-2 sm:hidden">
          <ListingFilters translateEnabled={translateEnabled} />
        </div>
      </div>
    </header>
  );
}
