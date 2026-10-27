import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./env";

/**
 * Secret-key client that BYPASSES row-level security. Only for server code that
 * has already checked who is asking (creating accounts, login lockouts).
 */
export function createSupabaseAdminClient() {
  const env = getSupabasePublicEnv();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!env || !secretKey) throw new Error("Supabase is not configured");

  return createClient(env.url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
