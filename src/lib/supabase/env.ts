// Supabase settings come from env vars (Vercel project settings / .env.local).
// The app must still build and render without them, so callers check first.

export interface SupabasePublicEnv {
  url: string;
  publishableKey: string;
}

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && publishableKey ? { url, publishableKey } : null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicEnv() !== null && Boolean(process.env.SUPABASE_SECRET_KEY);
}

export const NOT_CONFIGURED_MESSAGE =
  "Web chưa được kết nối với Supabase nên chưa đăng ký / đăng nhập được. Xem docs/supabase-setup.md.";
