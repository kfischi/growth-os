import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/types/database";

let cached: SupabaseClient<Database> | null = null;

/**
 * Service-role Supabase client. Bypasses Row Level Security.
 *
 * Only ever import this from route handlers that have already authenticated
 * the caller — never from a Server Component, and never from client code.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (cached) return cached;

  cached = createClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-application-name": "growth-os-admin" },
    },
  });

  return cached;
}
