'use client';

import { Upload, X, CheckCircle, AlertCircle, Store as StoreIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { submitStoreApplication } from '@/lib/storeActions';
import { formatBusinessNumber, isValidBusinessNumber } from '@/lib/businessNumber';
import type { Store, StoreRequest } from '@/types';

const STORE_CATEGORIES = ['Electronics', 'Furniture', 'Clothing', 'Food & Grocery', 'Beauty', 'Services', 'Other'];
const MAX_DOC_SIZE = 8 * 1024 * 1024;

interface StoreApplyClientProps {
  userId: string;
  existingStore: Store | null;
  latestRequest: StoreRequest | null;
}

export default function StoreApplyClient({ userId, existingStore, latestRequest }: StoreApplyClientProps) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [category, setCategory] = useState('');
  const [contact, setContact] = useState('');
  const [description, setDescription] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Already a verified store owner
  if (existingStore) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <CheckCircle size={40} className="mx-auto mb-3 text-safe" />
        <h2 className="text-lg font-bold text-foreground">You already have a verified store</h2>
        <p className="mt-1 text-sm text-muted-foreground">{existingStore.business_name || existingStore.name}</p>
        <button onClick={() => router.push(`/stores/${existingStore.id}`)} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
          View my store
        </button>
      </div>
    );
  }

  // Pending application
  if (latestRequest?.status === 'pending') {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <StoreIcon size={40} className="mx-auto mb-3 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Application under review</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;re reviewing your business documents. You&apos;ll be notified once a decision is made.
        </p>
      </div>
    );
  }

  const regValid = isValidBusinessNumber(regNumber);

  const handleDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_DOC_SIZE) { setError('Document must be under 8MB'); return; }
    setDocFile(file);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    if (!businessName || !category || !contact) { setError('Please fill in all required fields'); return; }
    if (!regValid) { setError('Enter a valid 사업자등록번호 (10-digit business number)'); return; }
    if (!docFile) { setError('Please upload your business registration certificate'); return; }

    setLoading(true);
    try {
      const supabase = createClient();
      const ext = docFile.name.split('.').pop() ?? 'pdf';
      const path = `${userId}/cert-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('store-docs').upload(path, docFile, { upsert: false });
      if (upErr) { setError(`Upload failed: ${upErr.message}`); setLoading(false); return; }

      await submitStoreApplication({
        business_name: businessName,
        business_reg_number: regNumber,
        category,
        contact,
        description,
        document_url: path,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      {latestRequest?.status === 'rejected' && (
        <div className="mb-5 flex gap-2 rounded-xl bg-destructive/10 px-4 py-3">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-semibold text-destructive">Previous application rejected</p>
            {latestRequest.review_reason && <p className="mt-0.5 text-xs text-destructive/80">{latestRequest.review_reason}</p>}
            <p className="mt-1 text-xs text-muted-foreground">You can re-apply with corrected details below.</p>
          </div>
        </div>
      )}

      {error && <p className="mb-4 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>}

      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Official business name *</label>
          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="As registered with the NTS" className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">사업자등록번호 (Business reg. no.) *</label>
          <input
            value={formatBusinessNumber(regNumber)}
            onChange={(e) => setRegNumber(e.target.value)}
            placeholder="123-45-67890"
            inputMode="numeric"
            className={`w-full rounded-xl border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary ${
              regNumber && !regValid ? 'border-destructive' : 'border-border'
            }`}
          />
          {regNumber && !regValid && <p className="mt-1 text-xs text-destructive">Invalid business number (check the digits).</p>}
          {regValid && <p className="mt-1 flex items-center gap-1 text-xs text-safe"><CheckCircle size={12} /> Valid format</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category *</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary">
            <option value="">Select a category</option>
            {STORE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact (email or phone) *</label>
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="you@business.com" className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">About your store</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What do you sell?" className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Business registration certificate *</label>
          {docFile ? (
            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3">
              <span className="truncate text-sm text-foreground">{docFile.name}</span>
              <button onClick={() => setDocFile(null)}><X size={16} className="text-muted-foreground" /></button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/50 py-8 transition-colors hover:border-primary/40">
              <Upload size={22} className="text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Upload certificate (PDF or image)</span>
              <span className="text-xs text-muted-foreground/60">Reviewed manually by our team · max 8MB</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleDoc} />
            </label>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !businessName || !regValid || !category || !contact || !docFile}
          className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-40"
        >
          {loading ? 'Submitting…' : 'Submit application'}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Every store is reviewed by a person. We verify your certificate against the submitted name and number.
        </p>
      </div>
    </div>
  );
}
