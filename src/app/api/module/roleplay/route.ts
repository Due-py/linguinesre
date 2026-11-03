import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canPractice } from "@/lib/research/server";
import { takeQuota } from "@/lib/usage";
import { getModule, ownLesson } from "@/lib/module/server";
import { transcribeModule } from "@/lib/module/asr";
import { requirementMet, speechMeasures } from "@/lib/module/measure";
import { roleplayReply } from "@/lib/module/ai";
import type { Turn } from "@/lib/module/roleplayCore";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TYPES: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg" };
const int = (v: string | null, min: number, max: number) => {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

/**
 * Một lượt nói của học sinh trong Micro-Roleplay, rồi lời đáp của bạn đóng vai (AI, hoặc câu dự phòng viết sẵn).
 * Lượt cuối: không đáp nữa, kiểm tra các yêu cầu của tình huống bằng quy tắc trên toàn bộ lời học sinh.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  if (!(await canPractice(user.id))) return NextResponse.json({ error: "Trang luyện này chưa mở cho bạn." }, { status: 403 });

  const p = request.nextUrl.searchParams;
  const step = int(p.get("step"), 0, 300);
  const turn = int(p.get("turn"), 1, 6);
  const lag = int(p.get("lag"), 0, 60_000) ?? 0;
  const onset = int(p.get("onset"), 0, 60_000);
  const mime = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = TYPES[mime];
  if (step === null || turn === null || !ext) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });

  const lesson = await ownLesson(p.get("lesson") ?? "", user.id);
  if (!lesson || lesson.status !== "in_progress") return NextResponse.json({ error: "Không tìm thấy bài học này." }, { status: 404 });
  const st = lesson.plan.steps.find((s) => s.n === step);
  if (!st || st.t !== "roleplay") return NextResponse.json({ error: "Bước này không phải roleplay." }, { status: 400 });
  const m = await getModule(lesson.moduleId);
  const r = m?.content.roleplays.find((x) => x.id === st.ref);
  if (!m || !r || turn > r.turns) return NextResponse.json({ error: "Không tìm thấy tình huống." }, { status: 404 });

  const admin = createAdminClient();
  const { data: prev } = await admin
    .from("module_attempts")
    .select("turn, answer, reply")
    .eq("lesson_id", lesson.id)
    .eq("step", step)
    .order("turn");
  if ((prev ?? []).length !== turn - 1) return NextResponse.json({ error: "Lượt nói không đúng thứ tự. Hãy tải lại trang.", resync: true }, { status: 409 });

  const body = await request.arrayBuffer();
  if (body.byteLength < 500 || body.byteLength > 8_000_000) return NextResponse.json({ error: "Bản ghi không hợp lệ. Hãy nói lại." }, { status: 400 });
  if (!(await takeQuota(user.id, "transcribe"))) return NextResponse.json({ error: "Gửi quá nhanh. Đợi một chút rồi thử lại." }, { status: 429 });

  const audioPath = `${user.id}/m-${lesson.id}/${step}-${turn}-1.${ext}`;
  const { error: upErr } = await admin.storage.from("recordings").upload(audioPath, body, { contentType: mime, upsert: true });
  if (upErr) return NextResponse.json({ error: "Chưa lưu được bản ghi. Hãy thử lại." }, { status: 502 });

  const mockText = `I think we should ${["recycle more", "plant trees", "pick up rubbish"][turn % 3]} because it helps the environment. For example, we can start at school.`;
  const asr = await transcribeModule(body, mime, mockText);
  const measures = asr ? speechMeasures(asr.words, asr.transcript, lag, onset) : null;
  if (!asr || !measures || measures.unclear) {
    await admin.storage.from("recordings").remove([audioPath]);
    return asr ? NextResponse.json({ unclear: true }) : NextResponse.json({ error: "Dịch vụ chép lời đang lỗi. Hãy nói lại." }, { status: 502 });
  }

  const history: Turn[] = [{ role: "ai", text: r.opener }];
  for (const x of prev ?? []) {
    history.push({ role: "student", text: x.answer ?? "" });
    if (x.reply) history.push({ role: "ai", text: x.reply });
  }
  history.push({ role: "student", text: asr.transcript });

  const last = turn >= r.turns;
  const reply = last ? null : await roleplayReply(r, m.grade, m.content, history, await takeQuota(user.id, "roleplay"));
  const studentTurns = history.filter((x) => x.role === "student").map((x) => x.text);
  const requirements = last ? r.requirements.map((q) => requirementMet(q, studentTurns)) : null;

  const { data: row, error } = await admin
    .from("module_attempts")
    .insert({
      lesson_id: lesson.id,
      student_id: user.id,
      module_id: lesson.moduleId,
      day: lesson.day,
      step,
      turn,
      attempt_no: 1,
      kind: "roleplay",
      item_ref: r.id,
      answer: asr.transcript.slice(0, 4000),
      think_ms: measures.thinkMs === null ? null : Math.min(120_000, measures.thinkMs),
      measures,
      check_result: last ? { requirements, test: st.test } : { test: st.test },
      reply: reply?.text.slice(0, 600) ?? null,
      reply_source: reply?.source ?? null,
      audio_path: audioPath,
    })
    .select("id")
    .single();
  if (error || !row) return NextResponse.json({ error: "Chưa lưu được lượt nói. Hãy thử lại." }, { status: 502 });
  return NextResponse.json({ ok: true, attemptId: row.id, transcript: asr.transcript, measures, reply: reply?.text ?? null, replySource: reply?.source ?? null, done: last, requirements });
}
