// Kiểm tra quyền của phần nghiên cứu bằng truy vấn thật tới Supabase. Cần đã chạy 0001 → 0006 và research:seed-tests.
// Tạo 2 học sinh thử (ZZ901, ZZ902) rồi XÓA SẠCH khi xong. Chạy: npm run test:research
import { createClient } from "@supabase/supabase-js";
import { admin, createParticipant, deleteParticipant, env } from "./research-lib.mjs";
import { codeEmail } from "../src/lib/research/code.ts";

let fail = 0;
const t = (n, ok, extra = "") => {
  console.log((ok ? "ĐẠT " : "HỎNG ") + n + (extra ? ` (${extra})` : ""));
  if (!ok) fail++;
};
const CODES = ["ZZ901", "ZZ902"];
const client = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

async function main() {
  const probe = await admin.from("research_participants").select("code").limit(1);
  if (probe.error) throw new Error("Chưa có bảng nghiên cứu: hãy chạy supabase/migrations/0006_research.sql trước.");
  const { count: items } = await admin.from("test_items").select("id", { count: "exact", head: true });
  if (!items) throw new Error("Chưa có đề kiểm tra: hãy chạy npm run research:seed-tests trước.");
  for (const c of CODES) await deleteParticipant(c);

  const a = await createParticipant({ code: CODES[0], grade: 8, formOrder: "AB" });
  const b = await createParticipant({ code: CODES[1], grade: 8, formOrder: "BA" });
  t("tạo được học sinh bằng mã + PIN", !!a.pin && !!b.pin);

  const sa = client();
  t("đăng nhập bằng mã + PIN đúng", !(await sa.auth.signInWithPassword({ email: codeEmail(a.code), password: a.pin })).error);
  const wrong = String((Number(a.pin) + 1) % 1_000_000).padStart(6, "0");
  t("PIN sai thì không đăng nhập được", !!(await client().auth.signInWithPassword({ email: codeEmail(a.code), password: wrong })).error);

  const { data: prof } = await sa.from("profiles").select("display_name, role, grade").eq("id", a.id).single();
  t("hồ sơ chỉ có mã, không có họ tên", prof?.display_name === a.code && prof?.role === "student" && prof?.grade === 8);

  const own = await sa.from("research_participants").select("code, form_order, arm");
  t("học sinh chỉ đọc được dòng tham gia của mình", own.data?.length === 1 && own.data[0].code === a.code);
  const upd = await sa.from("research_participants").update({ arm: "A" }).eq("student_id", a.id).select();
  const { data: armNow } = await admin.from("research_participants").select("arm").eq("student_id", a.id).single();
  t("học sinh không tự chọn chế độ A/B", (upd.data?.length ?? 0) === 0 && armNow.arm === null);

  t("học sinh không đọc trước được đề kiểm tra", ((await sa.from("test_items").select("id")).data ?? []).length === 0);
  t("học sinh không đọc được cài đặt nghiên cứu", ((await sa.from("research_settings").select("key")).data ?? []).length === 0);
  const fakeAttempt = await sa.from("test_attempts").insert({ student_id: a.id, phase: "pre", form: "A" }).select();
  t("học sinh không tự tạo lượt làm bài", !!fakeAttempt.error);

  // Lượt làm do máy chủ tạo; học sinh đọc được lượt của mình, không đọc được của bạn khác và không tự đánh dấu xong.
  const { data: att } = await admin.from("test_attempts").insert({ student_id: b.id, phase: "pre", form: "B" }).select("id").single();
  t("học sinh không đọc được lượt làm của bạn khác", ((await sa.from("test_attempts").select("id").eq("id", att.id)).data ?? []).length === 0);
  const sb = client();
  await sb.auth.signInWithPassword({ email: codeEmail(b.code), password: b.pin });
  const done = await sb.from("test_attempts").update({ status: "completed" }).eq("id", att.id).select();
  t("học sinh không tự đánh dấu bài đã xong", (done.data?.length ?? 0) === 0);
  const fakeResp = await sb.from("test_responses").insert({ attempt_id: att.id, student_id: b.id, item_id: (await admin.from("test_items").select("id").limit(1).single()).data.id, form: "B", position: 1, audio_path: "x", beep_end_ms: 450 }).select();
  t("học sinh không tự ghi kết quả đo", !!fakeResp.error);

  const up = await sb.storage.from("test-recordings").upload(`${b.code}/x.webm`, new Uint8Array(500), { contentType: "audio/webm" });
  t("học sinh không tải file thẳng vào kho bài kiểm tra", !!up.error);
  await admin.storage.from("test-recordings").upload(`${b.code}/pre-B/01-test.webm`, new Uint8Array(500), { contentType: "audio/webm", upsert: true });
  const dl = await sb.storage.from("test-recordings").download(`${b.code}/pre-B/01-test.webm`);
  t("học sinh không tải về được file trong kho bài kiểm tra", !dl.data);
  const del = await sb.storage.from("test-recordings").remove([`${b.code}/pre-B/01-test.webm`]);
  const still = await admin.storage.from("test-recordings").download(`${b.code}/pre-B/01-test.webm`);
  t("học sinh không xóa được bản ghi bài kiểm tra", !!still.data, del.error?.message ?? "");

  // ---- Hai chế độ luyện (0008) ----
  const modeProbe = await admin.from("mode_sessions").select("id").limit(1);
  if (modeProbe.error) {
    console.log("BỎ QUA phần chế độ luyện: chưa chạy 0008_modes.sql");
    return;
  }
  const plan = { mode: "A", unitNo: 1, unitTitle: "x", steps: [] };
  const fakeSess = await sa.from("mode_sessions").insert({ student_id: a.id, mode: "A", session_no: 1, grade: 8, unit_no: 1, day: "2026-11-09", plan }).select();
  t("học sinh không tự mở buổi luyện (không tự chọn chế độ hay buổi số)", !!fakeSess.error);
  const { data: sessB } = await admin
    .from("mode_sessions")
    .insert({ student_id: b.id, mode: "B", session_no: 1, grade: 8, unit_no: 1, day: "2026-11-09", plan })
    .select("id")
    .single();
  t("học sinh không đọc được buổi luyện của bạn khác", ((await sa.from("mode_sessions").select("id").eq("id", sessB.id)).data ?? []).length === 0);
  const longer = await sb.from("mode_sessions").update({ active_ms: 9_000_000, status: "completed" }).eq("id", sessB.id).select();
  t("học sinh không tự sửa thời gian luyện hay đánh dấu xong", (longer.data?.length ?? 0) === 0);
  const fakeTurn = await sb
    .from("mode_turns")
    .insert({ session_id: sessB.id, student_id: b.id, mode: "B", step: 0, activity: "read_aloud", item_ref: "r1#1", prompt: "x", duration_ms: 1000, audio_path: "x" })
    .select();
  t("học sinh không tự ghi lượt luyện", !!fakeTurn.error);
  const fakeCheck = await sb.from("weekly_checkins").insert({ student_id: b.id, week_start: "2026-11-09", practised_elsewhere: false }).select();
  t("học sinh không ghi thẳng câu trả lời hằng tuần (chỉ qua máy chủ)", !!fakeCheck.error);
  const upMode = await sb.storage.from("mode-recordings").upload(`${b.code}/buoi-01/x.webm`, new Uint8Array(500), { contentType: "audio/webm" });
  t("học sinh không tải file thẳng vào kho chế độ luyện", !!upMode.error);
}

try {
  await main();
} catch (e) {
  console.error("LỖI khi chạy:", e.message);
  fail++;
} finally {
  for (const c of CODES) await deleteParticipant(c);
  console.log("Đã dọn tài khoản và file thử.");
}
console.log(fail ? `${fail} hỏng` : "Tất cả đạt");
process.exit(fail ? 1 : 0);
