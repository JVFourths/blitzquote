export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AvailabilityType = "recurring" | "one_off_available" | "one_off_blocked";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type SubscriptionPlan = "pay_per_booking" | "monthly" | "annual" | "investor";

export interface Database {
  public: {
    Tables: {
      trade_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          icon?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          icon?: string | null;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          business_name: string | null;
          bio: string | null;
          profile_photo_url: string | null;
          postcode: string | null;
          latitude: number | null;
          longitude: number | null;
          service_radius_miles: number;
          is_onboarded: boolean;
          is_verified: boolean;
          is_active: boolean;
          stripe_customer_id: string | null;
          subscription_plan: SubscriptionPlan;
          portfolio_image_urls: string[];
          qualifications: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          business_name?: string | null;
          bio?: string | null;
          profile_photo_url?: string | null;
          postcode?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          service_radius_miles?: number;
          is_onboarded?: boolean;
          is_verified?: boolean;
          is_active?: boolean;
          stripe_customer_id?: string | null;
          subscription_plan?: SubscriptionPlan;
          portfolio_image_urls?: string[];
          qualifications?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          business_name?: string | null;
          bio?: string | null;
          profile_photo_url?: string | null;
          postcode?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          service_radius_miles?: number;
          is_onboarded?: boolean;
          is_verified?: boolean;
          is_active?: boolean;
          stripe_customer_id?: string | null;
          subscription_plan?: SubscriptionPlan;
          portfolio_image_urls?: string[];
          qualifications?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          profile_id: string;
          trade_category_id: string;
          description: string | null;
          hourly_rate_pence: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          trade_category_id: string;
          description?: string | null;
          hourly_rate_pence?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          trade_category_id?: string;
          description?: string | null;
          hourly_rate_pence?: number | null;
          created_at?: string;
        };
      };
      availability: {
        Row: {
          id: string;
          profile_id: string;
          type: AvailabilityType;
          day_of_week: number | null;
          start_time: string | null;
          end_time: string | null;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          type: AvailabilityType;
          day_of_week?: number | null;
          start_time?: string | null;
          end_time?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          type?: AvailabilityType;
          day_of_week?: number | null;
          start_time?: string | null;
          end_time?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          profile_id: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string | null;
          job_description: string;
          postcode: string | null;
          latitude: number | null;
          longitude: number | null;
          slot_start: string;
          slot_end: string;
          status: BookingStatus;
          source: string;
          source_metadata: Json;
          google_calendar_event_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          customer_name: string;
          customer_email: string;
          customer_phone?: string | null;
          job_description: string;
          postcode?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          slot_start: string;
          slot_end: string;
          status?: BookingStatus;
          source?: string;
          source_metadata?: Json;
          google_calendar_event_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string | null;
          job_description?: string;
          postcode?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          slot_start?: string;
          slot_end?: string;
          status?: BookingStatus;
          source?: string;
          source_metadata?: Json;
          google_calendar_event_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      waitlist: {
        Row: {
          id: string;
          name: string;
          email: string;
          trade: string | null;
          preferred_plan: string | null;
          is_invited: boolean;
          invited_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          trade?: string | null;
          preferred_plan?: string | null;
          is_invited?: boolean;
          invited_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          trade?: string | null;
          preferred_plan?: string | null;
          is_invited?: boolean;
          invited_at?: string | null;
          created_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          name: string;
          key_hash: string;
          platform: string | null;
          is_active: boolean;
          rate_limit_per_minute: number;
          last_used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          key_hash: string;
          platform?: string | null;
          is_active?: boolean;
          rate_limit_per_minute?: number;
          last_used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          key_hash?: string;
          platform?: string | null;
          is_active?: boolean;
          rate_limit_per_minute?: number;
          last_used_at?: string | null;
          created_at?: string;
        };
      };
      billing_events: {
        Row: {
          id: string;
          profile_id: string;
          booking_id: string | null;
          event_type: string;
          amount_pence: number;
          currency: string;
          stripe_event_id: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          booking_id?: string | null;
          event_type: string;
          amount_pence: number;
          currency?: string;
          stripe_event_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          booking_id?: string | null;
          event_type?: string;
          amount_pence?: number;
          currency?: string;
          stripe_event_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      availability_type: AvailabilityType;
      booking_status: BookingStatus;
    };
  };
}
