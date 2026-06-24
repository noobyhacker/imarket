'use client';

import { ArrowLeft, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { getAvatarUrl } from '@/lib/utils';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import type { UserProfile } from '@/types';

interface SettingsClientProps {
  user: UserProfile;
}

export default function SettingsClient({ user }: SettingsClientProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState(user.nickname);
  const [location, setLocation] = useState(user.location ?? '');
  const [language, setLanguage] = useState(user.language ?? 'ko');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!nickname.trim()) return;
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('users')
      .update({ nickname: nickname.trim(), location: location.trim() || null, language })
      .eq('id', user.id);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return; }
    const supabase = createClient();
    const ext = file.type.split('/')[1];
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadErr) { setError(uploadErr.message); return; }
    await supabase.from('users').update({ avatar_url: path }).eq('id', user.id);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button onClick={() => router.back()} className="p-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <img src={getAvatarUrl(user.avatar_url)} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-border" />
            <label className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
              <Camera size={14} />
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">Tap to change photo</p>
        </div>

        {error && <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>}

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nickname</label>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Hongdae, Seoul" className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferred language (translations)</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary">
            <option value="en">English</option>
            <option value="ko">한국어</option>
            <option value="ru">Русский</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Display language (interface)</label>
          <LocaleSwitcher variant="inline" />
        </div>

        <button onClick={handleSave} disabled={saving || !nickname.trim()} className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-40">
          {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </button>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium text-foreground">{user.email}</p>
          </div>
          <div className="border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Member since</p>
            <p className="text-sm font-medium text-foreground">{new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
