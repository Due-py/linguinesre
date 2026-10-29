import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getParticipant } from "@/lib/research/server";
import { ownModeSession, speedHistory } from "@/lib/research/modeServer";
import { checkTurn, speedLevel } from "@/lib/research/modes";
import { computeRl } from "@/lib/research/latency";
import { transcribeWords } from "@/lib/research/score";
import { takeQuota } from "@/lib/usage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TYPES: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg" };
const MAX_BYTES = 9_000_000;
const UUID = /^[0-9a-f-]{36}$/;
const int = (v: string | null, min: number, max: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

/**
 * Lưu MỘT lượt nói của buổi luyện chế độ A hoặc B (một dòng mode_turns, mục 3.8).
 *  - Chế độ A: chép lời có mốc thời gian từng từ → thời gian phản xạ từ lúc hết tiếng bíp (bỏ "uh/um"), chấm nhanh bằng
 *    quy tắc. Speed Q&A: mức giới hạn do MÁY CHỦ tính từ lịch sử (học sinh không tự chọn được), "kịp giờ" theo RL máy chủ;
 *    chỉ khi máy chủ không đo được mới dùng ước lượng của trình duyệt.
 *  - Chế độ B (đọc to): chỉ lưu file và thời lượng, không chép lời.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });

  const q = request.nextUrl.searchParams;
  const sessionId = q.get("session") ?? "";
  const step = int(q.get("step"), 0, 200);
  const attemptNo = int(q.get("attempt"), 1, 3);
  const beepEndMs = int(q.get("beep"), 0, 10_000);
  const durationMs = int(q.get("dur"), 0, 600_000);
  const hintLevel = int(q.get("hint"), 0, 4);
  const onset = q.get("onset") === null || q.get("onset") === "" ? null : int(q.get("onset"), 0, 60_000);
  if (!UUID.test(sessionId) || step === null || attemptNo === null || beepEndMs === null || durationMs === null || hintLevel === null)
    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  const mime = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = TYPES[mime];
  if (!ext) return NextResponse.json({ error: "Định dạng ghi âm không được hỗ trợ." }, { status: 415 });

  const [p, s] = await Promise.all([getParticipant(user.id), ownModeSession(sessionId, user.id)]);
  if (!p || !s || s.status !== "in_progress") return NextResponse.json({ error: "Không tìm thấy buổi luyện này." }, { status: 404 });
  const st = s.plan.steps.find((x) => x.step === step);
  if (!st) return NextResponse.json({ error: "Không có bước này trong buổi luyện." }, { status: 400 });

  const body = await request.arrayBuffer();
  if (body.byteLength < 200 || body.byteLength > MAX_BYTES) return NextResponse.json({ error: "Bản ghi không hợp lệ." }, { status: 400 });

  const admin = createAdminClient();
  const { data: dup } = await admin.from("mode_turns").select("id").eq("session_id", s.id).eq("step", step).eq("attempt_no", attemptNo).maybeSingle();
  if (dup) return NextResponse.json({ error: "Lượt này đã được lưu.", already: true }, { status: 409 });

  const isRead = st.activity === "read_aloud";
  if (!isRead && !(await takeQuota(user.id, "transcribe")))
    return NextResponse.json({ error: "Gửi quá nhanh. Đợi một chút rồi thử lại." }, { status: 429 });

  // Tên file: mã HS / buổi số / bước-lượt, để nhóm nghiên cứu tìm file dễ.
  const audioPath = `${p.code}/buoi-${String(s.session_no).padStart(2, "0")}/${String(step).padStart(2, "0")}-${st.activity}-${attemptNo}.${ext}`;
  const { error: upErr } = await admin.storage.from("mode-recordings").upload(audioPath, body, { contentType: mime, upsert: true });
  if (upErr) return NextResponse.json({ error: "Chưa lưu được bản ghi. Hãy thử lại." }, { status: 502 });

  const base = {
    session_id: s.id,
    student_id: user.id,
    mode: s.mode,
    step,
    layer: st.layer,
    activity: st.activity,
    item_ref: st.ref,
    prompt: (st.model ? `${st.prompt} → ${st.model}` : st.prompt).slice(0, 600),
    attempt_no: attemptNo,
    hint_level: hintLevel,
    beep_end_ms: isRead ? null : beepEndMs,
    duration_ms: durationMs,
    audio_path: audioPath,
  };

  if (isRead) {
    const { error } = await admin.from("mode_turns").insert({ ...base, rl_status: "not_measured" });
    if (error) return NextResponse.json({ error: "Chưa lưu được lượt đọc. Hãy thử lại." }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  // Speed Q&A: lượt đầu có giới hạn, mức do máy chủ tính. Lượt sau (sau gợi ý) không giới hạn.
  const limitMs = st.activity === "speed" && attemptNo === 1 ? speedLevel(await speedHistory(user.id)) : null;

  const asr = await transcribeWords(body, mime, beepEndMs);
  const rl = asr ? computeRl(asr.words, beepEndMs) : null;
  const transcript = asr?.transcript.trim() ?? "";
  const inLimit =
    limitMs === null
      ? null
      : rl
        ? rl.status === "ok" && rl.rlMs <= limitMs
        : onset !== null
          ? onset <= limitMs
          : null;
  const check = asr ? checkTurn(st, transcript) : null;

  const { data: row, error } = await admin
    .from("mode_turns")
    .insert({
      ...base,
      time_limit_ms: limitMs,
      rl_ms: rl?.rlMs ?? null,
      rl_status: rl ? rl.status : "failed",
      rl_client_ms: onset,
      in_limit: inLimit,
      transcript: transcript.slice(0, 4000) || null,
      words: asr?.words ?? null,
      check_result: check,
    })
    .select("id")
    .single();
  if (error || !row) return NextResponse.json({ error: "Chưa lưu được câu trả lời. Hãy thử lại." }, { status: 502 });

  const nextLimit = st.activity === "speed" ? speedLevel(await speedHistory(user.id)) : null;
  return NextResponse.json({
    ok: true,
    turnId: row.id,
    transcript,
    rlMs: rl?.rlMs ?? null,
    rlStatus: rl ? rl.status : "failed",
    limitMs,
    inLimit,
    check,
    nextLimit,
  });
}
