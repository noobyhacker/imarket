import { Megaphone } from 'lucide-react';
import { getLocale } from 'next-intl/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/queries';
import { getCountryName } from '@/lib/countries';
import type { Announcement } from '@/types';

type LocaleText = { en?: string; ko?: string; ru?: string };

function pick(text: unknown, locale: string): string {
  const t = (text ?? {}) as LocaleText;
  return (t[locale as keyof LocaleText] || t.en || t.ko || t.ru || '').trim();
}

/**
 * Renders currently-active announcements targeted at the viewer, in their
 * locale. RLS already restricts non-admins to published + in-window rows; we
 * still filter audience here. Renders nothing when there's nothing to show.
 */
export default async function AnnouncementBanner() {
  const locale = await getLocale();
  const supabase = await createServerSupabaseClient();

  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from('announcements')
    .select('*')
    .eq('published', true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(10);

  const all = (data ?? []) as Announcement[];
  if (all.length === 0) return null;

  const needsUser = all.some((a) => ['sellers', 'stores', 'country'].includes(a.audience));
  const user = needsUser ? await getCurrentUser().catch(() => null) : null;

  let hasListing = false;
  let hasStore = false;
  if (user && all.some((a) => a.audience === 'sellers')) {
    const { count } = await supabase.from('listings').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    hasListing = (count ?? 0) > 0;
  }
  if (user && all.some((a) => a.audience === 'stores')) {
    const { count } = await supabase.from('stores').select('*', { count: 'exact', head: true }).eq('owner_id', user.id);
    hasStore = (count ?? 0) > 0;
  }

  const visible = all.filter((a) => {
    switch (a.audience) {
      case 'all':
      case 'buyers':
        return true;
      case 'sellers':
        return hasListing;
      case 'stores':
        return hasStore;
      case 'country': {
        const code = a.country_code;
        const loc = user?.location;
        if (!code || !loc) return false;
        const name = (getCountryName(code) ?? '').toLowerCase();
        const locLower = loc.toLowerCase();
        return locLower.includes(name) || locLower.includes(code.toLowerCase());
      }
      default:
        return false;
    }
  });

  if (visible.length === 0) return null;

  return (
    <div className="space-y-px">
      {visible.map((a) => {
        const title = pick(a.title, locale);
        const body = pick(a.body, locale);
        if (!title && !body) return null;
        return (
          <div key={a.id} className="flex items-start gap-2 bg-primary/10 px-4 py-2 text-sm text-foreground">
            <Megaphone size={16} className="mt-0.5 flex-shrink-0 text-primary" />
            <div className="min-w-0">
              {title && <span className="font-semibold">{title}</span>}
              {title && body && <span className="px-1">·</span>}
              {body && <span className="text-muted-foreground">{body}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
