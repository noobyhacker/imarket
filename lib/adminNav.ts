import type { AdminRole } from '@/lib/adminAuth';
import { roleRank } from '@/lib/adminAuth';

export interface AdminNavItem {
  href: string;
  /** i18n key under the `admin.nav` namespace. */
  key: string;
  /** Minimum role required to see/visit this section. */
  min: AdminRole;
}

// Only routes that actually exist are listed — no dead nav controls. New
// sections are appended here as each build phase lands.
export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', key: 'dashboard', min: 'support' },
  { href: '/admin/users', key: 'users', min: 'support' },
  { href: '/admin/audit', key: 'audit', min: 'support' },
];

export function navItemsForRole(role: AdminRole): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => roleRank(role) >= roleRank(item.min));
}
