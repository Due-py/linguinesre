import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ownModeSession } from "@/lib/research/modeServer";
import { AUDIO_HEADERS, speech } from "@/lib/speaking/tts";
import { mockAi, takeQuota } from "@/lib/usage";

export const dynamic = "force-dynamic";

/**
 * Giọng đọc của một bước trong buổi luyện: câu hỏi / lời bạn nói chuyện (kind=say) hoặc từ mẫu L0 (kind=model).
 * Chữ cần đọc lấy từ kế hoạch buổi ở máy chủ, không nhận chữ tùy ý từ trình duyệt. MOCK_AI=1: 204 (không có giọng).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const q = request.nextUrl.searchParams;
  const sessionId = q.get("session") ?? "";
  const step = Number(q.get("step"));
  const kind = q.get("kind");
  if (!/^[0-9a-f-]{36}$/.test(sessionId) || !Number.isInteger(step) || (kind !== "say" && kind !== "model"))
    return new NextResponse(null, { status: 400 });

  const s = await ownModeSession(sessionId, user.id);
  const st = s?.plan.steps.find((x) => x.step === step);
  const text = kind === "say" ? st?.say : st?.model;
  if (!s || !st || !text) return new NextResponse(null, { status: 404 });
  if (mockAi()) return new NextResponse(null, { status: 204 });

  const prefix = `mode-${kind}`;
  const cached = await speech(prefix, text, false);
  if (cached) return new NextResponse(cached, { headers: AUDIO_HEADERS });
  if (!(await takeQuota(user.id, "tts"))) return new NextResponse(null, { status: 429 });
  const audio = await speech(prefix, text);
  return audio ? new NextResponse(audio, { headers: AUDIO_HEADERS }) : new NextResponse(null, { status: 404 });
}
