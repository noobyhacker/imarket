'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import type { Notification } from '@/types';

export function useRealtimeNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const load = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);
      const rows = (data ?? []) as Notification[];
      setNotifications(rows);
      setUnread(rows.filter((n) => !n.read).length);
    };
    load();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Notification;
          setNotifications((prev) => (prev.find((x) => x.id === n.id) ? prev : [n, ...prev]));
          setUnread((u) => u + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markAllRead = async () => {
    if (!userId || unread === 0) return;
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const supabase = createClient();
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  };

  return { notifications, unread, markAllRead };
}
