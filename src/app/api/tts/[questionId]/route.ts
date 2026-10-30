import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { takeQuota } from "@/lib/usage";
import { AUDIO_HEADERS, speech } from "@/lib/speaking/tts";
import { canPractice } from "@/lib/research/server";

export const dynamic = "force-dynamic";

/**
 * Giọng đọc câu hỏi luyện tập (tạo lần đầu rồi lưu, xem lib/speaking/tts.ts).
 * Không có khóa hoặc lỗi → 404, trình duyệt tự dùng giọng đọc dự phòng (giao diện có báo).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  if (!isSupabaseConfigured() || !/^[0-9a-f-]{36}$/.test(questionId)) return new NextResponse(null, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });
  if (!(await canPractice(user.id))) return new NextResponse(null, { status: 403 });

  // RLS: chỉ đọc được câu hỏi của Unit đã duyệt (hoặc giáo viên xem trước).
  const { data: q } = await supabase.from("questions").select("id, text").eq("id", questionId).maybeSingle();
  if (!q) return new NextResponse(null, { status: 404 });

  const cached = await speech(q.id, q.text, false);
  if (cached) return new NextResponse(cached, { headers: AUDIO_HEADERS });
  if (!(await takeQuota(user.id, "tts"))) return new NextResponse(null, { status: 429 });
  const audio = await speech(q.id, q.text);
  return audio ? new NextResponse(audio, { headers: AUDIO_HEADERS }) : new NextResponse(null, { status: 404 });
}
