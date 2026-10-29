import { after, NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getParticipant, nextItem, ownAttempt } from "@/lib/research/server";
import { scoreResponse } from "@/lib/research/score";
import { takeQuota } from "@/lib/usage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TYPES: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg" };
const MAX_BYTES = 6_000_000;

/**
 * Nhận bản ghi của câu kiểm tra đang tới lượt: lưu vào kho riêng "test-recordings", ghi một dòng test_responses,
 * trả lời ngay. Chép lời + đo thời gian phản xạ chạy SAU khi đã trả lời (after), để học sinh không phải chờ giữa các câu.
 * Mỗi câu chỉ ghi một lần; câu gửi phải đúng là câu đang tới lượt.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });

  const q = request.nextUrl.searchParams;
  const attemptId = q.get("attempt") ?? "";
  const itemId = q.get("item") ?? "";
  const beepEndMs = Number(q.get("beep"));
  const durationMs = Number(q.get("dur"));
  if (!/^[0-9a-f-]{36}$/.test(attemptId) || !/^[0-9a-f-]{36}$/.test(itemId)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  if (!Number.isInteger(beepEndMs) || beepEndMs < 0 || beepEndMs > 10_000 || !Number.isInteger(durationMs) || durationMs < 0 || durationMs > 60_000)
    return NextResponse.json({ error: "Số đo thời gian không hợp lệ." }, { status: 400 });
  const mime = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = TYPES[mime];
  if (!ext) return NextResponse.json({ error: "Định dạng ghi âm không được hỗ trợ." }, { status: 415 });

  const [p, attempt] = await Promise.all([getParticipant(user.id), ownAttempt(attemptId, user.id)]);
  if (!p || !attempt) return NextResponse.json({ error: "Không tìm thấy bài kiểm tra này." }, { status: 404 });
  const item = await nextItem(attempt.id, p.grade, attempt.form);
  if (!item || item.id !== itemId) return NextResponse.json({ error: "Câu này đã được ghi rồi.", already: true }, { status: 409 });

  const body = await request.arrayBuffer();
  if (body.byteLength < 200 || body.byteLength > MAX_BYTES) return NextResponse.json({ error: "Bản ghi không hợp lệ." }, { status: 400 });
  if (!(await takeQuota(user.id, "transcribe"))) return NextResponse.json({ error: "Gửi quá nhanh. Đợi một chút rồi thử lại." }, { status: 429 });

  const admin = createAdminClient();
  // Tên file: mã HS + lần kiểm tra + số thứ tự câu, để nhóm nghiên cứu tìm file dễ khi đo tay.
  const audioPath = `${p.code}/${attempt.phase}-${attempt.form}/${String(item.number).padStart(2, "0")}-${item.warmup ? "mau" : "cau"}-${item.id}.${ext}`;
  const { error: upErr } = await admin.storage.from("test-recordings").upload(audioPath, body, { contentType: mime, upsert: true });
  if (upErr) return NextResponse.json({ error: "Chưa lưu được bản ghi. Hãy thử lại." }, { status: 502 });

  const { data: row, error } = await admin
    .from("test_responses")
    .insert({
      attempt_id: attempt.id,
      student_id: user.id,
      item_id: item.id,
      form: item.warmup ? "W" : attempt.form,
      position: item.number,
      audio_path: audioPath,
      beep_end_ms: beepEndMs,
      duration_ms: durationMs,
    })
    .select("id")
    .single();
  if (error || !row) return NextResponse.json({ error: "Chưa lưu được câu trả lời. Hãy thử lại." }, { status: 502 });

  after(() => scoreResponse(row.id, body, mime, beepEndMs));
  return NextResponse.json({ ok: true, number: item.number, total: item.total });
}
