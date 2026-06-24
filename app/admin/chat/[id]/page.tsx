import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/queries';
import { emailInAllowlist } from '@/lib/adminEmails';
import { getAvatarUrl, getSupabaseImageUrl, formatPrice, formatRelativeTime } from '@/lib/utils';
import type { Conversation, Message } from '@/types';

interface Props {
  params: { id: string };
}

export default async function AdminChatViewPage({ params }: Props) {
  const user = await getCurrentUser().catch(() => null);
  const allowed = user
    && (user.is_admin || emailInAllowlist(user.email, process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL));
  if (!allowed) redirect('/admin');

  const supabase = await createAdminSupabaseClient();

  const { data } = await supabase
    .from('conversations')
    .select(`
      *,
      listing:listings(id, title_original, title_translated, images, price),
      buyer:users!conversations_buyer_id_fkey(*),
      seller:users!conversations_seller_id_fkey(*)
    `)
    .eq('id', params.id)
    .single();

  if (!data) notFound();

  const conversation = data as unknown as Conversation;

  const { data: messagesData } = await supabase
    .from('messages')
    .select('*, sender:users(*)')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true });

  const messages = (messagesData ?? []) as unknown as Message[];
  const listingImage = conversation.listing?.images?.[0]
    ? getSupabaseImageUrl(conversation.listing.images[0])
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/admin?tab=chats" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">
              {conversation.buyer?.nickname} → {conversation.seller?.nickname}
            </p>
            <p className="text-xs text-muted-foreground">Admin view · read-only</p>
          </div>
          <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
            Moderation
          </span>
        </div>

        {/* Linked listing banner */}
        {conversation.listing && (
          <Link
            href={`/listing/${conversation.listing.id}`}
            className="mx-auto flex max-w-2xl items-center gap-3 border-t border-border bg-secondary/50 px-4 py-2 transition-colors hover:bg-secondary"
          >
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
            <span className="text-[10px] text-muted-foreground">View listing →</span>
          </Link>
        )}
      </header>

      {/* Participants */}
      <div className="mx-auto max-w-2xl px-4 py-3">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={getAvatarUrl(conversation.buyer?.avatar_url ?? null)} alt="" className="h-8 w-8 rounded-full" />
            <div>
              <p className="text-xs font-semibold text-foreground">{conversation.buyer?.nickname}</p>
              <p className="text-[10px] text-muted-foreground">Buyer · {conversation.buyer?.email}</p>
            </div>
          </div>
          <span className="text-muted-foreground">↔</span>
          <div className="flex items-center gap-2">
            <img src={getAvatarUrl(conversation.seller?.avatar_url ?? null)} alt="" className="h-8 w-8 rounded-full" />
            <div>
              <p className="text-xs font-semibold text-foreground">{conversation.seller?.nickname}</p>
              <p className="text-[10px] text-muted-foreground">Seller · {conversation.seller?.email}</p>
            </div>
          </div>
          <p className="ml-auto text-[10px] text-muted-foreground">{messages.length} messages</p>
        </div>
      </div>

      {/* Messages — read-only */}
      <div className="mx-auto max-w-2xl space-y-3 px-4 pb-12">
        {messages.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">No messages yet</p>
        )}
        {messages.map((msg) => {
          const isBuyer = msg.sender_id === conversation.buyer_id;
          return (
            <div key={msg.id} className={`flex ${isBuyer ? 'justify-start' : 'justify-end'}`}>
              <div className="max-w-[70%]">
                <p className={`mb-1 text-[10px] font-semibold ${isBuyer ? 'text-left text-muted-foreground' : 'text-right text-muted-foreground'}`}>
                  {msg.sender?.nickname} · {isBuyer ? 'Buyer' : 'Seller'}
                </p>
                <div className={`rounded-2xl px-3.5 py-2.5 ${
                  isBuyer
                    ? 'bg-secondary text-secondary-foreground rounded-bl-md'
                    : 'bg-primary text-primary-foreground rounded-br-md'
                }`}>
                  <p className="text-sm">{msg.text_original}</p>
                  {msg.text_translated && msg.text_translated !== msg.text_original && (
                    <p className="mt-1 text-[10px] opacity-60">{msg.text_translated}</p>
                  )}
                  <p className={`mt-1 text-[10px] opacity-60`}>
                    {formatRelativeTime(msg.created_at)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
