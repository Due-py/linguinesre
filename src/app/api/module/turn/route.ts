import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canPractice } from "@/lib/research/server";
import { takeQuota } from "@/lib/usage";
import { getModule, ownLesson, attemptCount } from "@/lib/module/server";
import { transcribeModule } from "@/lib/module/asr";
import { countWords, hasReasonWord, heardRatio, SAY_MIN_RATIO, speechMeasures, usesKeyword } from "@/lib/module/measure";
import type { PlannedStep } from "@/lib/module/plan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TYPES: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg" };
const MAX_BYTES = 8_000_000;
const SPOKEN = new Set(["learn_word", "recall_word", "say", "use_word", "arrange", "expand", "speak"]);
const int = (v: string | null, min: number, max: number) => {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};
const EXPAND_MIN_RATIO = 0.7;

/**
 * Lưu MỘT lượt nói của bài học trong module: kiểm tra quyền → lưu file → chép lời có mốc thời gian → đo trực tiếp →
 * kiểm tra bằng quy tắc theo loại bước → ghi module_attempts (khóa máy chủ).
 * Máy nghe quá kém (unclear) thì KHÔNG lưu và mời nói lại: không kết luận học sinh phát âm kém khi có thể do micro, tiếng ồn.
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
  const turn = int(p.get("turn"), 0, 10);
  const hint = int(p.get("hint"), 0, 4) ?? 0;
  const lag = int(p.get("lag"), 0, 60_000) ?? 0;
  const onset = int(p.get("onset"), 0, 60_000);
  if (step === null || turn === null) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  const mime = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = TYPES[mime];
  if (!ext) return NextResponse.json({ error: "Định dạng ghi âm không được hỗ trợ." }, { status: 415 });

  const lesson = await ownLesson(p.get("lesson") ?? "", user.id);
  if (!lesson || lesson.status !== "in_progress") return NextResponse.json({ error: "Không tìm thấy bài học này." }, { status: 404 });
  const st = lesson.plan.steps.find((s) => s.n === step) as PlannedStep | undefined;
  if (!st || !SPOKEN.has(st.t)) return NextResponse.json({ error: "Bước này không có phần nói." }, { status: 400 });
  const m = await getModule(lesson.moduleId);
  if (!m) return NextResponse.json({ error: "Không tìm thấy module." }, { status: 404 });

  // Chữ mẫu của bước (để kiểm tra), mã nội dung lưu cùng lượt nói.
  let target = "";
  let ref = st.ref;
  switch (st.t) {
    case "learn_word":
    case "recall_word":
      target = m.content.vocab.find((v) => v.id === st.ref)?.en ?? "";
      break;
    case "say":
      target = st.text;
      break;
    case "use_word":
      target = `${st.phrase.charAt(0).toUpperCase()}${st.phrase.slice(1)} is important for all of us.`;
      break;
    case "arrange":
      if (turn !== 1) return NextResponse.json({ error: "Xếp câu xong rồi mới nói." }, { status: 400 });
      target = m.content.build.find((b) => b.id === st.ref)?.chunks.join(" ") ?? "";
      break;
    case "expand": {
      const x = m.content.expand.find((e) => e.id === st.ref);
      if (!x || turn > x.steps.length) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
      target = x.full;
      break;
    }
    case "speak":
      if (turn > (st.retry ? 1 : 0)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
      if (turn === 1 && st.retry) ref = st.retry.ref;
      target = st.hints.find((h) => h.level === 4)?.body ?? "I think we should recycle plastic bottles because it helps reduce waste.";
      break;
  }

  const attemptNo = (await attemptCount(lesson.id, step, turn)) + 1;
  const maxAttempts = st.t === "speak" && st.test ? 1 : 3;
  if (attemptNo > maxAttempts)
    return NextResponse.json({ error: st.t === "speak" && st.test ? "Câu kiểm tra chỉ trả lời một lần." : "Bước này đã đủ 3 lần nói." }, { status: 409 });

  const body = await request.arrayBuffer();
  if (body.byteLength < 500) return NextResponse.json({ error: "Bản ghi quá ngắn. Hãy nói lại nhé." }, { status: 400 });
  if (body.byteLength > MAX_BYTES) return NextResponse.json({ error: "Bản ghi quá dài. Hãy nói ngắn hơn." }, { status: 413 });
  if (!(await takeQuota(user.id, "transcribe"))) return NextResponse.json({ error: "Gửi quá nhanh. Đợi một chút rồi thử lại." }, { status: 429 });

  const admin = createAdminClient();
  const audioPath = `${user.id}/m-${lesson.id}/${step}-${turn}-${attemptNo}.${ext}`;
  const { error: upErr } = await admin.storage.from("recordings").upload(audioPath, body, { contentType: mime, upsert: true });
  if (upErr) {
    console.error("lưu bản ghi lỗi", { path: audioPath, mime, bytes: body.byteLength, error: upErr.message });
    return NextResponse.json({ error: "Chưa lưu được bản ghi. Hãy thử lại." }, { status: 502 });
  }

  const asr = await transcribeModule(body, mime, target);
  if (!asr) {
    await admin.storage.from("recordings").remove([audioPath]);
    // code: trình duyệt tự gửi lại bản ghi thô (chưa lọc ồn) một lần trước khi mời nói lại.
    return NextResponse.json({ error: "Máy chưa chép được lời lần này. Hãy nói lại nhé.", code: "asr_failed" }, { status: 502 });
  }
  const measures = speechMeasures(asr.words, asr.transcript, lag, onset);
  if (measures.unclear) {
    await admin.storage.from("recordings").remove([audioPath]);
    return NextResponse.json({ unclear: true, transcript: asr.transcript });
  }
  const t = asr.transcript;

  // Kiểm tra bằng quy tắc (không AI).
  let correct: boolean | null = null;
  let check: Record<string, unknown> = {};
  switch (st.t) {
    case "learn_word":
    case "recall_word":
      correct = usesKeyword(t, target);
      break;
    case "say":
    case "arrange": {
      const ratio = heardRatio(t, target);
      correct = ratio >= SAY_MIN_RATIO;
      check = { heard: Math.round(ratio * 100) / 100 };
      break;
    }
    case "use_word":
      correct = usesKeyword(t, st.phrase) && countWords(t) >= 4;
      check = { used: usesKeyword(t, st.phrase) };
      break;
    case "expand": {
      const x = m.content.expand.find((e) => e.id === st.ref)!;
      const parts = turn === 0 ? [x.base] : x.steps.slice(0, turn).map((s) => s.add);
      const got = parts.map((a) => heardRatio(t, a) >= EXPAND_MIN_RATIO);
      correct = got.every(Boolean);
      check = { parts: got };
      break;
    }
    case "speak": {
      const reason = !st.expectsReason ? "not_required" : hasReasonWord(t) ? "yes" : "no";
      check = { keywordsUsed: st.keywords.filter((k) => usesKeyword(t, k)), reason, test: st.test };
      break;
    }
  }
  const target_ms = st.t === "speak" && turn === 0 ? st.targetMs : null;
  const inTarget = target_ms === null ? null : measures.thinkMs === null ? null : measures.thinkMs <= target_ms;

  const { data: row, error } = await admin
    .from("module_attempts")
    .insert({
      lesson_id: lesson.id,
      student_id: user.id,
      module_id: lesson.moduleId,
      day: lesson.day,
      step,
      turn,
      attempt_no: attemptNo,
      kind: st.t,
      item_ref: ref,
      answer: t.slice(0, 4000),
      correct,
      hint_level: hint,
      think_ms: measures.thinkMs === null ? null : Math.min(120_000, measures.thinkMs),
      time_target_ms: target_ms,
      in_target: inTarget,
      measures,
      check_result: check,
      audio_path: audioPath,
    })
    .select("id")
    .single();
  if (error || !row) return NextResponse.json({ error: "Chưa lưu được lượt nói. Hãy thử lại." }, { status: 502 });
  return NextResponse.json({ ok: true, attemptId: row.id, attemptNo, transcript: t, measures, correct, check, inTarget, targetMs: target_ms, mock: process.env.MOCK_AI === "1" });
}
