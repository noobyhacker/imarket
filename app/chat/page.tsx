import { getTranslations } from 'next-intl/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/queries';
import ChatListClient from '@/components/chat/ChatListClient';
import BottomNav from '@/components/BottomNav';

export default async function ChatPage() {
  const t = await getTranslations('chat');
  const user = await getCurrentUser();

  if (!user) return null;

  const supabase = await createServerSupabaseClient();

  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      *,
      listing:listings(id, title_original, title_translated, images, price),
      buyer:users!conversations_buyer_id_fkey(*),
      seller:users!conversations_seller_id_fkey(*)
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false });

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <h1 className="text-lg font-bold text-foreground">{t('title')}</h1>
        </div>
      </header>
      <ChatListClient
        conversations={conversations ?? []}
        currentUserId={user.id}
        emptyMessage={t('empty')}
      />
      <BottomNav />
    </div>
  );
}
