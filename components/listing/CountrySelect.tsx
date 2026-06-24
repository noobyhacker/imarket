'use client';

import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { COUNTRIES, flagEmoji, getCountryName } from '@/lib/countries';

interface CountrySelectProps {
  value: string | null; // ISO alpha-2 code or null = unspecified
  onChange: (code: string | null) => void;
  allowUnspecified?: boolean;
  placeholder?: string;
}

export default function CountrySelect({
  value,
  onChange,
  allowUnspecified = true,
  placeholder = 'Select country',
}: CountrySelectProps) {
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

  const selectedName = getCountryName(value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
      >
        <span className={selectedName ? 'text-foreground' : 'text-muted-foreground'}>
          {value ? `${flagEmoji(value)} ${selectedName}` : selectedName ? selectedName : placeholder}
        </span>
        <ChevronDown size={16} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-elevated">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search size={14} className="text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries…"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')}>
                <X size={14} className="text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {allowUnspecified && (
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false); setQuery(''); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-secondary"
              >
                Prefer not to say
              </button>
            )}
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => { onChange(c.code); setOpen(false); setQuery(''); }}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary ${
                  value === c.code ? 'bg-secondary font-semibold text-foreground' : 'text-foreground'
                }`}
              >
                <span>{flagEmoji(c.code)}</span> {c.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">No match</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
