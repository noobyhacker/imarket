import { createServerSupabaseClient } from './supabaseServer';
import type { Listing, ListingCategory, SortOption, UserProfile } from '@/types';

export async function getListings({
  search,
  category,
  location,
  sort = 'newest',
  englishFriendly,
  page = 0,
  limit = 20,
}: {
  search?: string;
  category?: ListingCategory;
  location?: string;
  sort?: SortOption;
  englishFriendly?: boolean;
  page?: number;
  limit?: number;
}): Promise<Listing[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('listings')
    .select('*, seller:users(*)')
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

  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (sort === 'price_asc') {
    query = query.order('price', { ascending: true });
  } else if (sort === 'price_desc') {
    query = query.order('price', { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Listing[];
}

export async function getListingById(id: string): Promise<Listing | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('listings')
    .select('*, seller:users(*)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Listing;
}

export async function getListingsBySeller(
  userId: string,
  status: 'active' | 'sold' = 'active'
): Promise<Listing[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('listings')
    .select('*, seller:users(*)')
    .eq('user_id', userId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Listing[];
}

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

export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return getUserProfile(user.id);
}

export async function getSavedListings(userId: string): Promise<Listing[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('saved_listings')
    .select('listing:listings(*, seller:users(*))')
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
