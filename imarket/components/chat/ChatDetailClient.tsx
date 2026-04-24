'use client';

import { ArrowLeft, Send, Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { getAvatarUrl, getSupabaseImageUrl, formatPrice } from '@/lib/utils';
import type { Conversation, Message, UserProfile } from '@/types';

interface ChatDetailClientProps {
  conversation: Conversation;
  initialMessages: Message[];
  currentUser: UserProfile;
}

export default function ChatDetailClient({
  conversation,
  initialMessages,
  currentUser,
}: ChatDetailClientProps) {
  const router = useRouter();
  const t = useTranslations('chat');
  const tTranslation = useTranslations('translation');
  const { messages, setMessages } = useRealtimeMessages(conversation.id, initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isBuyer = conversation.buyer_id === currentUser.id;
  const other = isBuyer ? conversation.seller : conversation.buyer;
  const listingImage = conversation.listing?.images?.[0]
    ? getSupabaseImageUrl(conversation.listing.images[0])
    : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const supabase = createClient();

    // Optimistic insert
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: currentUser.id,
      text_original: text,
      text_translated: null,
      original_language: null,
      created_at: new Date().toISOString(),
      sender: currentUser,
    };
    setMessages((prev) => [...prev, optimistic]);

    // Get translation via API route
    let translated: string | null = null;
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: [text],
          targetLang: isBuyer ? 'KO' : 'EN',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        translated = data.translations?.[0] ?? null;
      }
    } catch {}

    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: currentUser.id,
        text_original: text,
        text_translated: translated,
        original_language: isBuyer ? 'EN' : 'KO',
      })
      .select('*')
      .single();

    if (!error && inserted) {
      // Replace optimistic with real
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...inserted, sender: currentUser } : m))
      );

      // Update conversation last_message
      await supabase
        .from('conversations')
        .update({ last_message: text, last_message_at: new Date().toISOString() })
        .eq('id', conversation.id);
    }

    setSending(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={() => router.push('/chat')} className="p-1">
            <ArrowLeft size={20} />
          </button>
          <img
            src={getAvatarUrl(other?.avatar_url ?? null)}
            alt=""
            className="h-9 w-9 rounded-full bg-secondary"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{other?.nickname}</p>
            <p className="text-[11px] text-muted-foreground">{t('activeNow')}</p>
          </div>
          <button
            onClick={() => setTranslateEnabled(!translateEnabled)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              translateEnabled
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            <Languages size={13} />
            {translateEnabled ? tTranslation('autoTranslateOn') : tTranslation('translate')}
          </button>
        </div>

        {/* Item banner */}
        {conversation.listing && (
          <div className="mx-auto flex max-w-lg items-center gap-3 border-t border-border bg-secondary/50 px-4 py-2">
            {listingImage && (
              <img src={listingImage} alt="" className="h-9 w-9 rounded-lg object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {conversation.listing.title_original}
              </p>
              <p className="text-xs font-bold text-foreground">
                {formatPrice(conversation.listing.price)}
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-lg space-y-3">
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUser.id;
            const displayText =
              translateEnabled && msg.text_translated
                ? msg.text_translated
                : msg.text_original;

            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary text-secondary-foreground rounded-bl-md'
                  }`}
                >
                  <p className="text-sm">{displayText}</p>
                  {translateEnabled && msg.text_translated && msg.text_original !== msg.text_translated && (
                    <p className={`mt-0.5 text-[10px] ${isMe ? 'text-primary-foreground/50' : 'text-muted-foreground'}`}>
                      {tTranslation('originalLanguage')}: {msg.text_original}
                    </p>
                  )}
                  <p className={`mt-1 text-[10px] ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 border-t border-border bg-card safe-area-bottom">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={t('placeholder')}
            className="flex-1 rounded-xl bg-secondary px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform active:scale-90 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
