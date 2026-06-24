'use client';

import { Camera, ChevronDown, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabaseClient';
import { updateListing } from '@/lib/listingActions';
import { getSupabaseImageUrl } from '@/lib/utils';
import CountrySelect from '@/components/listing/CountrySelect';
import type { Listing, ListingCategory, Store } from '@/types';

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

interface EditListingFormProps {
  listing: Listing;
  store?: Store | null;
}

export default function EditListingForm({ listing, store }: EditListingFormProps) {
  const router = useRouter();
  const tCategories = useTranslations('categories');

  const [title, setTitle] = useState(listing.title_original);
  const [price, setPrice] = useState(String(listing.price));
  const [category, setCategory] = useState<ListingCategory>(listing.category as ListingCategory);
  const [description, setDescription] = useState(listing.description_original);
  const [location, setLocation] = useState(listing.location ?? '');
  const [originCountry, setOriginCountry] = useState<string | null>(
    (listing as Listing & { origin_country_code?: string | null }).origin_country_code ?? null
  );
  const [publishAsStore, setPublishAsStore] = useState<boolean>(!!listing.store_id);
  const [languages, setLanguages] = useState<ListingLanguage[]>(
    (listing.languages ?? []) as ListingLanguage[]
  );

  // Existing images (stored paths) and new files
  const [existingImages, setExistingImages] = useState<string[]>(listing.images ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleLanguage = (lang: ListingLanguage) => {
    setLanguages((prev) => prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]);
  };

  const handleNewImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const totalAfter = existingImages.length + newFiles.length + files.length;
    if (totalAfter > 5) { setError('Maximum 5 images allowed'); return; }

    const valid: File[] = [];
    const previews: string[] = [];
    for (const file of files) {
      if (file.size > MAX_IMAGE_SIZE) { setError('Image must be under 5MB'); return; }
      valid.push(file);
      previews.push(URL.createObjectURL(file));
    }
    setNewFiles((prev) => [...prev, ...valid]);
    setNewPreviews((prev) => [...prev, ...previews]);
    setError('');
  };

  const removeExisting = (i: number) => setExistingImages((prev) => prev.filter((_, idx) => idx !== i));
  const removeNew = (i: number) => {
    setNewFiles((prev) => prev.filter((_, idx) => idx !== i));
    setNewPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    if (!title || !price || !category || !location || !description) {
      setError('Please fill in all required fields');
      return;
    }
    if (languages.length === 0) { setError('Select at least one language'); return; }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      // Upload new images
      const uploadedPaths: string[] = [];
      for (const file of newFiles) {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${listing.user_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('listings')
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (uploadError) { setError(`Image upload failed: ${uploadError.message}`); setLoading(false); return; }
        uploadedPaths.push(path);
      }

      // Update images list in DB alongside other fields
      const finalImages = [...existingImages, ...uploadedPaths];
      const supabaseClient = createClient();
      await supabaseClient.from('listings').update({ images: finalImages }).eq('id', listing.id);

      await updateListing(listing.id, {
        title_original: title,
        description_original: description,
        price: parseInt(price),
        category,
        location,
        languages,
        origin_country_code: originCountry,
        ...(store ? { store_id: publishAsStore ? store.id : null } : {}),
      });

      router.push(`/listing/${listing.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      {/* Image section */}
      <div className="mb-2">
        <label className="flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/50 transition-colors hover:border-primary/40">
          <Camera size={24} className="text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Add more photos</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleNewImages} />
        </label>
      </div>

      {(existingImages.length > 0 || newPreviews.length > 0) && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {existingImages.map((path, i) => (
            <div key={`ex-${i}`} className="relative flex-shrink-0">
              <img src={getSupabaseImageUrl(path)} alt="" className="h-20 w-20 rounded-xl object-cover" />
              <button onClick={() => removeExisting(i)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                <X size={11} />
              </button>
            </div>
          ))}
          {newPreviews.map((src, i) => (
            <div key={`new-${i}`} className="relative flex-shrink-0">
              <img src={src} alt="" className="h-20 w-20 rounded-xl object-cover ring-2 ring-primary" />
              <button onClick={() => removeNew(i)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mb-4 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>}

      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price (₩)</label>
          <input value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} type="text" inputMode="numeric" className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
          <div className="relative">
            <select value={category} onChange={(e) => setCategory(e.target.value as ListingCategory)} className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3 pr-10 text-sm text-foreground outline-none transition-colors focus:border-primary">
              {CATEGORIES.map((c) => <option key={c} value={c}>{tCategories(c)}</option>)}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary" />
        </div>

        {store && (
          <button
            type="button"
            onClick={() => setPublishAsStore((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">Publish as {store.business_name || store.name}</p>
              <p className="text-xs text-muted-foreground">Show your verified business name on this listing</p>
            </div>
            <span className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors ${publishAsStore ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${publishAsStore ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </span>
          </button>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Country of Origin</label>
          <CountrySelect value={originCountry} onChange={setOriginCountry} placeholder="Where is this item from?" />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Languages</label>
          <div className="flex flex-wrap gap-2">
            {LISTING_LANGUAGES.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => toggleLanguage(key)} className={`rounded-full px-3 py-2 text-xs font-semibold transition-all ${languages.includes(key) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary" />
        </div>

        <button
          onClick={handleSave}
          disabled={!title || !price || !category || !location || !description || languages.length === 0 || loading}
          className="mt-2 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-40"
        >
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
