import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/queries';
import ChatDetailClient from '@/components/chat/ChatDetailClient';

interface ChatDetailPageProps {
  params: { id: string };
}

export default async function ChatDetailPage({ params }: ChatDetailPageProps) {
  const [supabase, user] = await Promise.all([
    createServerSupabaseClient(),
    getCurrentUser(),
  ]);

  if (!user) notFound();

  const { data: conversation } = await supabase
    .from('conversations')
    .select(`
      *,
      listing:listings(id, title_original, title_translated, images, price),
      buyer:users!conversations_buyer_id_fkey(*),
      seller:users!conversations_seller_id_fkey(*)
    `)
    .eq('id', params.id)
    .single();

  if (!conversation) notFound();

  // Only buyer or seller can view
  if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
    notFound();
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('*, sender:users(*)')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true });

  return (
    <ChatDetailClient
      conversation={conversation}
      initialMessages={messages ?? []}
      currentUser={user}
    />
  );
}
