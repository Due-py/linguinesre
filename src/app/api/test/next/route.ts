import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParticipant, nextItem, ownAttempt } from "@/lib/research/server";

export const dynamic = "force-dynamic";

/** Câu kiểm tra tiếp theo của lượt làm. Chỉ đưa đúng một câu, khi tới lượt, để không ai xem trước đề. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  const attemptId = request.nextUrl.searchParams.get("attempt") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(attemptId)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });

  const [p, attempt] = await Promise.all([getParticipant(user.id), ownAttempt(attemptId, user.id)]);
  if (!p || !attempt) return NextResponse.json({ error: "Không tìm thấy bài kiểm tra này." }, { status: 404 });
  const item = await nextItem(attempt.id, p.grade, attempt.form);
  return NextResponse.json({ item });
}
