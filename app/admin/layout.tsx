import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/adminAuth';
import { navItemsForRole } from '@/lib/adminNav';
import { getCurrentUser } from '@/lib/queries';
import TopNav from '@/components/TopNav';
import AdminNav from '@/components/admin/AdminNav';

// Server-enforced gate for the ENTIRE /admin segment. A non-admin is rejected
// here, before any child page runs or any service-role data is fetched.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminContext();
  if (!ctx) redirect('/');

  const currentUser = await getCurrentUser().catch(() => null);
  const items = navItemsForRole(ctx.role);

  return (
    <div className="min-h-screen bg-background">
      <TopNav user={currentUser} />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row">
        <aside className="md:w-52 md:shrink-0">
          <AdminNav items={items} role={ctx.role} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
