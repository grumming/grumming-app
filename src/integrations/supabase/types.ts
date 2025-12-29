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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_date: string
          booking_time: string
          created_at: string
          id: string
          reminder_sent: boolean
          salon_name: string
          service_name: string
          service_price: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_date: string
          booking_time: string
          created_at?: string
          id?: string
          reminder_sent?: boolean
          salon_name: string
          service_name: string
          service_price: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_date?: string
          booking_time?: string
          created_at?: string
          id?: string
          reminder_sent?: boolean
          salon_name?: string
          service_name?: string
          service_price?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          last_message_at: string | null
          salon_id: string
          salon_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          salon_id: string
          salon_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          salon_id?: string
          salon_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_salons: {
        Row: {
          created_at: string
          id: string
          salon_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          salon_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          salon_id?: string
          user_id?: string
        }
        Relationships: []
      }
      fcm_tokens: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean
          read_at: string | null
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          read_at?: string | null
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          read_at?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          app_updates: boolean
          booking_confirmations: boolean
          booking_reminders: boolean
          created_at: string
          id: string
          promotions: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          app_updates?: boolean
          booking_confirmations?: boolean
          booking_reminders?: boolean
          created_at?: string
          id?: string
          promotions?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          app_updates?: boolean
          booking_confirmations?: boolean
          booking_reminders?: boolean
          created_at?: string
          id?: string
          promotions?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_rate_limits: {
        Row: {
          attempt_type: string
          attempted_at: string
          id: string
          ip_address: string | null
          phone: string
        }
        Insert: {
          attempt_type: string
          attempted_at?: string
          id?: string
          ip_address?: string | null
          phone: string
        }
        Update: {
          attempt_type?: string
          attempted_at?: string
          id?: string
          ip_address?: string | null
          phone?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          card_brand: string | null
          card_expiry_month: number | null
          card_expiry_year: number | null
          card_last4: string | null
          created_at: string
          id: string
          is_default: boolean | null
          label: string | null
          razorpay_token: string | null
          type: string
          updated_at: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          card_brand?: string | null
          card_expiry_month?: number | null
          card_expiry_year?: number | null
          card_last4?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          razorpay_token?: string | null
          type: string
          updated_at?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          card_brand?: string | null
          card_expiry_month?: number | null
          card_expiry_year?: number | null
          card_last4?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          razorpay_token?: string | null
          type?: string
          updated_at?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          phone: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          otp_code: string
          phone: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_code_usage: {
        Row: {
          booking_id: string | null
          id: string
          promo_code_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          id?: string
          promo_code_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          id?: string
          promo_code_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_discount: number | null
          min_order_value: number | null
          usage_limit: number | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order_value?: number | null
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order_value?: number | null
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referee_id: string
          referee_reward_amount: number | null
          referee_reward_used: boolean | null
          referrer_id: string
          referrer_reward_amount: number | null
          referrer_reward_used: boolean | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referee_id: string
          referee_reward_amount?: number | null
          referee_reward_used?: boolean | null
          referrer_id: string
          referrer_reward_amount?: number | null
          referrer_reward_used?: boolean | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referee_id?: string
          referee_reward_amount?: number | null
          referee_reward_used?: boolean | null
          referrer_id?: string
          referrer_reward_amount?: number | null
          referrer_reward_used?: boolean | null
          status?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          rating: number
          review_text: string | null
          salon_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          salon_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          salon_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      stylists: {
        Row: {
          bio: string | null
          created_at: string
          experience_years: number | null
          id: string
          is_available: boolean | null
          name: string
          photo_url: string | null
          rating: number | null
          salon_id: string
          specialties: string[] | null
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          is_available?: boolean | null
          name: string
          photo_url?: string | null
          rating?: number | null
          salon_id: string
          specialties?: string[] | null
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          is_available?: boolean | null
          name?: string
          photo_url?: string | null
          rating?: number | null
          salon_id?: string
          specialties?: string[] | null
          total_reviews?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          created_at: string
          id: string
          is_default: boolean | null
          label: string
          landmark: string | null
          latitude: number | null
          longitude: number | null
          pincode: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          pincode: string
          state: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          pincode?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_vouchers: {
        Row: {
          booking_id: string | null
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_used: boolean | null
          max_discount: number | null
          min_order_value: number | null
          source: string | null
          title: string
          used_at: string | null
          user_id: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          booking_id?: string | null
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          is_used?: boolean | null
          max_discount?: number | null
          min_order_value?: number | null
          source?: string | null
          title: string
          used_at?: string | null
          user_id: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          booking_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_used?: boolean | null
          max_discount?: number | null
          min_order_value?: number | null
          source?: string | null
          title?: string
          used_at?: string | null
          user_id?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_vouchers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
