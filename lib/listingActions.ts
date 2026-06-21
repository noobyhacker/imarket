'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/queries';
import { translateMessage } from '@/lib/translation';
import type { ListingCategory } from '@/types';

async function assertOwner(listingId: string) {
  const [supabase, user] = await Promise.all([
    createServerSupabaseClient(),
    getCurrentUser(),
  ]);
  if (!user) throw new Error('Unauthorized');

  const { data: listing } = await supabase
    .from('listings')
    .select('user_id')
    .eq('id', listingId)
    .single();

  if (!listing || listing.user_id !== user.id) throw new Error('Unauthorized');
  return { supabase };
}

export async function updateListing(
  id: string,
  updates: {
    title_original: string;
    description_original: string;
    price: number;
    category: ListingCategory;
    location: string;
    languages: string[];
  }
) {
  const { supabase } = await assertOwner(id);

  const [title_translated, description_translated] = await Promise.all([
    translateMessage(updates.title_original, 'KO').catch(() => null),
    translateMessage(updates.description_original, 'KO').catch(() => null),
  ]);

  const { error } = await supabase
    .from('listings')
    .update({
      title_original: updates.title_original,
      title_translated,
      description_original: updates.description_original,
      description_translated,
      price: updates.price,
      category: updates.category,
      location: updates.location,
      languages: updates.languages,
      english_friendly: updates.languages.includes('English'),
    })
    .eq('id', id);

  if (error) throw error;
  revalidatePath(`/listing/${id}`);
  revalidatePath('/');
}

export async function toggleListingStatus(id: string, status: 'active' | 'sold') {
  const { supabase } = await assertOwner(id);
  const { error } = await supabase
    .from('listings')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
  revalidatePath(`/listing/${id}`);
  revalidatePath('/');
}

export async function deleteOwnListing(id: string) {
  const { supabase } = await assertOwner(id);
  const { error } = await supabase
    .from('listings')
    .update({ status: 'deleted' })
    .eq('id', id);
  if (error) throw error;
  revalidatePath('/');
}
