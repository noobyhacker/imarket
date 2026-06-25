'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

/**
 * Total unread messages across the user's conversations, kept live via a
 * Realtime subscription. Pass the known user id (TopNav), or omit it to resolve
 * the session user internally (BottomNav).
 */
export function useUnreadCount(knownUserId?: string | null): number {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const client = createClient();
    let channelUserId: string | null = null;
    let channel: ReturnType<typeof client.channel> | null = null;
    let cancelled = false;

    const fetchUnread = async (userId: string) => {
      const { data } = await client
        .from('conversations')
        .select('buyer_id, buyer_unread, seller_unread')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
      if (!data) return;
      const sum = data.reduce(
        (acc, c) => acc + (c.buyer_id === userId ? c.buyer_unread ?? 0 : c.seller_unread ?? 0),
        0
      );
      if (!cancelled) setTotal(sum);
    };

    const init = async () => {
      let userId = knownUserId ?? null;
      if (!userId) {
        const { data } = await client.auth.getUser();
        userId = data.user?.id ?? null;
      }
      if (!userId || cancelled) return;
      channelUserId = userId;
      await fetchUnread(userId);
      channel = client
        .channel(`unread-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchUnread(userId!))
        .subscribe();
    };

    init();

    return () => {
      cancelled = true;
      if (channel) client.removeChannel(channel);
    };
  }, [knownUserId]);

  return total;
}
