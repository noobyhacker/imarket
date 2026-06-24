export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bids: {
        Row: {
          amount: number
          bidder_id: string
          created_at: string
          id: string
          listing_id: string
        }
        Insert: {
          amount: number
          bidder_id: string
          created_at?: string
          id?: string
          listing_id: string
        }
        Update: {
          amount?: number
          bidder_id?: string
          created_at?: string
          id?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          buyer_unread: number
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          listing_id: string
          seller_id: string
          seller_unread: number
        }
        Insert: {
          buyer_id: string
          buyer_unread?: number
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          listing_id: string
          seller_id: string
          seller_unread?: number
        }
        Update: {
          buyer_id?: string
          buyer_unread?: number
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          listing_id?: string
          seller_id?: string
          seller_unread?: number
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          auction_end: string | null
          auction_start: string | null
          auction_status: Database["public"]["Enums"]["auction_status"] | null
          bid_increment: number | null
          category: Database["public"]["Enums"]["listing_category"]
          created_at: string
          current_bid: number | null
          current_winner_id: string | null
          description_original: string
          description_translated: string | null
          english_friendly: boolean
          foreigner_safe: boolean
          id: string
          images: string[]
          languages: string[] | null
          location: string
          origin_country_code: string | null
          price: number
          sale_type: Database["public"]["Enums"]["sale_type"]
          starting_price: number | null
          status: Database["public"]["Enums"]["listing_status"]
          store_id: string | null
          title_original: string
          title_translated: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auction_end?: string | null
          auction_start?: string | null
          auction_status?: Database["public"]["Enums"]["auction_status"] | null
          bid_increment?: number | null
          category: Database["public"]["Enums"]["listing_category"]
          created_at?: string
          current_bid?: number | null
          current_winner_id?: string | null
          description_original?: string
          description_translated?: string | null
          english_friendly?: boolean
          foreigner_safe?: boolean
          id?: string
          images?: string[]
          languages?: string[] | null
          location?: string
          origin_country_code?: string | null
          price: number
          sale_type?: Database["public"]["Enums"]["sale_type"]
          starting_price?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          store_id?: string | null
          title_original: string
          title_translated?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auction_end?: string | null
          auction_start?: string | null
          auction_status?: Database["public"]["Enums"]["auction_status"] | null
          bid_increment?: number | null
          category?: Database["public"]["Enums"]["listing_category"]
          created_at?: string
          current_bid?: number | null
          current_winner_id?: string | null
          description_original?: string
          description_translated?: string | null
          english_friendly?: boolean
          foreigner_safe?: boolean
          id?: string
          images?: string[]
          languages?: string[] | null
          location?: string
          origin_country_code?: string | null
          price?: number
          sale_type?: Database["public"]["Enums"]["sale_type"]
          starting_price?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          store_id?: string | null
          title_original?: string
          title_translated?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_current_winner_id_fkey"
            columns: ["current_winner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          original_language: string | null
          sender_id: string
          text_original: string
          text_translated: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          original_language?: string | null
          sender_id: string
          text_original: string
          text_translated?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          original_language?: string | null
          sender_id?: string
          text_original?: string
          text_translated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_listings: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      store_requests: {
        Row: {
          business_name: string | null
          business_reg_number: string | null
          category: string | null
          contact: string | null
          created_at: string
          description: string
          document_url: string | null
          id: string
          logo_url: string | null
          name: string
          review_reason: string | null
          status: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Insert: {
          business_name?: string | null
          business_reg_number?: string | null
          category?: string | null
          contact?: string | null
          created_at?: string
          description?: string
          document_url?: string | null
          id?: string
          logo_url?: string | null
          name: string
          review_reason?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Update: {
          business_name?: string | null
          business_reg_number?: string | null
          category?: string | null
          contact?: string | null
          created_at?: string
          description?: string
          document_url?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          review_reason?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          business_name: string | null
          business_reg_number: string | null
          category: string | null
          created_at: string
          description: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          status: Database["public"]["Enums"]["store_status"]
          verified: boolean
        }
        Insert: {
          business_name?: string | null
          business_reg_number?: string | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          status?: Database["public"]["Enums"]["store_status"]
          verified?: boolean
        }
        Update: {
          business_name?: string | null
          business_reg_number?: string | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          status?: Database["public"]["Enums"]["store_status"]
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "stores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          badge: string | null
          created_at: string
          email: string
          id: string
          is_admin: boolean
          language: string
          languages: string[]
          location: string | null
          nickname: string
          review_count: number
          trust_score: number
        }
        Insert: {
          avatar_url?: string | null
          badge?: string | null
          created_at?: string
          email: string
          id: string
          is_admin?: boolean
          language?: string
          languages?: string[]
          location?: string | null
          nickname: string
          review_count?: number
          trust_score?: number
        }
        Update: {
          avatar_url?: string | null
          badge?: string | null
          created_at?: string
          email?: string
          id?: string
          is_admin?: boolean
          language?: string
          languages?: string[]
          location?: string | null
          nickname?: string
          review_count?: number
          trust_score?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_due_auctions: { Args: never; Returns: number }
      finalize_auction: { Args: { p_listing_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      place_bid: {
        Args: { p_amount: number; p_listing_id: string }
        Returns: Json
      }
    }
    Enums: {
      auction_status: "scheduled" | "live" | "ended" | "cancelled"
      listing_category:
        | "electronics"
        | "furniture"
        | "clothing"
        | "vehicles"
        | "home_appliances"
        | "books"
        | "services"
        | "other"
      listing_status: "active" | "sold" | "deleted"
      request_status: "pending" | "approved" | "rejected"
      sale_type: "fixed" | "auction"
      store_status: "active" | "inactive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      auction_status: ["scheduled", "live", "ended", "cancelled"],
      listing_category: [
        "electronics",
        "furniture",
        "clothing",
        "vehicles",
        "home_appliances",
        "books",
        "services",
        "other",
      ],
      listing_status: ["active", "sold", "deleted"],
      request_status: ["pending", "approved", "rejected"],
      sale_type: ["fixed", "auction"],
      store_status: ["active", "inactive"],
    },
  },
} as const
