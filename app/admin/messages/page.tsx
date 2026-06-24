import { getTranslations } from 'next-intl/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { getAdminContext } from '@/lib/adminAuth';
import MessageModerationClient, { type MessageReportRow } from '@/components/admin/MessageModerationClient';
import type { ReportStatus } from '@/types';

type RawReport = {
  id: string; reason: string; status: ReportStatus; details: string | null;
  created_at: string; reporter_id: string | null; target_type: string; target_id: string;
};

// Access enforced by app/admin/layout.tsx. Only reported threads are listed —
// no blanket DM access.
export default async function AdminMessagesPage() {
  const t = await getTranslations('admin.messages');
  const ctx = await getAdminContext();
  const canModerate = ctx?.role === 'moderator' || ctx?.role === 'super_admin';
  const supabase = await createAdminSupabaseClient();

  const { data } = await supabase
    .from('reports')
    .select('*')
    .in('target_type', ['message', 'conversation'])
    .order('created_at', { ascending: false })
    .limit(100);
  const raw = (data ?? []) as RawReport[];

  // Resolve message targets → their conversation + sender + snippet.
  const messageIds = raw.filter((r) => r.target_type === 'message').map((r) => r.target_id);
  const { data: msgs } = messageIds.length
    ? await supabase.from('messages').select('id, conversation_id, sender_id, text_original').in('id', messageIds)
    : { data: [] };
  const msgById = new Map((msgs ?? []).map((m: { id: string; conversation_id: string; sender_id: string; text_original: string }) => [m.id, m]));

  const userIds = new Set<string>();
  for (const r of raw) if (r.reporter_id) userIds.add(r.reporter_id);
  for (const m of (msgs ?? []) as { sender_id: string }[]) userIds.add(m.sender_id);
  const { data: users } = userIds.size
    ? await supabase.from('users').select('id, nickname').in('id', [...userIds])
    : { data: [] };
  const nameById = new Map((users ?? []).map((u: { id: string; nickname: string }) => [u.id, u.nickname]));

  const rows: MessageReportRow[] = raw.map((r) => {
    const msg = r.target_type === 'message' ? msgById.get(r.target_id) : null;
    const conversationId = r.target_type === 'conversation' ? r.target_id : msg?.conversation_id ?? null;
    const subjectUserId = msg?.sender_id ?? null;
    return {
      reportId: r.id, reason: r.reason, status: r.status, targetType: r.target_type,
      conversationId, messageId: r.target_type === 'message' ? r.target_id : null,
      subjectUserId, subjectName: subjectUserId ? nameById.get(subjectUserId) ?? null : null,
      reporterName: r.reporter_id ? nameById.get(r.reporter_id) ?? null : null,
      snippet: msg?.text_original ?? r.details ?? null,
      createdAt: r.created_at,
    };
  });

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-foreground">{t('title')}</h1>
      <MessageModerationClient rows={rows} canModerate={canModerate} />
    </div>
  );
}
