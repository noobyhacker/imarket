'use server';

import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

async function assertAdmin() {
  const supabase = await createAdminSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Unauthorized');
  }
}

export async function adminDeleteListing(id: string) {
  await assertAdmin();
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase
    .from('listings')
    .update({ status: 'deleted' })
    .eq('id', id);
  if (error) throw error;
  revalidatePath('/admin');
}

export async function adminApproveStoreRequest(requestId: string) {
  await assertAdmin();
  const supabase = await createAdminSupabaseClient();

  // Fetch request details
  const { data: req, error: fetchError } = await supabase
    .from('store_requests')
    .select('*')
    .eq('id', requestId)
    .single();
  if (fetchError || !req) throw new Error('Request not found');

  // Create store
  const { error: storeError } = await supabase.from('stores').insert({
    owner_id: req.user_id,
    name: req.name,
    description: req.description,
    logo_url: req.logo_url,
  });
  if (storeError) throw storeError;

  // Update request status
  const { error: updateError } = await supabase
    .from('store_requests')
    .update({ status: 'approved' })
    .eq('id', requestId);
  if (updateError) throw updateError;

  revalidatePath('/admin');
}

export async function adminRejectStoreRequest(requestId: string) {
  await assertAdmin();
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase
    .from('store_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);
  if (error) throw error;
  revalidatePath('/admin');
}
