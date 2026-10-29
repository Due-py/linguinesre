import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Giới hạn lượt gọi dịch vụ tốn tiền, đếm trong bảng api_usage (bền giữa các lần chạy serverless). */
const LIMITS = {
  transcribe: { perMinute: 20, perDay: 300 },
  feedback: { perMinute: 20, perDay: 300 },
  tts: { perMinute: 60, perDay: 600 },
} as const;
export type UsageKind = keyof typeof LIMITS;

/** Trả true nếu còn lượt và ghi nhận một lượt; false nếu đã vượt giới hạn. */
export async function takeQuota(userId: string, kind: UsageKind): Promise<boolean> {
  const admin = createAdminClient();
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const count = async (ms: number) => {
    const { count } = await admin
      .from("api_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("kind", kind)
      .gte("created_at", since(ms));
    return count ?? 0;
  };
  const [minute, day] = await Promise.all([count(60_000), count(86_400_000)]);
  if (minute >= LIMITS[kind].perMinute || day >= LIMITS[kind].perDay) return false;
  await admin.from("api_usage").insert({ user_id: userId, kind });
  return true;
}

export const mockAi = () => process.env.MOCK_AI === "1";
