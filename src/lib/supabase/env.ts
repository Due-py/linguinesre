/** Đã điền URL và anon key trong .env.local chưa. Chưa điền thì web vẫn mở được và báo rõ thay vì lỗi. */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
