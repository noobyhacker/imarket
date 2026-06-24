'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { USER_PUBLIC_COLS } from '@/lib/userColumns';
import type { Message } from '@/types';

export function useRealtimeMessages(
  conversationId: string,
  initialMessages: Message[]
) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Fetch sender profile
          const { data: sender } = await supabase
            .from('users')
            .select(USER_PUBLIC_COLS)
            .eq('id', newMsg.sender_id)
            .single();

          setMessages((prev) => {
            // Avoid duplicates (optimistic insert already added it)
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, sender: (sender ?? undefined) as Message['sender'] }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, setMessages };
}
