'use server';

import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { assertRole, type AdminRole } from '@/lib/adminAuth';
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

// ── User moderation (Phase 3) ───────────────────────────────────────────────

async function notifyUser(
  supabase: Awaited<ReturnType<typeof createAdminSupabaseClient>>,
  userId: string,
  type: string,
  title: string,
  body: string
) {
  await supabase.from('notifications').insert({ user_id: userId, type, title, body, link: '/' });
}

/** Revoke a user's auth sessions (best-effort). Runs through the session client
 *  so the RPC's can_moderate() check sees the caller's JWT. */
async function forceLogout(userId: string) {
  try {
    const session = await createServerSupabaseClient();
    await session.rpc('admin_force_logout', { target: userId });
  } catch (err) {
    console.error('[adminActions] force logout failed', err);
  }
}

export async function adminSuspendUser(id: string, untilIso: string, reason: string) {
  await assertRole('moderator');
  if (!reason?.trim()) throw new Error('A reason is required');
  if (!untilIso) throw new Error('A suspension end date is required');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase
    .from('users')
    .update({ account_status: 'suspended', suspended_until: untilIso, status_reason: reason.trim() })
    .eq('id', id);
  if (error) throw error;
  await forceLogout(id);
  await notifyUser(supabase, id, 'account_suspended', 'Your account was suspended', reason.trim());
  await logAdminAction({ action: 'user.suspend', targetType: 'user', targetId: id, reason: reason.trim(), after: { suspended_until: untilIso } });
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${id}`);
}

export async function adminBanUser(id: string, reason: string) {
  await assertRole('moderator');
  if (!reason?.trim()) throw new Error('A reason is required');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase
    .from('users')
    .update({ account_status: 'banned', suspended_until: null, status_reason: reason.trim() })
    .eq('id', id);
  if (error) throw error;
  await forceLogout(id);
  await notifyUser(supabase, id, 'account_banned', 'Your account was banned', reason.trim());
  await logAdminAction({ action: 'user.ban', targetType: 'user', targetId: id, reason: reason.trim() });
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${id}`);
}

export async function adminReinstateUser(id: string) {
  await assertRole('moderator');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase
    .from('users')
    .update({ account_status: 'active', suspended_until: null, status_reason: null })
    .eq('id', id);
  if (error) throw error;
  await notifyUser(supabase, id, 'account_reinstated', 'Your account was reinstated', 'You can use iMarket again.');
  await logAdminAction({ action: 'user.reinstate', targetType: 'user', targetId: id });
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${id}`);
}

export async function adminForceLogoutUser(id: string) {
  await assertRole('moderator');
  await forceLogout(id);
  await logAdminAction({ action: 'user.force_logout', targetType: 'user', targetId: id });
}

export async function adminSetUserRole(id: string, role: AdminRole | null) {
  await assertRole('super_admin');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase
    .from('users')
    // keep legacy is_admin flag in sync with any admin role
    .update({ admin_role: role, is_admin: role !== null })
    .eq('id', id);
  if (error) throw error;
  await logAdminAction({ action: 'user.set_role', targetType: 'user', targetId: id, after: { role } });
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${id}`);
}

export async function adminAddUserNote(id: string, note: string) {
  await assertRole('support');
  if (!note?.trim()) throw new Error('Note cannot be empty');
  // Internal notes live in the append-only audit log (no separate table).
  await logAdminAction({ action: 'user.note', targetType: 'user', targetId: id, reason: note.trim() });
  revalidatePath(`/admin/users/${id}`);
}
