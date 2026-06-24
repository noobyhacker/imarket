'use server';

import { createServerSupabaseClient } from '@/lib/supabaseServer';
import type { ReportReason, ReportTarget } from '@/types';

const VALID_REASONS: ReportReason[] = ['spam', 'scam', 'prohibited', 'counterfeit', 'harassment', 'wrong_category', 'other'];
const VALID_TARGETS: ReportTarget[] = ['listing', 'user', 'message', 'conversation'];

/**
 * File a report. Runs as the signed-in user (session client) so the RLS
 * `reporter_id = auth.uid()` + active-account check applies. Lightly
 * rate-limited: a user cannot file a second report on the same target within
 * 5 minutes.
 */
export async function createReport(input: {
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!VALID_TARGETS.includes(input.targetType)) return { ok: false, error: 'invalid_target' };
  if (!VALID_REASONS.includes(input.reason)) return { ok: false, error: 'invalid_reason' };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'not_authenticated' };

  // Rate limit: same reporter + target within the last 5 minutes.
  const since = new Date(Date.now() - 5 * 60_000).toISOString();
  const { count } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('reporter_id', user.id)
    .eq('target_type', input.targetType)
    .eq('target_id', input.targetId)
    .gte('created_at', since);
  if ((count ?? 0) > 0) return { ok: false, error: 'already_reported' };

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
