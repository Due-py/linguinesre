import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParticipant, nextItem, ownAttempt } from "@/lib/research/server";
import { AUDIO_HEADERS, speech } from "@/lib/speaking/tts";
import { mockAi } from "@/lib/usage";

export const dynamic = "force-dynamic";

/**
 * Giọng đọc của câu kiểm tra đang tới lượt (cùng một giọng, cùng tốc độ cho mọi câu, mục 3.5).
 * Nhóm nghiên cứu tạo sẵn mọi giọng đọc trước ngày kiểm tra (npm run research:seed-tests). Không có giọng đọc → 404;
 * bài kiểm tra KHÔNG dùng giọng dự phòng của trình duyệt vì giọng đó khác nhau giữa các máy.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const attemptId = request.nextUrl.searchParams.get("attempt") ?? "";
  const itemId = request.nextUrl.searchParams.get("item") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(attemptId) || !/^[0-9a-f-]{36}$/.test(itemId)) return new NextResponse(null, { status: 400 });

  const [p, attempt] = await Promise.all([getParticipant(user.id), ownAttempt(attemptId, user.id)]);
  if (!p || !attempt) return new NextResponse(null, { status: 404 });
  const item = await nextItem(attempt.id, p.grade, attempt.form);
  if (!item || item.id !== itemId) return new NextResponse(null, { status: 404 });

  const audio = await speech(`test-${item.id}`, item.text);
  if (audio) return new NextResponse(audio, { headers: AUDIO_HEADERS });
  // MOCK_AI=1 (test tự động): không có giọng đọc, trả 204 để giao diện chỉ hiện chữ rồi đi tiếp.
  return new NextResponse(null, { status: mockAi() ? 204 : 404 });
}
