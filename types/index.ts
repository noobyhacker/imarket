export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      listings: {
        Row: Listing;
        Insert: ListingInsert;
        Update: Partial<ListingInsert>;
      };
      users: {
        Row: UserProfile;
        Insert: UserProfileInsert;
        Update: Partial<UserProfileInsert>;
      };
      conversations: {
        Row: Conversation;
        Insert: ConversationInsert;
        Update: Partial<ConversationInsert>;
      };
      messages: {
        Row: Message;
        Insert: MessageInsert;
        Update: Partial<MessageInsert>;
      };
      stores: {
        Row: Store;
        Insert: StoreInsert;
        Update: Partial<StoreInsert>;
      };
      store_requests: {
        Row: StoreRequest;
        Insert: StoreRequestInsert;
        Update: Partial<StoreRequestInsert>;
      };
      saved_listings: {
        Row: { user_id: string; listing_id: string; created_at: string };
        Insert: { user_id: string; listing_id: string };
        Update: never;
      };
    };
  };
}

export interface Listing {
  id: string;
  user_id: string;
  store_id: string | null;
  title_original: string;
  title_translated: string | null;
  description_original: string;
  description_translated: string | null;
  price: number;
  category: ListingCategory;
  location: string;
  status: ListingStatus;
  english_friendly: boolean;
  foreigner_safe: boolean;
  images: string[];
  created_at: string;
  updated_at: string;
  // joined
  seller?: UserProfile;
}

export type ListingCategory =
  | 'electronics'
  | 'furniture'
  | 'clothing'
  | 'vehicles'
  | 'home_appliances'
  | 'books'
  | 'services'
  | 'other';

export type ListingStatus = 'active' | 'sold' | 'deleted';

export interface ListingInsert {
  user_id: string;
  store_id?: string | null;
  title_original: string;
  title_translated?: string | null;
  description_original: string;
  description_translated?: string | null;
  price: number;
  category: ListingCategory;
  location: string;
  status?: ListingStatus;
  english_friendly?: boolean;
  foreigner_safe?: boolean;
  images?: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  avatar_url: string | null;
  location: string | null;
  language: string;
  trust_score: number;
  review_count: number;
  badge: string | null;
  languages: string[];
  is_admin: boolean;
  created_at: string;
}

export interface UserProfileInsert {
  id: string;
  email: string;
  nickname: string;
  avatar_url?: string | null;
  location?: string | null;
  language?: string;
  languages?: string[];
}

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message: string | null;
  last_message_at: string | null;
  buyer_unread: number;
  seller_unread: number;
  created_at: string;
  // joined
  listing?: Listing;
  buyer?: UserProfile;
  seller?: UserProfile;
}

export interface ConversationInsert {
  listing_id: string;
  buyer_id: string;
  seller_id: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text_original: string;
  text_translated: string | null;
  original_language: string | null;
  created_at: string;
  // joined
  sender?: UserProfile;
}

export interface MessageInsert {
  conversation_id: string;
  sender_id: string;
  text_original: string;
  text_translated?: string | null;
  original_language?: string | null;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  logo_url: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  // joined
  owner?: UserProfile;
}

export interface StoreInsert {
  owner_id: string;
  name: string;
  description: string;
  logo_url?: string | null;
}

export interface StoreRequest {
  id: string;
  user_id: string;
  name: string;
  description: string;
  logo_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  // joined
  user?: UserProfile;
}

export interface StoreRequestInsert {
  user_id: string;
  name: string;
  description: string;
  logo_url?: string | null;
}

export type SortOption = 'newest' | 'price_asc' | 'price_desc';
