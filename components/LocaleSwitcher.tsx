'use client';

import { Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'ru', label: 'Русский' },
];

export default function LocaleSwitcher({ variant = 'menu' }: { variant?: 'menu' | 'inline' }) {
  const router = useRouter();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const choose = (code: string) => {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    router.refresh();
  };

  if (variant === 'inline') {
    return (
      <div className="flex gap-2">
        {LOCALES.map((l) => (
          <button
            key={l.code}
            onClick={() => choose(l.code)}
            className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
              locale === l.code ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    );
  }

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
      >
        <Globe size={15} className="text-muted-foreground" /> {current.label}
      </button>
      {open && (
        <div className="absolute right-0 z-50 w-40 overflow-hidden rounded-xl border border-border bg-card shadow-elevated">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => choose(l.code)}
              className={`flex w-full items-center px-4 py-2.5 text-sm hover:bg-secondary ${
                locale === l.code ? 'font-bold text-primary' : 'text-foreground'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
