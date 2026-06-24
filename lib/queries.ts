import { createServerSupabaseClient } from './supabaseServer';
import type { Listing, ListingCategory, SortOption, UserProfile } from '@/types';

export async function getUserProfile(id: string): Promise<UserProfile | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as UserProfile;
}

export async function getListings({
  search,
  category,
  location,
  sort = 'newest',
  englishFriendly,
  language,
  page = 0,
  limit = 20,
}: {
  search?: string;
  category?: ListingCategory;
  location?: string;
  sort?: SortOption;
  englishFriendly?: boolean;
  language?: string;
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
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  const sellers = await Promise.all(userIds.map((id) => getUserProfile(id).catch(() => null)));
  const sellerById = new Map(sellers.filter(Boolean).map((u) => [u!.id, u!]));
  return rows.map((r) => ({ ...r, seller: sellerById.get(r.user_id) })) as Listing[];
}

export async function getListingById(id: string): Promise<Listing | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;

  const seller = data.user_id ? await getUserProfile(data.user_id).catch(() => null) : null;
  return { ...(data as Listing), seller: seller ?? undefined };
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

export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return getUserProfile(user.id);
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
