// Kiểm tra: người tham gia nghiên cứu KHÔNG dùng được trang luyện tự do khi nghiên cứu chưa kết thúc (study_over),
// còn học sinh thường vẫn dùng bình thường. Kiểm tra ở cả 2 lớp:
//   1. Cơ sở dữ liệu (RLS, cần đã chạy 0009_practice_lock.sql): gọi thẳng Supabase, không qua web.
//   2. Web (cần web đang chạy, mặc định http://localhost:3126, nên dùng MOCK_AI=1): trang, đường API.
// Chạy: npm run test:practice-lock      Tạo học sinh thử ZZ909 + một học sinh email thử, XÓA SẠCH khi xong. Không tốn tiền.
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
import { admin, createParticipant, deleteParticipant, env } from "./research-lib.mjs";
import { codeEmail } from "../src/lib/research/code.ts";

const BASE = process.env.BASE_URL ?? "http://localhost:3126";
const CODE = "ZZ909";
const EMAIL = "e2e-lock@example.test";
const PW = "Thu-lock-xyz-123";
let fail = 0;
const t = (n, ok, extra = "") => {
  console.log((ok ? "ĐẠT " : "HỎNG ") + n + (extra ? ` (${extra})` : ""));
  if (!ok) fail++;
};
const client = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

async function removeEmailUser() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const u = data?.users.find((x) => x.email === EMAIL);
  if (u) await admin.auth.admin.deleteUser(u.id);
}

async function main() {
  await deleteParticipant(CODE);
  await removeEmailUser();
  const { data: setting } = await admin.from("research_settings").select("value").eq("key", "study_over").single();
  if (setting?.value === true) throw new Error("study_over đang bật: bài kiểm tra này chỉ có ý nghĩa khi nghiên cứu chưa kết thúc");

  // Một Unit lớp 8 đã duyệt và 5 câu hỏi của nó.
  const { data: unit } = await admin.from("units").select("id").eq("grade", 8).eq("status", "approved").order("unit_no").limit(1).single();
  const { data: qs } = await admin.from("questions").select("id").eq("unit_id", unit.id).eq("active", true).limit(5);
  const questionIds = qs.map((q) => q.id);

  const p = await createParticipant({ code: CODE, grade: 8, formOrder: "AB" });
  const { data: made } = await admin.auth.admin.createUser({ email: EMAIL, password: PW, email_confirm: true });
  const normalId = made.user.id;
  const normal = client();
  await normal.auth.signInWithPassword({ email: EMAIL, password: PW });
  await normal.rpc("complete_onboarding", { p_role: "student", p_display_name: "Bạn Thường", p_grade: 8, p_goal: null });
  const part = client();
  await part.auth.signInWithPassword({ email: codeEmail(CODE), password: p.pin });

  // ---- 1. Cơ sở dữ liệu (RLS) ----
  const lockFn = await part.rpc("practice_locked");
  if (lockFn.error) {
    t("đã chạy 0009_practice_lock.sql", false, lockFn.error.message);
  } else {
    t("RLS: người tham gia bị khóa luyện tự do (practice_locked = true)", lockFn.data === true);
    t("RLS: học sinh thường không bị khóa", (await normal.rpc("practice_locked")).data === false);
    const sessRow = (uid) => ({ student_id: uid, unit_id: unit.id, question_ids: questionIds });
    const bad = await part.from("practice_sessions").insert(sessRow(p.id)).select("id");
    t("RLS: người tham gia KHÔNG tự tạo được buổi luyện tự do (gọi thẳng cơ sở dữ liệu)", !!bad.error);
    const good = await normal.from("practice_sessions").insert(sessRow(normalId)).select("id").single();
    t("RLS: học sinh thường vẫn tạo được buổi luyện", !good.error, good.error?.message ?? "");

    const { data: forced } = await admin.from("practice_sessions").insert(sessRow(p.id)).select("id").single();
    const ans = await part
      .from("session_answers")
      .insert({ session_id: forced.id, student_id: p.id, question_id: questionIds[0], attempt_no: 1, shown_at: new Date().toISOString(), prompt_ended_at: new Date().toISOString(), transcript_raw: "x", transcript_final: "x", transcript_edited: false })
      .select("id");
    t("RLS: người tham gia KHÔNG lưu được câu trả lời luyện tự do, kể cả khi có sẵn buổi", !!ans.error);
  }

  // ---- 2. Web ----
  const { data: forced2 } = await admin.from("practice_sessions").insert({ student_id: p.id, unit_id: unit.id, question_ids: questionIds }).select("id").single();
  const browser = await chromium.launch({ channel: "msedge" });
  const page = await browser.newPage();
  page.setDefaultTimeout(30_000);
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Mã học sinh").fill(CODE);
  await page.getByLabel("PIN").fill(p.pin);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(`${BASE}/student`);
  for (const path of ["/student/practice", `/student/practice/${unit.id}`, `/student/practice/session/${forced2.id}`, "/student/history", `/student/sessions/${forced2.id}`]) {
    await page.goto(`${BASE}${path}`);
    const back = await page.waitForURL(`${BASE}/student`, { timeout: 15_000 }).then(() => true, () => false);
    t(`web: người tham gia mở ${path.replace(/[0-9a-f-]{36}/, "…")} thì về trang chính`, back);
  }
  const tr = await page.request.post(`${BASE}/api/transcribe?session=${forced2.id}&question=${questionIds[0]}`, {
    headers: { "Content-Type": "audio/webm" },
    data: Buffer.alloc(800),
  });
  t("web: người tham gia không gọi được chép lời của luyện tự do", tr.status() === 403, `HTTP ${tr.status()}`);
  const tts = await page.request.get(`${BASE}/api/tts/${questionIds[0]}`);
  t("web: người tham gia không gọi được giọng đọc của luyện tự do", tts.status() === 403, `HTTP ${tts.status()}`);
  await page.context().clearCookies();

  await page.goto(`${BASE}/login?as=email`);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Mật khẩu").fill(PW);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(`${BASE}/student`);
  await page.goto(`${BASE}/student/practice`);
  await page.waitForLoadState("networkidle");
  t("web: học sinh thường vẫn mở được trang luyện tự do", page.url() === `${BASE}/student/practice`);
  const tts2 = await page.request.get(`${BASE}/api/tts/${questionIds[0]}`);
  t("web: học sinh thường không bị chặn giọng đọc", tts2.status() !== 403, `HTTP ${tts2.status()}`);
  await browser.close();
}

try {
  await main();
} catch (e) {
  console.error("LỖI khi chạy:", e.message);
  fail++;
} finally {
  await deleteParticipant(CODE);
  await removeEmailUser();
  console.log("Đã dọn tài khoản thử.");
}
console.log(fail ? `${fail} hỏng` : "Tất cả đạt");
process.exit(fail ? 1 : 0);
