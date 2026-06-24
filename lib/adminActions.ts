'use server';

import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/adminAuth';
import { logAdminAction } from '@/lib/auditLog';

export async function adminDeleteListing(id: string, reason?: string) {
  await assertRole('moderator');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase
    .from('listings')
    .update({ status: 'deleted' })
    .eq('id', id);
  if (error) throw error;
  await logAdminAction({ action: 'listing.remove', targetType: 'listing', targetId: id, reason });
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function adminApproveStoreRequest(requestId: string) {
  await assertRole('moderator');
  const supabase = await createAdminSupabaseClient();

  // Fetch request details
  const { data: req, error: fetchError } = await supabase
    .from('store_requests')
    .select('*')
    .eq('id', requestId)
    .single();
  if (fetchError || !req) throw new Error('Request not found');

  // Create verified store
  const { error: storeError } = await supabase.from('stores').insert({
    owner_id: req.user_id,
    name: req.business_name || req.name,
    description: req.description,
    logo_url: req.logo_url,
    business_name: req.business_name,
    business_reg_number: req.business_reg_number,
    category: req.category,
    verified: true,
  });
  if (storeError) throw storeError;

  // Update request status
  const { error: updateError } = await supabase
    .from('store_requests')
    .update({ status: 'approved', review_reason: null })
    .eq('id', requestId);
  if (updateError) throw updateError;

  // Notify applicant
  await supabase.from('notifications').insert({
    user_id: req.user_id,
    type: 'store_approved',
    title: 'Your store was approved',
    body: req.business_name || req.name,
    link: '/create',
  });

  await logAdminAction({
    action: 'store.approve',
    targetType: 'store_request',
    targetId: requestId,
    after: { business_name: req.business_name ?? req.name },
  });
  revalidatePath('/admin');
}

export async function adminRejectStoreRequest(requestId: string, reason: string) {
  await assertRole('moderator');
  if (!reason || !reason.trim()) throw new Error('A rejection reason is required');
  const supabase = await createAdminSupabaseClient();

  const { data: req } = await supabase
    .from('store_requests')
    .select('user_id, name, business_name')
    .eq('id', requestId)
    .single();

  const { error } = await supabase
    .from('store_requests')
    .update({ status: 'rejected', review_reason: reason.trim() })
    .eq('id', requestId);
  if (error) throw error;

  if (req) {
    await supabase.from('notifications').insert({
      user_id: req.user_id,
      type: 'store_rejected',
      title: 'Your store application was not approved',
      body: reason.trim(),
      link: '/stores/apply',
    });
  }

  await logAdminAction({
    action: 'store.reject',
    targetType: 'store_request',
    targetId: requestId,
    reason: reason.trim(),
  });
  revalidatePath('/admin');
}

/** Admin-only signed URL for a business document (private bucket). */
export async function adminGetStoreDocUrl(path: string): Promise<string | null> {
  await assertRole('moderator');
  const supabase = await createAdminSupabaseClient();
  const { data } = await supabase.storage.from('store-docs').createSignedUrl(path, 120);
  return data?.signedUrl ?? null;
}
