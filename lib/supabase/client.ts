import { createBrowserClient, type SupabaseClient } from "@supabase/ssr";

import type { Category, Market, User } from "@/types";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User & {
          password_hash: string;
          last_active_at: string;
        };
        Insert: Omit<User, "created_at"> & {
          password_hash: string;
          last_active_at?: string;
        };
        Update: Partial<User> & {
          password_hash?: string;
          last_active_at?: string;
        };
      };
      categories: {
        Row: Category;
        Insert: Category;
        Update: Partial<Category>;
      };
      markets: {
        Row: Omit<Market, "category"> & {
          category_id: string;
          resolution_side: "YES" | "NO" | null;
        };
        Insert: {
          title: string;
          description: string;
          category_id: string;
          creator_id: string;
          expires_at: string;
        };
        Update: Partial<{
          title: string;
          description: string;
          category_id: string;
          yes_volume: number;
          no_volume: number;
          status: Market["status"];
          resolution_side: "YES" | "NO" | null;
          expires_at: string;
        }>;
      };
      bets: {
        Row: {
          id: string;
          user_id: string;
          market_id: string;
          side: "YES" | "NO";
          amount: number;
          shares: number;
          potential_payout: number;
          status: "OPEN" | "WON" | "LOST" | "REFUNDED";
          created_at: string;
        };
        Insert: {
          user_id: string;
          market_id: string;
          side: "YES" | "NO";
          amount: number;
          shares: number;
          potential_payout: number;
          status?: "OPEN" | "WON" | "LOST" | "REFUNDED";
        };
        Update: Partial<{
          shares: number;
          potential_payout: number;
          status: "OPEN" | "WON" | "LOST" | "REFUNDED";
        }>;
      };
    };
  };
}

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Returns a singleton browser Supabase client for PredictMarket.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!browserClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase browser environment variables.");
    }

    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}

export default getSupabaseBrowserClient;
