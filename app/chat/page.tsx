import { getTranslations } from 'next-intl/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getCurrentUser, USER_PUBLIC_COLS } from '@/lib/queries';
import ChatListClient from '@/components/chat/ChatListClient';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';

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
      buyer:users!conversations_buyer_id_fkey(${USER_PUBLIC_COLS}),
      seller:users!conversations_seller_id_fkey(${USER_PUBLIC_COLS})
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false });

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <TopNav user={user} />
      <header className="border-b border-border bg-card/80 px-4 py-4 backdrop-blur-xl">
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
