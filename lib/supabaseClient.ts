'use client';

import { createBrowserClient } from '@supabase/ssr';

// Untyped client for mutations — avoids never inference from complex Database generic
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
