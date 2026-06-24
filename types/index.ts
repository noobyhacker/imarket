// Re-export generated Supabase types
export type { Database } from './database.types';
export type { Tables, TablesInsert, TablesUpdate, Enums } from './database.types';

// ── Convenience row types ──────────────────────────────────
import type { Tables as T } from './database.types';

// Columns added in migrations 0001–0003 are not yet in the generated
// database.types.ts (types can't be regenerated against the live project here),
// so they are augmented onto the convenience types below.
export type SaleType      = 'fixed' | 'auction';
export type AuctionStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

export type Listing        = T<'listings'>  & {
  seller?: UserProfile;
  store?: Store;
  // Phase 2
  origin_country_code?: string | null;
  // Phase 3 — auctions
  sale_type?: SaleType;
  starting_price?: number | null;
  bid_increment?: number | null;
  auction_start?: string | null;
  auction_end?: string | null;
  current_bid?: number | null;
  current_winner_id?: string | null;
  auction_status?: AuctionStatus | null;
};

export interface Bid {
  id: string;
  listing_id: string;
  bidder_id: string;
  amount: number;
  created_at: string;
  bidder?: UserProfile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}
export type UserProfile    = T<'users'>;
export type Conversation   = T<'conversations'> & {
  listing?: Pick<T<'listings'>, 'id' | 'title_original' | 'title_translated' | 'images' | 'price'>;
  buyer?:  UserProfile;
  seller?: UserProfile;
};
export type Message        = T<'messages'>  & { sender?: UserProfile };
// Phase 4 store fields augmented (not yet in generated types).
export type Store          = T<'stores'>    & {
  owner?: UserProfile;
  business_name?: string | null;
  business_reg_number?: string | null;
  category?: string | null;
  verified?: boolean;
  listingCount?: number;
};
export type StoreRequest   = T<'store_requests'> & {
  user?: UserProfile;
  business_name?: string | null;
  business_reg_number?: string | null;
  category?: string | null;
  contact?: string | null;
  document_url?: string | null;
  review_reason?: string | null;
};

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
