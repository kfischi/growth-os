import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/types/database";

export type TypedSupabaseClient = SupabaseClient<Database>;

let cached: TypedSupabaseClient | null = null;

/**
 * Read-only Supabase client for Server Components.
 *
 * Uses the anon key, so every query is subject to Row Level Security: the
 * worst a compromised render path can do is read content that is already
 * published on the public site.
 */
export function getSupabaseServerClient(): TypedSupabaseClient {
  if (cached) return cached;

  cached = createClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-application-name": "growth-os" },
    },
  });

  return cached;
}
