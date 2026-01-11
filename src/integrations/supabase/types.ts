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
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_date: string
          booking_time: string
          completion_pin: string | null
          created_at: string
          id: string
          payment_id: string | null
          payment_method: string | null
          reminder_sent: boolean
          salon_id: string | null
          salon_name: string
          service_name: string
          service_price: number
          status: string
          stylist_id: string | null
          stylist_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_date: string
          booking_time: string
          completion_pin?: string | null
          created_at?: string
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          reminder_sent?: boolean
          salon_id?: string | null
          salon_name: string
          service_name: string
          service_price: number
          status?: string
          stylist_id?: string | null
          stylist_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_date?: string
          booking_time?: string
          completion_pin?: string | null
          created_at?: string
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          reminder_sent?: boolean
          salon_id?: string | null
          salon_name?: string
          service_name?: string
          service_price?: number
          status?: string
          stylist_id?: string | null
          stylist_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "stylists"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_penalties: {
        Row: {
          booking_id: string
          collecting_salon_id: string | null
          created_at: string
          id: string
          is_paid: boolean
          is_waived: boolean
          original_service_price: number
          paid_at: string | null
          paid_booking_id: string | null
          penalty_amount: number
          penalty_percentage: number
          remitted_at: string | null
          remitted_payout_id: string | null
          remitted_to_platform: boolean | null
          salon_name: string
          service_name: string
          updated_at: string
          user_id: string
          waived_at: string | null
          waived_by: string | null
          waived_reason: string | null
        }
        Insert: {
          booking_id: string
          collecting_salon_id?: string | null
          created_at?: string
          id?: string
          is_paid?: boolean
          is_waived?: boolean
          original_service_price: number
          paid_at?: string | null
          paid_booking_id?: string | null
          penalty_amount: number
          penalty_percentage?: number
          remitted_at?: string | null
          remitted_payout_id?: string | null
          remitted_to_platform?: boolean | null
          salon_name: string
          service_name: string
          updated_at?: string
          user_id: string
          waived_at?: string | null
          waived_by?: string | null
          waived_reason?: string | null
        }
        Update: {
          booking_id?: string
          collecting_salon_id?: string | null
          created_at?: string
          id?: string
          is_paid?: boolean
          is_waived?: boolean
          original_service_price?: number
          paid_at?: string | null
          paid_booking_id?: string | null
          penalty_amount?: number
          penalty_percentage?: number
          remitted_at?: string | null
          remitted_payout_id?: string | null
          remitted_to_platform?: boolean | null
          salon_name?: string
          service_name?: string
          updated_at?: string
          user_id?: string
          waived_at?: string | null
          waived_by?: string | null
          waived_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_penalties_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellation_penalties_collecting_salon_id_fkey"
            columns: ["collecting_salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellation_penalties_paid_booking_id_fkey"
            columns: ["paid_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellation_penalties_remitted_payout_id_fkey"
            columns: ["remitted_payout_id"]
            isOneToOne: false
            referencedRelation: "salon_payouts"
            referencedColumns: ["id"]
          },
        ]
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
      email_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
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
      live_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string | null
          sender_type: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_type: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_type?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_chat_sessions: {
        Row: {
          assigned_agent_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_agent_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_agent_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
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
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          captured_at: string | null
          created_at: string
          currency: string
          fee_percentage: number
          id: string
          metadata: Json | null
          payment_method: string | null
          platform_fee: number
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          salon_amount: number
          salon_id: string | null
          settled_at: string | null
          settlement_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          captured_at?: string | null
          created_at?: string
          currency?: string
          fee_percentage?: number
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          platform_fee?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          salon_amount?: number
          salon_id?: string | null
          settled_at?: string | null
          settlement_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          captured_at?: string | null
          created_at?: string
          currency?: string
          fee_percentage?: number
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          platform_fee?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          salon_amount?: number
          salon_id?: string | null
          settled_at?: string | null
          settlement_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_schedule_settings: {
        Row: {
          auto_approve_threshold: number | null
          created_at: string
          day_of_week: number
          id: string
          is_enabled: boolean
          last_run_at: string | null
          minimum_payout_amount: number
          next_run_at: string | null
          updated_at: string
        }
        Insert: {
          auto_approve_threshold?: number | null
          created_at?: string
          day_of_week?: number
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          minimum_payout_amount?: number
          next_run_at?: string | null
          updated_at?: string
        }
        Update: {
          auto_approve_threshold?: number | null
          created_at?: string
          day_of_week?: number
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          minimum_payout_amount?: number
          next_run_at?: string | null
          updated_at?: string
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
          banned_at: string | null
          banned_reason: string | null
          created_at: string
          email: string | null
          email_verified: boolean | null
          full_name: string | null
          id: string
          is_banned: boolean | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          is_banned?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          is_banned?: boolean | null
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
      refund_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          booking_id: string
          created_at: string
          id: string
          new_status: string | null
          note: string | null
          previous_status: string | null
          refund_amount: number | null
        }
        Insert: {
          action: string
          admin_user_id: string
          booking_id: string
          created_at?: string
          id?: string
          new_status?: string | null
          note?: string | null
          previous_status?: string | null
          refund_amount?: number | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          booking_id?: string
          created_at?: string
          id?: string
          new_status?: string | null
          note?: string | null
          previous_status?: string | null
          refund_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_audit_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      reschedule_fees: {
        Row: {
          booking_id: string
          created_at: string
          fee_amount: number
          fee_percentage: number
          id: string
          new_date: string
          new_time: string
          original_date: string
          original_time: string
          paid_at: string | null
          payment_method: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          salon_id: string | null
          salon_name: string
          service_price: number
          status: string
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          fee_amount: number
          fee_percentage?: number
          id?: string
          new_date: string
          new_time: string
          original_date: string
          original_time: string
          paid_at?: string | null
          payment_method?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          salon_id?: string | null
          salon_name: string
          service_price: number
          status?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          fee_amount?: number
          fee_percentage?: number
          id?: string
          new_date?: string
          new_time?: string
          original_date?: string
          original_time?: string
          paid_at?: string | null
          payment_method?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          salon_id?: string | null
          salon_name?: string
          service_price?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reschedule_fees_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reschedule_fees_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      response_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          owner_response: string | null
          owner_response_at: string | null
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
          owner_response?: string | null
          owner_response_at?: string | null
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
          owner_response?: string | null
          owner_response_at?: string | null
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
      salon_bank_accounts: {
        Row: {
          account_holder_name: string
          account_number: string
          account_type: string | null
          bank_name: string | null
          created_at: string
          id: string
          ifsc_code: string
          is_primary: boolean | null
          is_verified: boolean | null
          razorpay_fund_account_id: string | null
          salon_id: string
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          account_holder_name: string
          account_number: string
          account_type?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          ifsc_code: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          razorpay_fund_account_id?: string | null
          salon_id: string
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          account_type?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          ifsc_code?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          razorpay_fund_account_id?: string | null
          salon_id?: string
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salon_bank_accounts_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_business_hours: {
        Row: {
          break_end: string | null
          break_start: string | null
          closing_time: string
          created_at: string
          day_of_week: number
          id: string
          is_open: boolean
          opening_time: string
          salon_id: string
          updated_at: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          closing_time?: string
          created_at?: string
          day_of_week: number
          id?: string
          is_open?: boolean
          opening_time?: string
          salon_id: string
          updated_at?: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          closing_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_open?: boolean
          opening_time?: string
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_business_hours_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_primary: boolean
          salon_id: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_primary?: boolean
          salon_id: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_primary?: boolean
          salon_id?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_images_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_owners: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean | null
          salon_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          salon_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          salon_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_owners_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_payouts: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string
          id: string
          notes: string | null
          payout_method: string | null
          period_end: string | null
          period_start: string | null
          processed_at: string | null
          processed_by: string | null
          razorpay_fund_account_id: string | null
          razorpay_payout_id: string | null
          salon_id: string
          status: string
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payout_method?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          processed_by?: string | null
          razorpay_fund_account_id?: string | null
          razorpay_payout_id?: string | null
          salon_id: string
          status?: string
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payout_method?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          processed_by?: string | null
          razorpay_fund_account_id?: string | null
          razorpay_payout_id?: string | null
          salon_id?: string
          status?: string
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salon_payouts_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_penalty_remittances: {
        Row: {
          created_at: string | null
          id: string
          payout_id: string | null
          penalty_ids: string[]
          salon_id: string
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          payout_id?: string | null
          penalty_ids: string[]
          salon_id: string
          total_amount: number
        }
        Update: {
          created_at?: string | null
          id?: string
          payout_id?: string | null
          penalty_ids?: string[]
          salon_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "salon_penalty_remittances_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "salon_payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salon_penalty_remittances_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_services: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration: string
          id: string
          is_active: boolean | null
          name: string
          price: number
          salon_id: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          duration?: string
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          salon_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration?: string
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salons: {
        Row: {
          amenities: string[] | null
          city: string
          closing_time: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          opening_time: string | null
          phone: string | null
          rating: number | null
          rejection_reason: string | null
          status: string
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          amenities?: string[] | null
          city: string
          closing_time?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
          opening_time?: string | null
          phone?: string | null
          rating?: number | null
          rejection_reason?: string | null
          status?: string
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          amenities?: string[] | null
          city?: string
          closing_time?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          opening_time?: string | null
          phone?: string | null
          rating?: number | null
          rejection_reason?: string | null
          status?: string
          total_reviews?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      settlements: {
        Row: {
          amount: number
          created_at: string
          fees: number
          id: string
          razorpay_settlement_id: string | null
          settled_at: string | null
          status: string
          tax: number
          updated_at: string
          utr: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          fees?: number
          id?: string
          razorpay_settlement_id?: string | null
          settled_at?: string | null
          status?: string
          tax?: number
          updated_at?: string
          utr?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          fees?: number
          id?: string
          razorpay_settlement_id?: string | null
          settled_at?: string | null
          status?: string
          tax?: number
          updated_at?: string
          utr?: string | null
        }
        Relationships: []
      }
      stylist_days_off: {
        Row: {
          created_at: string
          date_off: string
          id: string
          reason: string | null
          stylist_id: string
        }
        Insert: {
          created_at?: string
          date_off: string
          id?: string
          reason?: string | null
          stylist_id: string
        }
        Update: {
          created_at?: string
          date_off?: string
          id?: string
          reason?: string | null
          stylist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stylist_days_off_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "stylists"
            referencedColumns: ["id"]
          },
        ]
      }
      stylist_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string | null
          id: string
          is_working: boolean
          start_time: string | null
          stylist_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time?: string | null
          id?: string
          is_working?: boolean
          start_time?: string | null
          stylist_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string | null
          id?: string
          is_working?: boolean
          start_time?: string | null
          stylist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stylist_schedules_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "stylists"
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
      support_tickets: {
        Row: {
          admin_response: string | null
          assigned_to: string | null
          attachments: string[] | null
          category: string
          created_at: string
          id: string
          internal_notes: string | null
          message: string
          priority: string
          resolved_at: string | null
          responded_at: string | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          assigned_to?: string | null
          attachments?: string[] | null
          category: string
          created_at?: string
          id?: string
          internal_notes?: string | null
          message: string
          priority?: string
          resolved_at?: string | null
          responded_at?: string | null
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          assigned_to?: string | null
          attachments?: string[] | null
          category?: string
          created_at?: string
          id?: string
          internal_notes?: string | null
          message?: string
          priority?: string
          resolved_at?: string | null
          responded_at?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_phone_audit_log: {
        Row: {
          action: string
          id: string
          ip_address: string | null
          new_description: string | null
          new_is_active: boolean | null
          new_otp_code: string | null
          old_description: string | null
          old_is_active: boolean | null
          old_otp_code: string | null
          performed_at: string | null
          performed_by: string | null
          phone: string
        }
        Insert: {
          action: string
          id?: string
          ip_address?: string | null
          new_description?: string | null
          new_is_active?: boolean | null
          new_otp_code?: string | null
          old_description?: string | null
          old_is_active?: boolean | null
          old_otp_code?: string | null
          performed_at?: string | null
          performed_by?: string | null
          phone: string
        }
        Update: {
          action?: string
          id?: string
          ip_address?: string | null
          new_description?: string | null
          new_is_active?: boolean | null
          new_otp_code?: string | null
          old_description?: string | null
          old_is_active?: boolean | null
          old_otp_code?: string | null
          performed_at?: string | null
          performed_by?: string | null
          phone?: string
        }
        Relationships: []
      }
      test_phone_whitelist: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          otp_code: string
          phone: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          otp_code: string
          phone: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          otp_code?: string
          phone?: string
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
      webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_referral_code: { Args: never; Returns: string }
      get_salon_reviews_with_profiles: {
        Args: { p_salon_id: string; p_salon_name?: string }
        Returns: {
          created_at: string
          id: string
          owner_response: string
          owner_response_at: string
          rating: number
          review_text: string
          reviewer_avatar: string
          reviewer_name: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_salon: {
        Args: { _salon_id: string; _user_id: string }
        Returns: boolean
      }
      validate_referral_code: {
        Args: { p_code: string }
        Returns: {
          is_valid: boolean
          referrer_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "salon_owner"
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
      app_role: ["admin", "moderator", "user", "salon_owner"],
    },
  },
} as const
