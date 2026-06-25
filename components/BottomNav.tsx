'use client';

import { Home, PlusCircle, MessageCircle, Gavel } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUnreadCount } from '@/hooks/useUnreadCount';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('nav');
  const unread = useUnreadCount();

  const navItems = [
    { path: '/', icon: Home, label: t('home'), badge: 0 },
    { path: '/auctions', icon: Gavel, label: t('auctions'), badge: 0 },
    { path: '/create', icon: PlusCircle, label: t('sell'), badge: 0 },
    { path: '/chat', icon: MessageCircle, label: t('chat'), badge: unread },
  ];

  // Hide on chat detail
  if (pathname.startsWith('/chat/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-area-bottom sm:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {navItems.map(({ path, icon: Icon, label, badge }) => {
          const active = pathname === path;
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={`relative flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
