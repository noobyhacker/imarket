import { createServerSupabaseClient } from './supabaseServer';
import { USER_PUBLIC_COLS } from './userColumns';
import type { Bid, Listing, ListingCategory, SortOption, Store, StoreRequest, UserProfile } from '@/types';

// Re-export for callers that already import it from queries.
export { USER_PUBLIC_COLS };

export async function getUserProfile(id: string): Promise<UserProfile | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select(USER_PUBLIC_COLS)
    .eq('id', id)
    .single();

  if (error) return null;
  return data as unknown as UserProfile;
}

/** Batch-fetch seller profiles in a single query (avoids N+1). */
async function getUserProfilesByIds(ids: string[]): Promise<Map<string, UserProfile>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('users').select(USER_PUBLIC_COLS).in('id', unique);
  return new Map(((data ?? []) as unknown as UserProfile[]).map((u) => [u.id, u]));
}

export async function getListings({
  search,
  category,
  location,
  sort = 'newest',
  englishFriendly,
  language,
  originCountries,
  page = 0,
  limit = 20,
}: {
  search?: string;
  category?: ListingCategory;
  location?: string;
  sort?: SortOption;
  englishFriendly?: boolean;
  language?: string;
  originCountries?: string[];
  page?: number;
  limit?: number;
}): Promise<Listing[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .range(page * limit, (page + 1) * limit - 1);

  if (search) {
    query = query.or(
      `title_original.ilike.%${search}%,title_translated.ilike.%${search}%`
    );
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (originCountries && originCountries.length > 0) {
    query = query.in('origin_country_code', originCountries);
  }

  if (location) {
    query = query.ilike('location', `%${location}%`);
  }

  if (englishFriendly) {
    query = query.eq('english_friendly', true);
  }

  if (language) {
    // languages is a text[] on listings (added via schema migration)
    query = query.contains('languages', [language]);
  }

  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (sort === 'price_asc') {
    query = query.order('price', { ascending: true });
  } else if (sort === 'price_desc') {
    query = query.order('price', { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Listing[];
  const sellerById = await getUserProfilesByIds(rows.map((r) => r.user_id));
  return rows.map((r) => ({ ...r, seller: sellerById.get(r.user_id) })) as Listing[];
}

export async function getListingById(id: string): Promise<Listing | null> {
  const supabase = await createServerSupabaseClient();

  // Lazy close-on-read: finalize the auction if it is past its end time.
  // Security-definer RPC; no-ops for non-auctions or auctions not yet due.
  await supabase.rpc('finalize_auction', { p_listing_id: id }).then(() => {}, () => {});

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;

  const listing = data as Listing;
  const seller = listing.user_id ? await getUserProfile(listing.user_id).catch(() => null) : null;
  const store = listing.store_id ? await getStoreById(listing.store_id).catch(() => null) : null;
  return { ...listing, seller: seller ?? undefined, store: store ?? undefined };
}

export async function getAuctions({
  search,
  category,
  originCountries,
}: {
  search?: string;
  category?: ListingCategory;
  originCountries?: string[];
} = {}): Promise<Listing[]> {
  const supabase = await createServerSupabaseClient();

  // Finalize any due auctions so they drop out of the live list.
  await supabase.rpc('close_due_auctions').then(() => {}, () => {});

  let query = supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .eq('sale_type', 'auction')
    .in('auction_status', ['scheduled', 'live'])
    .order('auction_end', { ascending: true });

  if (search) {
    query = query.or(`title_original.ilike.%${search}%,title_translated.ilike.%${search}%`);
  }
  if (category) query = query.eq('category', category);
  if (originCountries && originCountries.length > 0) {
    query = query.in('origin_country_code', originCountries);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Listing[];
  const sellerById = await getUserProfilesByIds(rows.map((r) => r.user_id));
  return rows.map((r) => ({ ...r, seller: sellerById.get(r.user_id) })) as Listing[];
}

export async function getBids(listingId: string): Promise<Bid[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('bids')
    .select(`*, bidder:users(${USER_PUBLIC_COLS})`)
    .eq('listing_id', listingId)
    .order('amount', { ascending: false });
  if (error) return [];
  return (data ?? []) as unknown as Bid[];
}

export async function getListingsBySeller(
  userId: string,
  status: 'active' | 'sold' = 'active'
): Promise<Listing[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const seller = await getUserProfile(userId).catch(() => null);
  return ((data ?? []) as Listing[]).map((l) => ({ ...l, seller: seller ?? undefined })) as Listing[];
}

// ── Stores ──────────────────────────────────────────────────

export async function getStores(search?: string): Promise<Store[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('stores')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,business_name.ilike.%${search}%,category.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return [];
  const stores = (data ?? []) as Store[];
  if (stores.length === 0) return stores;

  // Listing counts for all stores in a single query, tallied in memory.
  const { data: rows } = await supabase
    .from('listings')
    .select('store_id')
    .in('store_id', stores.map((s) => s.id))
    .eq('status', 'active');

  const counts = new Map<string, number>();
  for (const r of (rows ?? []) as { store_id: string | null }[]) {
    if (r.store_id) counts.set(r.store_id, (counts.get(r.store_id) ?? 0) + 1);
  }
  return stores.map((s) => ({ ...s, listingCount: counts.get(s.id) ?? 0 }));
}

export async function getStoreById(id: string): Promise<Store | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('stores').select('*').eq('id', id).single();
  if (error || !data) return null;
  const owner = await getUserProfile((data as Store).owner_id).catch(() => null);
  return { ...(data as Store), owner: owner ?? undefined };
}

export async function getStoreListings(storeId: string): Promise<Listing[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('store_id', storeId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as Listing[];
}

/** The current user's store (if they are an approved store owner). */
export async function getStoreByOwner(userId: string): Promise<Store | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('stores').select('*').eq('owner_id', userId).maybeSingle();
  return (data as Store) ?? null;
}

/** The user's latest store application (to show pending/rejected state). */
export async function getStoreRequestByUser(userId: string): Promise<StoreRequest | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('store_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as StoreRequest) ?? null;
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // email is sourced from the auth session, not the users table (which has the
  // email column revoked from anon/authenticated).
  const profile = await getUserProfile(user.id);
  if (!profile) return null;
  return { ...profile, email: user.email ?? '' } as UserProfile;
}

export async function getIsListingSaved(userId: string, listingId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('saved_listings')
    .select('listing_id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle();
  return !!data;
}

/** Just the ids the user has saved — used to render heart state in feeds. */
export async function getSavedListingIds(userId: string): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('saved_listings')
    .select('listing_id')
    .eq('user_id', userId);
  return ((data ?? []) as { listing_id: string }[]).map((r) => r.listing_id);
}

export async function getSavedListings(userId: string): Promise<Listing[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('saved_listings')
    .select('listing:listings(*)')
    .eq('user_id', userId);

  if (error) throw error;

  type SavedListingRow = {
    listing: Listing | Listing[] | null;
  };

  return ((data ?? []) as unknown as SavedListingRow[]).flatMap(({ listing }) => {
    if (!listing) return [];
    return Array.isArray(listing) ? listing : [listing];
  });
}
