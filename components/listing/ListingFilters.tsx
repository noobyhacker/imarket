'use client';

import { Search } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useState, useTransition } from 'react';

interface ListingFiltersProps {
  translateEnabled: boolean;
  compact?: boolean;
}

const LANGUAGE_OPTIONS = ['English', 'Korean', 'Russian', 'Chinese', 'Vietnamese'] as const;

export default function ListingFilters({ compact = false }: ListingFiltersProps) {
  const t = useTranslations('listings');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  const activeFilter = searchParams.get('filter') ?? 'nearby';
  const activeLanguage = searchParams.get('lang') ?? '';

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null) params.delete(k);
        else params.set(k, v);
      });
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      const id = setTimeout(() => updateParams({ search: value || null }), 400);
      return () => clearTimeout(id);
    },
    [updateParams]
  );

  const tabs = [
    { key: 'nearby', label: t('filterNearby') },
    { key: 'english', label: t('filterEnglish') },
    { key: 'recent', label: t('filterRecent') },
  ];

  // Compact mode: horizontal single row for desktop nav
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 flex-1 max-w-md">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder={t('search')}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
          />
        </div>
        <select
          value={activeLanguage}
          onChange={(e) => updateParams({ lang: e.target.value || null })}
          className="hidden rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground outline-none lg:block"
          aria-label="Filter by language"
        >
          <option value="">All languages</option>
          {LANGUAGE_OPTIONS.map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
        <div className="hidden items-center gap-1.5 lg:flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => updateParams({ filter: tab.key === 'nearby' ? null : tab.key })}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                activeFilter === tab.key || (tab.key === 'nearby' && !searchParams.get('filter'))
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Full mode: stacked for mobile
  return (
    <>
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
          <Search size={16} className="text-muted-foreground" />
          <input
            type="text"
            placeholder={t('search')}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => updateParams({ filter: tab.key === 'nearby' ? null : tab.key })}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              activeFilter === tab.key || (tab.key === 'nearby' && !searchParams.get('filter'))
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="px-4 pb-3">
        <select
          value={activeLanguage}
          onChange={(e) => updateParams({ lang: e.target.value || null })}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
          aria-label="Filter by language"
        >
          <option value="">All languages</option>
          {LANGUAGE_OPTIONS.map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </div>
    </>
  );
}
