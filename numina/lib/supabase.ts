import { createClient } from "@supabase/supabase-js";

export type Wallet = {
  address: string;
  total_points: number;
  submission_count: number;
  banned: boolean;
  banned_reason: string | null;
  first_seen_at: string;
  last_active_at: string;
};

export type Submission = {
  id: string;
  wallet_address: string;
  tweet_url: string;
  tweet_id: string | null;
  tweet_author: string | null;
  status: "pending" | "approved" | "rejected";
  points_awarded: number;
  rejection_note: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
  verified_at: string | null;
};

export type Config = {
  key: string;
  value: unknown;
  updated_at: string;
};

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
