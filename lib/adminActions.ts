'use server';

import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { assertRole, type AdminRole } from '@/lib/adminAuth';
import { logAdminAction } from '@/lib/auditLog';
import type { ListingCategory, ReportStatus, ReportReason, AnnouncementAudience } from '@/types';

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

/** Remove a store's verified badge (reason required). Reversible via re-verify. */
export async function adminRevokeStoreVerification(id: string, reason: string) {
  await assertRole('moderator');
  if (!reason?.trim()) throw new Error('A reason is required');
  const supabase = await createAdminSupabaseClient();
  const { data: store } = await supabase.from('stores').select('owner_id, name').eq('id', id).single();
  const { error } = await supabase.from('stores').update({ verified: false }).eq('id', id);
  if (error) throw error;
  if (store?.owner_id) {
    await supabase.from('notifications').insert({
      user_id: store.owner_id, type: 'store_unverified',
      title: 'Your store verification was removed', body: reason.trim(), link: '/',
    });
  }
  await logAdminAction({ action: 'store.revoke_verification', targetType: 'store', targetId: id, reason: reason.trim() });
  revalidatePath('/admin/stores');
}

export async function adminReverifyStore(id: string) {
  await assertRole('moderator');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase.from('stores').update({ verified: true }).eq('id', id);
  if (error) throw error;
  await logAdminAction({ action: 'store.reverify', targetType: 'store', targetId: id });
  revalidatePath('/admin/stores');
}

/** Suspend a store — its listings drop out of public view (RLS). */
export async function adminSuspendStore(id: string, reason: string) {
  await assertRole('moderator');
  if (!reason?.trim()) throw new Error('A reason is required');
  const supabase = await createAdminSupabaseClient();
  const { data: store } = await supabase.from('stores').select('owner_id').eq('id', id).single();
  const { error } = await supabase.from('stores').update({ status: 'suspended' }).eq('id', id);
  if (error) throw error;
  if (store?.owner_id) {
    await supabase.from('notifications').insert({
      user_id: store.owner_id, type: 'store_suspended',
      title: 'Your store was suspended', body: reason.trim(), link: '/',
    });
  }
  await logAdminAction({ action: 'store.suspend', targetType: 'store', targetId: id, reason: reason.trim() });
  revalidatePath('/admin/stores');
  revalidatePath('/stores');
}

export async function adminUnsuspendStore(id: string) {
  await assertRole('moderator');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase.from('stores').update({ status: 'active' }).eq('id', id);
  if (error) throw error;
  await logAdminAction({ action: 'store.unsuspend', targetType: 'store', targetId: id });
  revalidatePath('/admin/stores');
  revalidatePath('/stores');
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

// ── Reports & content moderation (Phase 4) ─────────────────────────────────

/** Claim a report and move it into review. */
export async function adminAssignReport(reportId: string) {
  const ctx = await assertRole('moderator');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase
    .from('reports')
    .update({ assigned_to: ctx.userId, status: 'in_review' })
    .eq('id', reportId);
  if (error) throw error;
  await logAdminAction({ action: 'report.assign', targetType: 'report', targetId: reportId });
  revalidatePath('/admin/moderation');
}

/** Resolve a report (actioned/dismissed) with a required resolution note, and
 *  notify the reporter of the outcome. */
export async function adminResolveReport(reportId: string, status: ReportStatus, resolution: string) {
  await assertRole('moderator');
  if ((status === 'actioned' || status === 'dismissed') && !resolution?.trim()) {
    throw new Error('A resolution note is required');
  }
  const supabase = await createAdminSupabaseClient();
  const { data: rep } = await supabase.from('reports').select('reporter_id').eq('id', reportId).single();
  const { error } = await supabase
    .from('reports')
    .update({ status, resolution: resolution?.trim() || null })
    .eq('id', reportId);
  if (error) throw error;
  if (rep?.reporter_id) {
    await supabase.from('notifications').insert({
      user_id: rep.reporter_id,
      type: 'report_update',
      title: status === 'actioned' ? 'Action taken on your report' : 'Your report was reviewed',
      body: resolution?.trim() || null,
      link: '/',
    });
  }
  await logAdminAction({ action: `report.${status}`, targetType: 'report', targetId: reportId, reason: resolution?.trim() });
  revalidatePath('/admin/moderation');
}

/** Recategorize a listing (moderation correction). */
export async function adminSetListingCategory(id: string, category: ListingCategory) {
  await assertRole('moderator');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase.from('listings').update({ category }).eq('id', id);
  if (error) throw error;
  await logAdminAction({ action: 'listing.recategorize', targetType: 'listing', targetId: id, after: { category } });
  revalidatePath('/admin/moderation');
  revalidatePath(`/listing/${id}`);
}

/** Soft-remove many listings at once (reason required). */
export async function adminBulkRemoveListings(ids: string[], reason: string) {
  await assertRole('moderator');
  if (!reason?.trim()) throw new Error('A reason is required');
  if (ids.length === 0) return;
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase.from('listings').update({ status: 'deleted' }).in('id', ids);
  if (error) throw error;
  await logAdminAction({ action: 'listing.bulk_remove', targetType: 'listing', targetId: ids.join(','), reason: reason.trim(), after: { count: ids.length } });
  revalidatePath('/admin/moderation');
  revalidatePath('/');
}

// ── Auction oversight (Phase 6) ─────────────────────────────────────────────

/** Call a SECURITY DEFINER admin RPC through the session client (so its
 *  can_moderate() check sees the caller's JWT) and unwrap the typed result. */
async function callAdminRpc(
  fn: 'admin_cancel_auction' | 'admin_void_bid' | 'admin_extend_auction' | 'admin_force_close',
  args: Record<string, unknown>
) {
  const session = await createServerSupabaseClient();
  const { data, error } = await session.rpc(fn, args as never);
  if (error) throw error;
  const res = data as { ok: boolean; error?: string } | null;
  if (!res?.ok) throw new Error(res?.error ?? 'rpc_failed');
  return res;
}

export async function adminCancelAuction(id: string, reason: string) {
  await assertRole('moderator');
  if (!reason?.trim()) throw new Error('A reason is required');
  await callAdminRpc('admin_cancel_auction', { p_id: id, p_reason: reason.trim() });
  await logAdminAction({ action: 'auction.cancel', targetType: 'listing', targetId: id, reason: reason.trim() });
  revalidatePath('/admin/auctions');
  revalidatePath(`/listing/${id}`);
}

export async function adminVoidBid(bidId: string, reason: string) {
  await assertRole('moderator');
  if (!reason?.trim()) throw new Error('A reason is required');
  const res = await callAdminRpc('admin_void_bid', { p_bid_id: bidId, p_reason: reason.trim() });
  await logAdminAction({ action: 'auction.void_bid', targetType: 'bid', targetId: bidId, reason: reason.trim(), after: res });
  revalidatePath('/admin/auctions');
}

export async function adminExtendAuction(id: string, newEndIso: string) {
  await assertRole('moderator');
  if (!newEndIso) throw new Error('A new end time is required');
  await callAdminRpc('admin_extend_auction', { p_id: id, p_new_end: newEndIso });
  await logAdminAction({ action: 'auction.extend', targetType: 'listing', targetId: id, after: { auction_end: newEndIso } });
  revalidatePath('/admin/auctions');
  revalidatePath(`/listing/${id}`);
}

export async function adminForceCloseAuction(id: string) {
  await assertRole('moderator');
  await callAdminRpc('admin_force_close', { p_id: id });
  await logAdminAction({ action: 'auction.force_close', targetType: 'listing', targetId: id });
  revalidatePath('/admin/auctions');
  revalidatePath(`/listing/${id}`);
}

// ── Messaging moderation (Phase 8) ──────────────────────────────────────────

export async function adminWarnUser(userId: string, reason: string) {
  await assertRole('moderator');
  if (!reason?.trim()) throw new Error('A reason is required');
  const supabase = await createAdminSupabaseClient();
  await notifyUser(supabase, userId, 'warning', 'Warning from moderators', reason.trim());
  await logAdminAction({ action: 'user.warn', targetType: 'user', targetId: userId, reason: reason.trim() });
  revalidatePath('/admin/messages');
}

export async function adminSuspendMessaging(userId: string, reason: string) {
  await assertRole('moderator');
  if (!reason?.trim()) throw new Error('A reason is required');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase.from('users').update({ messaging_suspended: true }).eq('id', userId);
  if (error) throw error;
  await notifyUser(supabase, userId, 'messaging_suspended', 'Messaging suspended', reason.trim());
  await logAdminAction({ action: 'user.suspend_messaging', targetType: 'user', targetId: userId, reason: reason.trim() });
  revalidatePath('/admin/messages');
}

export async function adminUnsuspendMessaging(userId: string) {
  await assertRole('moderator');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase.from('users').update({ messaging_suspended: false }).eq('id', userId);
  if (error) throw error;
  await logAdminAction({ action: 'user.unsuspend_messaging', targetType: 'user', targetId: userId });
  revalidatePath('/admin/messages');
}

/** Soft-remove a single message (kept in the table, shown as a placeholder). */
export async function adminRemoveMessage(messageId: string, reason: string) {
  await assertRole('moderator');
  if (!reason?.trim()) throw new Error('A reason is required');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase.from('messages').update({ removed: true }).eq('id', messageId);
  if (error) throw error;
  await logAdminAction({ action: 'message.remove', targetType: 'message', targetId: messageId, reason: reason.trim() });
  revalidatePath('/admin/messages');
}

// ── Platform config & taxonomy (Phase 9, super_admin) ───────────────────────

export async function adminAddBannedKeyword(keyword: string, category: ReportReason) {
  const ctx = await assertRole('super_admin');
  if (!keyword?.trim()) throw new Error('Keyword is required');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase.from('banned_keywords').insert({ keyword: keyword.trim().toLowerCase(), category, created_by: ctx.userId });
  if (error) throw error;
  await logAdminAction({ action: 'config.add_keyword', targetType: 'banned_keyword', reason: keyword.trim(), after: { category } });
  revalidatePath('/admin/settings');
}

export async function adminDeleteBannedKeyword(id: string) {
  await assertRole('super_admin');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase.from('banned_keywords').delete().eq('id', id);
  if (error) throw error;
  await logAdminAction({ action: 'config.delete_keyword', targetType: 'banned_keyword', targetId: id });
  revalidatePath('/admin/settings');
}

export async function adminSetFeatureFlag(key: string, enabled: boolean, description?: string) {
  const ctx = await assertRole('super_admin');
  if (!key?.trim()) throw new Error('Key is required');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase.from('feature_flags').upsert(
    { key: key.trim(), enabled, description: description ?? null, updated_by: ctx.userId, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );
  if (error) throw error;
  await logAdminAction({ action: 'config.set_flag', targetType: 'feature_flag', targetId: key.trim(), after: { enabled } });
  revalidatePath('/admin/settings');
  revalidatePath('/', 'layout');
}

export async function adminUpsertConfig(key: string, value: string) {
  const ctx = await assertRole('super_admin');
  if (!key?.trim()) throw new Error('Key is required');
  // Store the raw string as a JSON string value.
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase.from('platform_config').upsert(
    { key: key.trim(), value: value as never, updated_by: ctx.userId, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );
  if (error) throw error;
  await logAdminAction({ action: 'config.set', targetType: 'config', targetId: key.trim() });
  revalidatePath('/admin/settings');
}

export async function adminRescanProhibited(): Promise<number> {
  await assertRole('moderator');
  const session = await createServerSupabaseClient();
  const { data, error } = await session.rpc('admin_rescan_prohibited');
  if (error) throw error;
  await logAdminAction({ action: 'config.rescan_prohibited', after: { flagged: data ?? 0 } });
  revalidatePath('/admin/moderation');
  return (data as number) ?? 0;
}

// ── Announcements (Phase 10) ────────────────────────────────────────────────

export interface AnnouncementInput {
  id?: string;
  title: { en: string; ko: string; ru: string };
  body: { en: string; ko: string; ru: string };
  audience: AnnouncementAudience;
  country_code?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  published: boolean;
}

export async function adminSaveAnnouncement(input: AnnouncementInput) {
  const ctx = await assertRole('moderator');
  if (!input.title.en?.trim() && !input.title.ko?.trim() && !input.title.ru?.trim()) {
    throw new Error('A title in at least one language is required');
  }
  const supabase = await createAdminSupabaseClient();
  const row = {
    title: input.title as never,
    body: input.body as never,
    audience: input.audience,
    country_code: input.audience === 'country' ? (input.country_code || null) : null,
    starts_at: input.starts_at || null,
    ends_at: input.ends_at || null,
    published: input.published,
  };
  if (input.id) {
    const { error } = await supabase.from('announcements').update(row).eq('id', input.id);
    if (error) throw error;
    await logAdminAction({ action: 'announcement.update', targetType: 'announcement', targetId: input.id });
  } else {
    const { data, error } = await supabase.from('announcements').insert({ ...row, created_by: ctx.userId }).select('id').single();
    if (error) throw error;
    await logAdminAction({ action: 'announcement.create', targetType: 'announcement', targetId: data?.id });
  }
  revalidatePath('/admin/announcements');
  revalidatePath('/', 'layout');
}

export async function adminToggleAnnouncement(id: string, published: boolean) {
  await assertRole('moderator');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase.from('announcements').update({ published }).eq('id', id);
  if (error) throw error;
  await logAdminAction({ action: published ? 'announcement.publish' : 'announcement.unpublish', targetType: 'announcement', targetId: id });
  revalidatePath('/admin/announcements');
  revalidatePath('/', 'layout');
}

export async function adminDeleteAnnouncement(id: string) {
  await assertRole('moderator');
  const supabase = await createAdminSupabaseClient();
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
  await logAdminAction({ action: 'announcement.delete', targetType: 'announcement', targetId: id });
  revalidatePath('/admin/announcements');
  revalidatePath('/', 'layout');
}
