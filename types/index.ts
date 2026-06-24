// Re-export generated Supabase types
export type { Database } from './database.types';
export type { Tables, TablesInsert, TablesUpdate, Enums } from './database.types';

// ── Convenience row types ──────────────────────────────────
import type { Tables as T } from './database.types';

// Relational fields (seller/store/etc.) are joined in at query time and are not
// columns, so they're augmented here. All scalar columns come from the generated
// types — keep this file free of column duplication.
export type UserProfile    = T<'users'>;
export type Listing        = T<'listings'>  & { seller?: UserProfile; store?: Store };
export type Conversation   = T<'conversations'> & {
  listing?: Pick<T<'listings'>, 'id' | 'title_original' | 'title_translated' | 'images' | 'price'>;
  buyer?:  UserProfile;
  seller?: UserProfile;
};
export type Message        = T<'messages'>  & { sender?: UserProfile };
export type Bid            = T<'bids'>       & { bidder?: UserProfile };
export type Notification   = T<'notifications'>;
export type Report         = T<'reports'>   & { reporter?: UserProfile; assignee?: UserProfile };
export type Store          = T<'stores'>    & { owner?: UserProfile; listingCount?: number };
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
export type SaleType        = E<'sale_type'>;
export type AuctionStatus   = E<'auction_status'>;
export type AccountStatus   = E<'account_status'>;
export type ReportReason    = E<'report_reason'>;
export type ReportStatus    = E<'report_status'>;
export type ReportTarget    = E<'report_target'>;

// ── UI types ──────────────────────────────────────────────
export type SortOption = 'newest' | 'price_asc' | 'price_desc';
