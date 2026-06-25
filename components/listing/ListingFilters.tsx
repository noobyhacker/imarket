'use client';

import { Search, Globe2, ChevronDown, X } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { COUNTRIES, flagEmoji } from '@/lib/countries';

interface ListingFiltersProps {
  translateEnabled: boolean;
  compact?: boolean;
}

const LANGUAGE_OPTIONS = ['English', 'Korean', 'Russian', 'Chinese', 'Vietnamese'] as const;

/** Multi-select country-of-origin filter. Writes a comma-separated `origin` URL param. */
function OriginFilter({
  selected,
  onToggle,
  onClear,
  align = 'left',
}: {
  selected: string[];
  onToggle: (code: string) => void;
  onClear: () => void;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const filtered = query
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : COUNTRIES;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
          selected.length > 0
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-muted'
        }`}
      >
        <Globe2 size={13} />
        {selected.length > 0 ? `Origin · ${selected.length}` : 'Origin'}
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className={`absolute z-50 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-elevated ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search size={14} className="text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries…"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {selected.length > 0 && (
              <button type="button" onClick={onClear} aria-label="Clear">
                <X size={14} className="text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map((c) => {
              const checked = selected.includes(c.code);
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => onToggle(c.code)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-secondary"
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                    {checked && '✓'}
                  </span>
                  <span>{flagEmoji(c.code)}</span>
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })}
            {filtered.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">No match</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ListingFilters({ compact = false }: ListingFiltersProps) {
  const t = useTranslations('listings');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  const activeFilter = searchParams.get('filter') ?? 'nearby';
  const activeLanguage = searchParams.get('lang') ?? '';
  const activeOrigins = (searchParams.get('origin') ?? '').split(',').filter(Boolean);

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

  const toggleOrigin = useCallback(
    (code: string) => {
      const next = activeOrigins.includes(code)
        ? activeOrigins.filter((c) => c !== code)
        : [...activeOrigins, code];
      updateParams({ origin: next.length ? next.join(',') : null });
    },
    [activeOrigins, updateParams]
  );
  const clearOrigins = useCallback(() => updateParams({ origin: null }), [updateParams]);

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
          <OriginFilter selected={activeOrigins} onToggle={toggleOrigin} onClear={clearOrigins} align="right" />
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
      <div className="flex flex-wrap gap-2 px-4 pb-3">
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
        <OriginFilter selected={activeOrigins} onToggle={toggleOrigin} onClear={clearOrigins} />
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
