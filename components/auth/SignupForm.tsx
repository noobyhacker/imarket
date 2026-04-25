'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import type { TablesInsert } from '@/types/database.types';
import Link from 'next/link';

export default function SignupForm() {
  const router = useRouter();
  const t = useTranslations('auth');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!email || !password || !nickname) return;
    setLoading(true);
    setError('');

    const supabase = createClient();

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Create user profile row
      const userPayload: TablesInsert<'users'> = {
        id: data.user.id,
        email,
        nickname,
        language: navigator.language.startsWith('ko') ? 'ko' : 'en',
        languages: [],
      };
      await supabase.from('users').insert(userPayload);
    }

    router.push('/');
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('nicknameLabel')}
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t('nicknamePlaceholder')}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('emailLabel')}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('passwordLabel')}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('passwordPlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground"
        />
      </div>

      <button
        onClick={handleSignup}
        disabled={!email || !password || !nickname || loading}
        className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-40"
      >
        {loading ? t('signupLoading') : t('signupButton')}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        {t('hasAccount')}{' '}
        <Link href="/login" className="font-semibold text-primary">
          {t('loginLink')}
        </Link>
      </p>
    </div>
  );
}
