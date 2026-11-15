import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";

let cached: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS and must only be used in trusted server code
 * (never imported from a Client Component).
 */
export function adminClient(): SupabaseClient {
  if (cached) return cached;
  const serviceKey = env.supabaseServiceRoleKey();
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  cached = createClient(env.supabaseUrl(), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function hasAdminClient(): boolean {
  return Boolean(env.supabaseServiceRoleKey());
}