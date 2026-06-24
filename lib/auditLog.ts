import { headers } from 'next/headers';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { getAdminContext } from '@/lib/adminAuth';

export interface AuditEntry {
  action: string;
  targetType?: string;
  targetId?: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
}

function clientIp(): string | null {
  try {
    const h = headers();
    const fwd = h.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0].trim();
    return h.get('x-real-ip');
  } catch {
    return null;
  }
}

/**
 * Append one immutable row to admin_audit_log. Writes via the service-role
 * client (the audit table has no INSERT policy, so this is the only writer).
 * Best-effort: a logging failure must never block the action it records, but
 * it is surfaced to the server console.
 */
export async function logAdminAction(entry: AuditEntry): Promise<void> {
  try {
    const ctx = await getAdminContext();
    const supabase = await createAdminSupabaseClient();
    await supabase.from('admin_audit_log').insert({
      actor_id: ctx?.userId ?? null,
      actor_email: ctx?.email ?? null,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      reason: entry.reason ?? null,
      before: (entry.before ?? null) as never,
      after: (entry.after ?? null) as never,
      ip: clientIp(),
    });
  } catch (err) {
    console.error('[auditLog] failed to record admin action', entry.action, err);
  }
}
