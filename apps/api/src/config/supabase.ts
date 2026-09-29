import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./env.js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;
  const env = getEnv();
  // Server-only privileged client. RLS still enabled; API-layer auth is mandatory.
  adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

/** Test-only reset. */
export function resetSupabaseAdmin(): void {
  adminClient = null;
}
