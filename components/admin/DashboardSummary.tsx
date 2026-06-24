import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Users, Package, Gavel, Store, Flag, ShieldAlert, ScrollText, MessageSquare } from 'lucide-react';
import type { AdminKpis, TrendPoint } from '@/lib/adminQueries';

function Sparkline({ points, className = '' }: { points: TrendPoint[]; className?: string }) {
  if (points.length === 0) return null;
  const w = 240;
  const h = 48;
  const max = Math.max(1, ...points.map((p) => p.count));
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const coords = points.map((p, i) => [i * step, h - (p.count / max) * (h - 4) - 2] as const);
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={`h-12 w-full ${className}`}>
      <path d={area} fill="currentColor" opacity={0.12} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

interface Props {
  kpis: AdminKpis;
  trends: { signups: TrendPoint[]; listings: TrendPoint[] };
}

export default async function DashboardSummary({ kpis, trends }: Props) {
  const t = await getTranslations('admin.dashboard');

  const stats = [
    { icon: Users, label: t('totalUsers'), value: kpis.totalUsers, sub: t('signups7d', { count: kpis.signups7d }) },
    { icon: Package, label: t('activeListings'), value: kpis.activeListings },
    { icon: Gavel, label: t('liveAuctions'), value: kpis.liveAuctions },
    { icon: Flag, label: t('openReports'), value: kpis.openReports },
    { icon: ShieldAlert, label: t('flaggedUsers'), value: kpis.flaggedUsers },
  ];

  // Only routes that exist today. The moderation queue tile is added in Phase 4.
  const queues = [
    { icon: Store, label: t('pendingStores'), count: kpis.pendingStores, href: '/admin?tab=storeRequests', tone: 'blue' as const },
    { icon: Package, label: t('reviewListings'), count: kpis.activeListings, href: '/admin?tab=listings', tone: 'slate' as const },
    { icon: Users, label: t('users'), count: undefined, href: '/admin?tab=users', tone: 'slate' as const },
    { icon: MessageSquare, label: t('chats'), count: undefined, href: '/admin?tab=chats', tone: 'slate' as const },
    { icon: ScrollText, label: t('auditLog'), count: undefined, href: '/admin/audit', tone: 'slate' as const },
  ];

  const tone: Record<'amber' | 'blue' | 'slate', string> = {
    amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-blue-600 dark:text-blue-400',
    slate: 'text-muted-foreground',
  };

  return (
    <section className="mb-8 space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {stats.map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon size={16} />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Queue tiles */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">{t('queuesTitle')}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {queues.map(({ icon: Icon, label, count, href, tone: tn }) => (
            <Link
              key={label}
              href={href}
              className="group relative flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-secondary/40"
            >
              <Icon size={18} className={tone[tn]} />
              <span className="text-sm font-medium text-foreground">{label}</span>
              {typeof count === 'number' && count > 0 && (
                <span className="absolute right-3 top-3 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 text-primary">
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t('signupsTrend')}</p>
          <Sparkline points={trends.signups} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-primary">
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t('listingsTrend')}</p>
          <Sparkline points={trends.listings} />
        </div>
      </div>
    </section>
  );
}
