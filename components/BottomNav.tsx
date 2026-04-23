'use client';

import { Home, PlusCircle, MessageCircle, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('nav');

  const navItems = [
    { path: '/', icon: Home, label: t('home') },
    { path: '/create', icon: PlusCircle, label: t('sell') },
    { path: '/chat', icon: MessageCircle, label: t('chat') },
  ];

  // Hide on chat detail
  if (pathname.startsWith('/chat/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = pathname === path;
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
