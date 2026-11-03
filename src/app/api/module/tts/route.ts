import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { takeQuota } from "@/lib/usage";
import { AUDIO_HEADERS, speech } from "@/lib/speaking/tts";
import { canPractice } from "@/lib/research/server";
import { getModule } from "@/lib/module/server";
import { speakable } from "@/lib/module/text";

export const dynamic = "force-dynamic";

/**
 * Giọng đọc mẫu của module: ?m=<module>&k=<mã nội dung> (từ, câu ví dụ, câu hỏi...), hoặc ?a=<lượt roleplay> (lời đáp của
 * bạn đóng vai). Tạo lần đầu rồi lưu lại (lib/speaking/tts.ts), nên mỗi câu chỉ tốn tiền một lần.
 * Không có giọng → 404, trình duyệt dùng giọng dự phòng.
 */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) return new NextResponse(null, { status: 404 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });
  if (!(await canPractice(user.id))) return new NextResponse(null, { status: 403 });

  const p = request.nextUrl.searchParams;
  let prefix: string;
  let text: string | null = null;
  const attemptId = p.get("a");
  if (attemptId) {
    if (!/^[0-9a-f-]{36}$/.test(attemptId)) return new NextResponse(null, { status: 404 });
    // RLS: chỉ đọc được lượt của chính mình.
    const { data } = await supabase.from("module_attempts").select("id, reply").eq("id", attemptId).eq("student_id", user.id).maybeSingle();
    text = data?.reply ?? null;
    prefix = `mr-${attemptId}`;
  } else {
    const m = await getModule(p.get("m") ?? "");
    const key = p.get("k") ?? "";
    if (!m || !/^[a-z]\d{2}(\.[a-z0-9]+)?$/.test(key)) return new NextResponse(null, { status: 404 });
    text = speakable(m.content, key);
    prefix = `m-${m.id}-${key}`;
  }
  if (!text) return new NextResponse(null, { status: 404 });

  const cached = await speech(prefix, text, false);
  if (cached) return new NextResponse(cached, { headers: AUDIO_HEADERS });
  if (!(await takeQuota(user.id, "tts"))) return new NextResponse(null, { status: 429 });
  const audio = await speech(prefix, text);
  return audio ? new NextResponse(audio, { headers: AUDIO_HEADERS }) : new NextResponse(null, { status: 404 });
}
