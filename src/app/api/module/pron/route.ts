import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canPractice } from "@/lib/research/server";
import { takeQuota } from "@/lib/usage";
import { getModule, ownLesson } from "@/lib/module/server";
import { assessPronunciation, pronConfigured } from "@/lib/speaking/pronService";
import { offTarget, reconcile } from "@/lib/speaking/pron";
import { cropWav } from "@/lib/speaking/wav";
import type { RefHeard } from "@/lib/module/measure";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BYTES = 1_100_000; // 30 giây WAV 16 kHz 16 bit ≈ 960 KB

/**
 * Chấm phát âm chi tiết cho MỘT lượt nói đã lưu (?attempt=<id>), thân là bản WAV 16 kHz do trình duyệt tạo từ âm đã lọc ồn.
 * Chỉ cho bước có câu mẫu cố định (nói từ mới, đọc theo câu, đọc câu đã xếp): câu mẫu lấy từ kế hoạch bài trên máy chủ,
 * không lấy từ trình duyệt. Kết quả lưu vào measures.pron của lượt đó (để xem lại, giáo viên xem được).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  if (!(await canPractice(user.id))) return NextResponse.json({ error: "Trang luyện này chưa mở cho bạn." }, { status: 403 });
  if (!pronConfigured()) return NextResponse.json({ status: "not_configured" });

  const attemptId = request.nextUrl.searchParams.get("attempt") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(attemptId)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  if ((request.headers.get("content-type") ?? "").split(";")[0].trim() !== "audio/wav") return NextResponse.json({ error: "Cần bản WAV." }, { status: 400 });

  // RLS: chỉ đọc được lượt của chính mình.
  const { data: attempt } = await supabase.from("module_attempts").select("id, lesson_id, step, turn, measures").eq("id", attemptId).eq("student_id", user.id).maybeSingle();
  if (!attempt) return NextResponse.json({ error: "Không tìm thấy lượt nói này." }, { status: 404 });
  const lesson = await ownLesson(attempt.lesson_id, user.id);
  const st = lesson?.plan.steps.find((s) => s.n === attempt.step);
  const m = lesson ? await getModule(lesson.moduleId) : null;
  if (!lesson || !st || !m) return NextResponse.json({ error: "Không tìm thấy bài học." }, { status: 404 });

  let reference: string | null = null;
  if (st.t === "learn_word") reference = m.content.vocab.find((v) => v.id === st.ref)?.en ?? null;
  else if (st.t === "say") reference = st.text;
  else if (st.t === "arrange" && attempt.turn === 1) reference = m.content.build.find((b) => b.id === st.ref)?.chunks.join(" ") ?? null;
  if (!reference) return NextResponse.json({ error: "Bước này không có câu mẫu để chấm phát âm." }, { status: 400 });

  const body = await request.arrayBuffer();
  if (body.byteLength < 2_000 || body.byteLength > MAX_BYTES) return NextResponse.json({ error: "Bản ghi quá ngắn hoặc quá dài để chấm phát âm." }, { status: 400 });
  if (!(await takeQuota(user.id, "pron"))) return NextResponse.json({ error: "Gửi quá nhanh. Đợi một chút rồi thử lại." }, { status: 429 });

  // Chấm đúng ĐOẠN em đọc câu mẫu (theo mốc thời gian máy chép lời đã nghe), bỏ phần nói thêm, nói lặp, im lặng.
  const ref = (attempt.measures as { ref?: RefHeard } | null)?.ref;
  const off = offTarget(ref);
  if (off) return NextResponse.json({ status: off });
  const span = ref && ref.start !== null && ref.end !== null ? ref : ref?.all;
  const audio = span && span.start !== null && span.end !== null ? cropWav(new Uint8Array(body), span.start, span.end) : new Uint8Array(body);
  const raw = await assessPronunciation(audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer, reference);
  // Kết quả khớp với những gì máy chép lời đã nghe (xem reconcile).
  const out = raw.status === "ok" ? { ...raw, result: reconcile(raw.result, ref?.words) } : raw;
  if (out.status === "ok") {
    const measures = { ...((attempt.measures as Record<string, unknown> | null) ?? {}), pron: { ...out.result, mock: out.mock, reference } };
    await createAdminClient().from("module_attempts").update({ measures }).eq("id", attempt.id);
  }
  return NextResponse.json(out);
}
