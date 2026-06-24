'use client';

import { Camera, ChevronDown, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import CountrySelect from '@/components/listing/CountrySelect';
import type { ListingCategory } from '@/types';

const CATEGORIES: ListingCategory[] = [
  'electronics', 'furniture', 'clothing', 'vehicles',
  'home_appliances', 'books', 'services', 'other',
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type ListingLanguage = 'English' | 'Korean' | 'Russian' | 'Chinese' | 'Vietnamese';
const LISTING_LANGUAGES: { key: ListingLanguage; label: string }[] = [
  { key: 'English', label: 'English' },
  { key: 'Korean', label: 'Korean' },
  { key: 'Russian', label: 'Russian' },
  { key: 'Chinese', label: 'Chinese' },
  { key: 'Vietnamese', label: 'Vietnamese' },
];

interface CreateListingFormProps {
  userId: string;
}

export default function CreateListingForm({ userId }: CreateListingFormProps) {
  const router = useRouter();
  const t = useTranslations('create');
  const tCategories = useTranslations('categories');

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<ListingCategory | ''>('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [originCountry, setOriginCountry] = useState<string | null>(null);
  const [languages, setLanguages] = useState<ListingLanguage[]>(['English', 'Korean']);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleLanguage = (lang: ListingLanguage) => {
    setLanguages((prev) => (prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid: File[] = [];
    const previews: string[] = [];

    for (const file of files) {
      if (file.size > MAX_IMAGE_SIZE) {
        setError('Image must be under 5MB');
        return;
      }
      valid.push(file);
      previews.push(URL.createObjectURL(file));
    }

    setImageFiles((prev) => [...prev, ...valid].slice(0, 5));
    setImagePreviews((prev) => [...prev, ...previews].slice(0, 5));
    setError('');
  };

  const removeImage = (i: number) => {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handlePost = async () => {
    if (!title || !price || !category || !location || !description) {
      setError('Please fill in all fields');
      return;
    }
    if (languages.length === 0) {
      setError('Please select at least one language');
      return;
    }
    if (!userId) {
      setError('You must be logged in to post a listing');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      // 1. Upload images (skip if none)
      const imagePaths: string[] = [];
      for (const file of imageFiles) {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('listings')
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (uploadError) {
          setError(`Image upload failed: ${uploadError.message}`);
          setLoading(false);
          return;
        }
        imagePaths.push(path);
      }

      // 2. Translate (optional — don't block on failure)
      let titleTranslated: string | null = null;
      let descTranslated: string | null = null;
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: [title, description], targetLang: 'KO' }),
        });
        if (res.ok) {
          const data = await res.json();
          titleTranslated = data.translations?.[0] ?? null;
          descTranslated = data.translations?.[1] ?? null;
        }
      } catch {
        // Translation failure is non-fatal — proceed without it
      }

      // 3. Insert listing
      const { data: listing, error: insertError } = await supabase
        .from('listings')
        .insert({
          user_id: userId,
          title_original: title,
          title_translated: titleTranslated,
          description_original: description,
          description_translated: descTranslated,
          price: parseInt(price),
          category: category as ListingCategory,
          location,
          english_friendly: languages.includes('English'),
          foreigner_safe: true,
          languages,
          origin_country_code: originCountry,
          images: imagePaths,
          status: 'active',
        })
        .select('id')
        .single();

      if (insertError) {
        // Rollback uploaded images
        for (const path of imagePaths) {
          await supabase.storage.from('listings').remove([path]);
        }
        setError(`Failed to post listing: ${insertError.message}`);
        setLoading(false);
        return;
      }

      if (!listing?.id) {
        setError('Posted, but could not open the new listing page. Please check your listings from home.');
        setLoading(false);
        return;
      }

      router.push(`/listing/${encodeURIComponent(listing.id)}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error: ${msg}`);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      {/* Image upload */}
      <div className="mb-2">
        <label className="flex h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/50 transition-colors hover:border-primary/40">
          <Camera size={28} className="text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">{t('addPhotos')}</span>
          <span className="text-xs text-muted-foreground/60">Up to 5 photos, max 5MB each</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
        </label>
      </div>

      {/* Image previews */}
      {imagePreviews.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {imagePreviews.map((src, i) => (
            <div key={i} className="relative flex-shrink-0">
              <img src={src} alt="" className="h-20 w-20 rounded-xl object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>
      )}

      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('titleLabel')}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('titlePlaceholder')}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('priceLabel')}</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
            placeholder={t('pricePlaceholder')}
            type="text"
            inputMode="numeric"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('categoryLabel')}</label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ListingCategory)}
              className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3 pr-10 text-sm text-foreground outline-none transition-colors focus:border-primary"
            >
              <option value="">{t('categoryPlaceholder')}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{tCategories(c)}</option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('locationLabel')}</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('locationPlaceholder')}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Country of Origin</label>
          <CountrySelect value={originCountry} onChange={setOriginCountry} placeholder="Where is this item from?" />
          <p className="mt-1.5 text-xs text-muted-foreground">Helps buyers find items from their home country.</p>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Languages</label>
          <div className="flex flex-wrap gap-2">
            {LISTING_LANGUAGES.map(({ key, label }) => {
              const active = languages.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleLanguage(key)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition-all ${
                    active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Used for filtering and to show which languages the seller can support for this listing.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('descriptionLabel')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            rows={4}
            className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground"
          />
        </div>

        <button
          onClick={handlePost}
          disabled={!title || !price || !category || !location || !description || languages.length === 0 || loading}
          className="mt-2 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-40"
        >
          {loading ? t('posting') : t('postButton')}
        </button>
      </div>
    </div>
  );
}
