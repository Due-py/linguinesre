import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownModeSession } from "@/lib/research/modeServer";

export const dynamic = "force-dynamic";

/**
 * Cộng dồn thời gian luyện của buổi (chỉ tính lúc trang luyện đang mở trên màn hình). Trình duyệt gửi tổng số mili giây
 * đã luyện; máy chủ chỉ cho tăng, và không cho vượt quá thời gian thật kể từ lúc mở buổi.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const q = request.nextUrl.searchParams;
  const sessionId = q.get("session") ?? "";
  const active = Number(q.get("active"));
  if (!/^[0-9a-f-]{36}$/.test(sessionId) || !Number.isInteger(active) || active < 0) return new NextResponse(null, { status: 400 });

  const s = await ownModeSession(sessionId, user.id);
  if (!s) return new NextResponse(null, { status: 404 });
  const wall = Date.now() - new Date(s.started_at).getTime();
  const admin = createAdminClient();
  const { data: cur } = await admin.from("mode_sessions").select("active_ms").eq("id", s.id).single();
  const next = Math.min(Math.max(cur?.active_ms ?? 0, active), wall, 14_400_000);
  await admin.from("mode_sessions").update({ active_ms: next, last_seen_at: new Date().toISOString() }).eq("id", s.id);
  return NextResponse.json({ activeMs: next });
}
