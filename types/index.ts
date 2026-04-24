// Re-export generated Supabase types
export type { Database } from './database.types';
export type { Tables, TablesInsert, TablesUpdate, Enums } from './database.types';

// ── Convenience row types ──────────────────────────────────
import type { Tables as T } from './database.types';

export type Listing        = T<'listings'>  & { seller?: UserProfile };
export type UserProfile    = T<'users'>;
export type Conversation   = T<'conversations'> & {
  listing?: Pick<T<'listings'>, 'id' | 'title_original' | 'title_translated' | 'images' | 'price'>;
  buyer?:  UserProfile;
  seller?: UserProfile;
};
export type Message        = T<'messages'>  & { sender?: UserProfile };
export type Store          = T<'stores'>    & { owner?: UserProfile };
export type StoreRequest   = T<'store_requests'> & { user?: UserProfile };

// ── Insert helpers ─────────────────────────────────────────
import type { TablesInsert as TI } from './database.types';

export type ListingInsert      = TI<'listings'>;
export type UserProfileInsert  = TI<'users'>;
export type ConversationInsert = TI<'conversations'>;
export type MessageInsert      = TI<'messages'>;
export type StoreInsert        = TI<'stores'>;
export type StoreRequestInsert = TI<'store_requests'>;

// ── Enums ──────────────────────────────────────────────────
import type { Enums as E } from './database.types';

export type ListingCategory = E<'listing_category'>;
export type ListingStatus   = E<'listing_status'>;

// ── UI types ──────────────────────────────────────────────
export type SortOption = 'newest' | 'price_asc' | 'price_desc';
