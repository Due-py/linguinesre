import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { takeQuota } from "@/lib/usage";
import { transcribeModule } from "@/lib/module/asr";
import { speechMeasures } from "@/lib/module/measure";
import { checkMockAnswer, mockTestFor } from "@/lib/mockTest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TYPES: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg" };

/**
 * Lưu câu trả lời một câu của bài thi thử nói: kiểm tra học sinh được giao bài và chưa nộp → lưu file → chép lời → chấm nội
 * dung bằng quy tắc → ghi (khóa máy chủ). Nói lại một câu thì thay câu trả lời cũ. Không đo thời gian bắt đầu nói.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });

  const admin = createAdminClient();
  const { data: invite } = await admin.from("mock_test_invites").select("grade, completed_at").eq("student_id", user.id).maybeSingle();
  if (!invite) return NextResponse.json({ error: "Em chưa được giao bài thi thử." }, { status: 403 });
  if (invite.completed_at) return NextResponse.json({ error: "Em đã nộp bài thi thử rồi." }, { status: 409 });
  const test = mockTestFor(invite.grade);
  const q = test?.questions.find((x) => x.id === request.nextUrl.searchParams.get("q"));
  if (!test || !q) return NextResponse.json({ error: "Không có câu hỏi này." }, { status: 400 });

  const mime = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = TYPES[mime];
  if (!ext) return NextResponse.json({ error: "Định dạng ghi âm chưa hỗ trợ." }, { status: 415 });
  const body = await request.arrayBuffer();
  if (body.byteLength < 500) return NextResponse.json({ error: "Bản ghi quá ngắn. Hãy nói lại nhé." }, { status: 400 });
  if (body.byteLength > 8_000_000) return NextResponse.json({ error: "Bản ghi quá dài. Hãy nói ngắn hơn." }, { status: 413 });
  if (!(await takeQuota(user.id, "transcribe"))) return NextResponse.json({ error: "Gửi quá nhanh. Đợi một chút rồi thử lại." }, { status: 429 });

  const audioPath = `${user.id}/thi-thu/${q.id}.${ext}`;
  const { error: upErr } = await admin.storage.from("recordings").upload(audioPath, body, { contentType: mime, upsert: true });
  if (upErr) return NextResponse.json({ error: "Chưa lưu được bản ghi. Hãy thử lại." }, { status: 502 });

  const mockText = q.expectsReason ? "I think it is a good idea because it helps me a lot every day." : "I usually do my homework and play badminton with my friends.";
  const asr = await transcribeModule(body, mime, mockText);
  if (!asr) return NextResponse.json({ error: "Máy chưa chép được lời lần này. Hãy nói lại nhé.", code: "asr_failed" }, { status: 502 });
  const measures = speechMeasures(asr.words, asr.transcript, 0, null);
  if (measures.unclear) return NextResponse.json({ unclear: true, transcript: asr.transcript });

  const checks = checkMockAnswer(asr.transcript, q);
  const { error } = await admin
    .from("mock_test_answers")
    .upsert(
      { student_id: user.id, grade: invite.grade, question_id: q.id, transcript: asr.transcript.slice(0, 2000), checks, audio_path: audioPath, updated_at: new Date().toISOString() },
      { onConflict: "student_id,question_id" },
    );
  if (error) return NextResponse.json({ error: "Chưa lưu được câu trả lời. Hãy thử lại." }, { status: 502 });
  return NextResponse.json({ ok: true, transcript: asr.transcript, checks });
}
