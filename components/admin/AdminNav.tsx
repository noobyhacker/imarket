'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { AdminNavItem } from '@/lib/adminNav';
import type { AdminRole } from '@/lib/adminAuth';

const ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: 'Super admin',
  moderator: 'Moderator',
  support: 'Support',
};

export default function AdminNav({ items, role }: { items: AdminNavItem[]; role: AdminRole }) {
  const pathname = usePathname();
  const t = useTranslations('admin.nav');

  return (
    <nav className="flex flex-col gap-1">
      <div className="mb-2 px-3">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {ROLE_LABEL[role]}
        </span>
      </div>
      {items.map((item) => {
        const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
