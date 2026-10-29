import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateFeedback, type FeedbackPayload } from "@/lib/feedback/generate";
import { mockAi, takeQuota } from "@/lib/usage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * AI nhận xét cho MỘT câu trả lời tầng L2 (mở rộng câu, có lý do) của chế độ A. Chỉ L2 mới có AI nhận xét, để giữ chi phí
 * trong ngân sách (khoảng 3 lượt mỗi buổi). Đã có nhận xét thì trả lại, không gọi AI lần nữa.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  const turnId = request.nextUrl.searchParams.get("turn") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(turnId)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });

  const admin = createAdminClient();
  const { data: t } = await admin
    .from("mode_turns")
    .select("id, student_id, session_id, step, activity, transcript, feedback, mode_sessions(grade, plan)")
    .eq("id", turnId)
    .maybeSingle();
  if (!t || t.student_id !== user.id || t.activity !== "expand") return NextResponse.json({ error: "Không tìm thấy câu trả lời này." }, { status: 404 });
  if ((t.feedback as FeedbackPayload | null)?.version === 1) return NextResponse.json({ payload: t.feedback });
  if (!t.transcript) return NextResponse.json({ error: "Máy chưa nghe được câu trả lời nên chưa nhận xét được." }, { status: 422 });

  const sess = t.mode_sessions as unknown as { grade: number; plan: { steps: { step: number; prompt: string; keywords?: string[] }[] } };
  const st = sess.plan.steps.find((x) => x.step === t.step);
  if (!st) return NextResponse.json({ error: "Không tìm thấy câu hỏi." }, { status: 404 });

  const mock = mockAi();
  if (!mock && !(await takeQuota(user.id, "feedback")))
    return NextResponse.json({ error: "Bạn vừa xin nhận xét nhiều lần liên tục. Hãy nghỉ một phút rồi thử lại." }, { status: 429 });
  const r = await generateFeedback(
    { text: st.prompt, kind: "reason", expectsReason: true, keywords: st.keywords ?? [], grade: sess.grade },
    t.transcript,
    mock,
  );
  if (!r.ok) {
    console.error("mode feedback failed", { turnId: t.id, model: r.model, reason: r.reason });
    return NextResponse.json({ error: "AI chưa nhận xét được lúc này." }, { status: 502 });
  }
  await admin.from("mode_turns").update({ feedback: r.payload }).eq("id", t.id);
  return NextResponse.json({ payload: r.payload });
}
