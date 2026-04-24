'use client';

import { useRouter } from 'next/navigation';
import { getAvatarUrl, getSupabaseImageUrl, formatRelativeTime } from '@/lib/utils';
import type { Conversation } from '@/types';

interface ChatListClientProps {
  conversations: Conversation[];
  currentUserId: string;
  emptyMessage: string;
}

export default function ChatListClient({ conversations, currentUserId, emptyMessage }: ChatListClientProps) {
  const router = useRouter();

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      {conversations.map((conv) => {
        const isBuyer = conv.buyer_id === currentUserId;
        const other = isBuyer ? conv.seller : conv.buyer;
        const unread = isBuyer ? conv.buyer_unread : conv.seller_unread;
        const listingImage = conv.listing?.images?.[0]
          ? getSupabaseImageUrl(conv.listing.images[0])
          : null;

        return (
          <button
            key={conv.id}
            onClick={() => router.push(`/chat/${conv.id}`)}
            className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left transition-colors hover:bg-secondary/50"
          >
            {/* Avatar */}
            <div className="relative">
              <img
                src={getAvatarUrl(other?.avatar_url ?? null)}
                alt={other?.nickname ?? ''}
                className="h-12 w-12 rounded-full bg-secondary"
              />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                  {unread}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{other?.nickname}</p>
                <span className="text-[11px] text-muted-foreground">
                  {conv.last_message_at ? formatRelativeTime(conv.last_message_at) : ''}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {conv.listing?.title_original}
              </p>
              <p className={`mt-0.5 truncate text-xs ${unread > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {conv.last_message ?? ''}
              </p>
            </div>

            {/* Listing thumbnail */}
            {listingImage && (
              <img
                src={listingImage}
                alt=""
                className="h-11 w-11 rounded-lg object-cover"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
