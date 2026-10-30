import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { mockAi, takeQuota } from "@/lib/usage";
import { canPractice } from "@/lib/research/server";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8_000_000; // ~60 giây ghi âm nén
const TYPES: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg" };
// Giữ nguyên lời học sinh: không tự định dạng (smart_format=false), có dấu câu để dễ đọc, bỏ "uh/um".
const DG_URL = "https://api.deepgram.com/v1/listen?model=nova-3&language=en&punctuate=true&smart_format=false&filler_words=false";
const UUID = /^[0-9a-f-]{36}$/;

/**
 * Nhận file ghi âm của MỘT câu trả lời: kiểm tra quyền → lưu vào kho riêng của học sinh → chép lời bằng Deepgram.
 * Không lưu câu trả lời vào CSDL ở đây; học sinh xem/sửa chữ ghi lời rồi mới bấm lưu (saveAnswer).
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Web chưa kết nối cơ sở dữ liệu." }, { status: 503 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  // Người tham gia nghiên cứu không dùng luyện tự do cho tới khi nghiên cứu kết thúc.
  if (!(await canPractice(user.id))) return NextResponse.json({ error: "Trang luyện này chưa mở cho bạn." }, { status: 403 });

  const sessionId = request.nextUrl.searchParams.get("session") ?? "";
  const questionId = request.nextUrl.searchParams.get("question") ?? "";
  if (!UUID.test(sessionId) || !UUID.test(questionId)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });

  const mime = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = TYPES[mime];
  if (!ext) return NextResponse.json({ error: "Định dạng ghi âm không được hỗ trợ." }, { status: 415 });

  // RLS: chỉ thấy buổi của chính mình. Buổi phải đang làm và chứa câu hỏi này.
  const { data: session } = await supabase
    .from("practice_sessions")
    .select("id, status, question_ids")
    .eq("id", sessionId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (!session || session.status !== "in_progress" || !(session.question_ids as string[]).includes(questionId))
    return NextResponse.json({ error: "Không tìm thấy buổi luyện này." }, { status: 404 });

  const body = await request.arrayBuffer();
  if (body.byteLength < 500) return NextResponse.json({ error: "Bản ghi quá ngắn. Hãy nói lại nhé." }, { status: 400 });
  if (body.byteLength > MAX_BYTES) return NextResponse.json({ error: "Bản ghi quá dài. Hãy trả lời ngắn hơn." }, { status: 413 });

  if (!(await takeQuota(user.id, "transcribe")))
    return NextResponse.json({ error: "Bạn đã gửi nhiều bản ghi liên tục. Hãy nghỉ một phút rồi thử lại." }, { status: 429 });

  // Lưu file ghi âm vào thư mục của học sinh (RLS cho phép đúng thư mục này).
  const audioPath = `${user.id}/${sessionId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("recordings").upload(audioPath, body, { contentType: mime });
  if (upErr) return NextResponse.json({ error: "Chưa lưu được bản ghi. Hãy thử lại." }, { status: 502 });

  if (mockAi()) {
    return NextResponse.json({
      audioPath,
      transcript: "I usually play badminton with my friends after school because it is fun.",
      confidence: 0.9,
      mock: true,
    });
  }

  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return NextResponse.json({ audioPath, error: "Máy chủ chưa cấu hình dịch vụ chép lời." }, { status: 503 });

  const res = await fetch(DG_URL, { method: "POST", headers: { Authorization: `Token ${key}`, "Content-Type": mime }, body });
  if (!res.ok) return NextResponse.json({ audioPath, error: "Dịch vụ chép lời đang lỗi. Hãy thử lại." }, { status: 502 });
  const dg = await res.json();
  const alt = dg.results?.channels?.[0]?.alternatives?.[0];
  return NextResponse.json({
    audioPath,
    transcript: typeof alt?.transcript === "string" ? alt.transcript.trim() : "",
    confidence: typeof alt?.confidence === "number" ? alt.confidence : null,
    mock: false,
  });
}
