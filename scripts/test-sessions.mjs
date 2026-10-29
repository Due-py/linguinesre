// Kiểm tra quyền của buổi luyện / câu trả lời / file ghi âm bằng truy vấn thật tới Supabase.
// Cần: đã chạy 0001 → 0005. Tạo tài khoản thử (@example.test) và một Unit thử riêng (lớp 9, Unit 20),
// rồi XÓA SẠCH khi xong, kể cả khi lỗi. Không đụng nội dung thật. Chạy: npm run test:sessions
import { loadEnv, serviceHeaders } from "./lib.mjs";

const env = loadEnv();
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PW = "Thu-buoi-xyz-123";
const json = { "Content-Type": "application/json" };
const svc = (x = {}) => serviceHeaders(env, x);
const TEST_UNIT = { grade: 9, unit_no: 20 };

const people = {
  s1: { email: "ses-s1@example.test", role: "student", name: "HS thử 1", grade: 9 },
  s2: { email: "ses-s2@example.test", role: "student", name: "HS thử 2", grade: 9 },
  t1: { email: "ses-t1@example.test", role: "teacher", name: "GV thử 1" },
  t2: { email: "ses-t2@example.test", role: "teacher", name: "GV thử 2" },
};

let fail = 0;
const t = (n, ok, extra = "") => {
  console.log((ok ? "ĐẠT " : "HỎNG ") + n + (extra ? ` (${extra})` : ""));
  if (!ok) fail++;
};

async function rest(path, { method = "GET", token, body, prefer } = {}) {
  const res = await fetch(`${U}${path}`, {
    method,
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, ...json, ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}
async function admin(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${U}/rest/v1/${path}`, { method, headers: svc({ ...json, ...(prefer ? { Prefer: prefer } : {}) }), body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}
async function upload(token, path, bytes = new Uint8Array(2000)) {
  const r = await fetch(`${U}/storage/v1/object/recordings/${path}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "audio/webm" },
    body: bytes,
  });
  return r.status;
}

async function cleanup() {
  const list = await (await fetch(`${U}/auth/v1/admin/users?per_page=200`, { headers: svc() })).json();
  const emails = new Set(Object.values(people).map((p) => p.email));
  for (const u of list.users ?? []) {
    if (!emails.has(u.email)) continue;
    // Xóa file ghi âm thử trong thư mục của học sinh thử.
    const files = await (await fetch(`${U}/storage/v1/object/list/recordings`, { method: "POST", headers: svc(json), body: JSON.stringify({ prefix: u.id, limit: 100 }) })).json();
    for (const folder of Array.isArray(files) ? files : []) {
      const inner = await (await fetch(`${U}/storage/v1/object/list/recordings`, { method: "POST", headers: svc(json), body: JSON.stringify({ prefix: `${u.id}/${folder.name}`, limit: 100 }) })).json();
      const paths = (Array.isArray(inner) ? inner : []).map((f) => `${u.id}/${folder.name}/${f.name}`);
      if (paths.length) await fetch(`${U}/storage/v1/object/recordings`, { method: "DELETE", headers: svc(json), body: JSON.stringify({ prefixes: paths }) });
    }
  }
  // Buổi luyện/câu trả lời của tài khoản thử bị xóa theo khi xóa tài khoản (on delete cascade).
  for (const u of list.users ?? []) if (emails.has(u.email)) await fetch(`${U}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: svc() });
  await fetch(`${U}/rest/v1/units?grade=eq.${TEST_UNIT.grade}&unit_no=eq.${TEST_UNIT.unit_no}`, { method: "DELETE", headers: svc() });
}

async function main() {
  const probe = await fetch(`${U}/rest/v1/practice_sessions?select=id&limit=1`, { headers: svc() });
  if (!probe.ok) throw new Error("Chưa có bảng practice_sessions: hãy chạy supabase/migrations/0003_sessions.sql trước.");
  const probeFb = await fetch(`${U}/rest/v1/answer_feedback?select=answer_id&limit=1`, { headers: svc() });
  if (!probeFb.ok) throw new Error("Chưa có bảng answer_feedback: hãy chạy supabase/migrations/0004_feedback.sql trước.");
  const probeRpc = await fetch(`${U}/rest/v1/rpc/complete_session`, { method: "POST", headers: svc(json), body: JSON.stringify({ sid: "00000000-0000-0000-0000-000000000000" }) });
  if (probeRpc.status === 404) throw new Error("Chưa có hàm complete_session: hãy chạy supabase/migrations/0005_complete_session.sql trước.");
  await cleanup();

  for (const p of Object.values(people)) {
    const r = await fetch(`${U}/auth/v1/admin/users`, { method: "POST", headers: svc(json), body: JSON.stringify({ email: p.email, password: PW, email_confirm: true }) });
    p.id = (await r.json()).id;
    const tok = await fetch(`${U}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, ...json }, body: JSON.stringify({ email: p.email, password: PW }) });
    p.token = (await tok.json()).access_token;
    await rest("/rest/v1/rpc/complete_onboarding", { method: "POST", token: p.token, body: { p_role: p.role, p_display_name: p.name, p_grade: p.grade ?? null, p_goal: null } });
  }

  // Unit thử: bắt đầu ở trạng thái nháp.
  const [unit] = await admin("units?select=id", {
    method: "POST",
    prefer: "return=representation",
    body: { ...TEST_UNIT, title: "E2E Test Unit", title_vi: "Unit thử", topic: "thử", source: "thử", content_hash: "x", status: "draft" },
  });
  const qs = await admin("questions?select=id", {
    method: "POST",
    prefer: "return=representation",
    body: Array.from({ length: 6 }, (_, i) => ({
      unit_id: unit.id, key: `q0${i + 1}`, text: `Test question ${i + 1}?`, difficulty: (i % 3) + 1, kind: "personal",
      keywords: ["a", "b"], frame_key: "f01", hint_direction_vi: "thử", example_answer: "Test.", expects_reason: false,
    })),
  });
  const ids = qs.map((q) => q.id);
  const plan = ids.slice(0, 5);

  const draftSession = await rest("/rest/v1/practice_sessions", { method: "POST", token: people.s1.token, body: { student_id: people.s1.id, unit_id: unit.id, question_ids: plan } });
  t("không mở được buổi cho Unit chưa duyệt", draftSession.status >= 400);
  const seeDraft = await rest(`/rest/v1/questions?select=id&unit_id=eq.${unit.id}`, { token: people.s1.token });
  t("học sinh không đọc được câu hỏi của Unit nháp", Array.isArray(seeDraft.data) && seeDraft.data.length === 0);
  const teacherDraft = await rest(`/rest/v1/questions?select=id&unit_id=eq.${unit.id}`, { token: people.t1.token });
  t("giáo viên xem trước được Unit nháp", teacherDraft.data?.length === 6);

  await admin(`units?id=eq.${unit.id}`, { method: "PATCH", body: { status: "approved", reviewed_by: "test", reviewed_at: new Date().toISOString() } });

  const s1 = await rest("/rest/v1/practice_sessions?select=id", { method: "POST", token: people.s1.token, prefer: "return=representation", body: { student_id: people.s1.id, unit_id: unit.id, question_ids: plan } });
  t("học sinh mở được buổi cho Unit đã duyệt", s1.data?.length === 1);
  const sid = s1.data[0].id;

  const forged = await rest("/rest/v1/practice_sessions", { method: "POST", token: people.s1.token, body: { student_id: people.s2.id, unit_id: unit.id, question_ids: plan } });
  t("không mở buổi mang tên học sinh khác", forged.status >= 400);
  const foreignQ = await rest("/rest/v1/practice_sessions", { method: "POST", token: people.s1.token, body: { student_id: people.s1.id, unit_id: unit.id, question_ids: [...plan.slice(0, 4), "00000000-0000-0000-0000-000000000000"] } });
  t("không đưa câu hỏi ngoài Unit vào buổi", foreignQ.status >= 400);
  const preDone = await rest("/rest/v1/practice_sessions", { method: "POST", token: people.s1.token, body: { student_id: people.s1.id, unit_id: unit.id, question_ids: plan, status: "completed" } });
  t("không tạo sẵn buổi ở trạng thái hoàn thành", preDone.status >= 400);
  const teacherSession = await rest("/rest/v1/practice_sessions", { method: "POST", token: people.t1.token, body: { student_id: people.t1.id, unit_id: unit.id, question_ids: plan } });
  t("giáo viên không mở buổi luyện", teacherSession.status >= 400);

  // File ghi âm.
  const okPath = `${people.s1.id}/${sid}/${crypto.randomUUID()}.webm`;
  t("học sinh tải bản ghi vào thư mục của mình", (await upload(people.s1.token, okPath)) < 300);
  t("học sinh không tải bản ghi vào thư mục người khác", (await upload(people.s1.token, `${people.s2.id}/${sid}/x.webm`)) >= 400);

  const answer = (token, extra = {}) =>
    rest("/rest/v1/session_answers?select=id", {
      method: "POST",
      token,
      prefer: "return=representation",
      body: {
        session_id: sid, student_id: people.s1.id, question_id: plan[0], attempt_no: 1,
        shown_at: new Date().toISOString(), prompt_ended_at: new Date().toISOString(), think_ms: 2100, speak_ms: 5400,
        transcript_raw: "I like reading", transcript_final: "I like reading.", transcript_edited: true,
        transcript_confidence: 0.92, hint_level: 1, audio_path: okPath, ...extra,
      },
    });
  const saved = await answer(people.s1.token);
  t("học sinh lưu câu trả lời của mình", saved.data?.length === 1);
  const answerId = saved.data?.[0]?.id;
  t("không lưu trùng lần thử", (await answer(people.s1.token)).status >= 400);
  t("không lưu câu hỏi ngoài buổi", (await answer(people.s1.token, { question_id: ids[5], attempt_no: 1 })).status >= 400);
  t("không gắn file ghi âm của người khác", (await answer(people.s1.token, { question_id: plan[1], audio_path: `${people.s2.id}/${sid}/x.webm` })).status >= 400);
  t("học sinh khác không ghi vào buổi của mình", (await answer(people.s2.token, { student_id: people.s2.id, question_id: plan[2] })).status >= 400);
  t("mức gợi ý ngoài 0–4 bị từ chối", (await answer(people.s1.token, { question_id: plan[3], hint_level: 7 })).status >= 400);

  const close = await rest(`/rest/v1/practice_sessions?id=eq.${sid}`, { method: "PATCH", token: people.s1.token, prefer: "return=representation", body: { status: "completed" } });
  t("học sinh không tự đánh dấu hoàn thành bằng PATCH", Array.isArray(close.data) ? close.data.length === 0 : close.status >= 400);

  // Đọc: học sinh khác và giáo viên không có lớp thì không thấy; giáo viên của lớp thì thấy.
  const read = async (p) => (await rest(`/rest/v1/session_answers?select=id&session_id=eq.${sid}`, { token: p.token })).data?.length ?? 0;
  t("học sinh khác không đọc được câu trả lời", (await read(people.s2)) === 0);
  t("giáo viên chưa có học sinh này trong lớp thì không đọc được", (await read(people.t1)) === 0);
  const [cls] = await rest("/rest/v1/classes?select=id", { method: "POST", token: people.t1.token, prefer: "return=representation", body: { teacher_id: people.t1.id, name: "E2E", join_code: "SESQ23", grade: 9 } }).then((r) => r.data ?? []);
  await rest("/rest/v1/rpc/join_class", { method: "POST", token: people.s1.token, body: { code: "SESQ23" } });
  t("giáo viên của lớp đọc được câu trả lời", (await read(people.t1)) === 1, cls ? "" : "không tạo được lớp");
  t("giáo viên lớp khác vẫn không đọc được", (await read(people.t2)) === 0);
  const sign = await fetch(`${U}/storage/v1/object/sign/recordings/${okPath}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${people.t1.token}`, ...json }, body: JSON.stringify({ expiresIn: 60 }) });
  t("giáo viên của lớp nghe được bản ghi", sign.ok);
  const sign2 = await fetch(`${U}/storage/v1/object/sign/recordings/${okPath}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${people.t2.token}`, ...json }, body: JSON.stringify({ expiresIn: 60 }) });
  t("giáo viên lớp khác không nghe được bản ghi", !sign2.ok);

  const usage = await rest("/rest/v1/api_usage?select=id", { token: people.s1.token });
  t("học sinh không đọc được bảng api_usage", Array.isArray(usage.data) ? usage.data.length === 0 : usage.status >= 400);

  // Phản hồi AI (0004): chỉ máy chủ ghi; học sinh và giáo viên của lớp đọc.
  const fb = { answer_id: answerId, student_id: people.s1.id, status: "ok", model: "test", payload: { version: 1, mock: true, feedback: {} } };
  const forgedFb = await rest("/rest/v1/answer_feedback", { method: "POST", token: people.s1.token, body: fb });
  t("học sinh không tự tạo nhận xét", forgedFb.status >= 400);
  t("giáo viên không tự tạo nhận xét", (await rest("/rest/v1/answer_feedback", { method: "POST", token: people.t1.token, body: fb })).status >= 400);
  await admin("answer_feedback", { method: "POST", body: fb });
  const badFb = await fetch(`${U}/rest/v1/answer_feedback?answer_id=eq.${answerId}`, { method: "PATCH", headers: svc(json), body: JSON.stringify({ status: "failed" }) });
  t("dòng 'failed' phải không có payload (ràng buộc CSDL)", !badFb.ok);
  const readFb = async (p) => (await rest(`/rest/v1/answer_feedback?select=answer_id&answer_id=eq.${answerId}`, { token: p.token })).data?.length ?? 0;
  t("học sinh đọc được nhận xét của mình", (await readFb(people.s1)) === 1);
  t("học sinh khác không đọc được nhận xét", (await readFb(people.s2)) === 0);
  t("giáo viên của lớp đọc được nhận xét", (await readFb(people.t1)) === 1);
  t("giáo viên lớp khác không đọc được nhận xét", (await readFb(people.t2)) === 0);
  const editFb = await rest(`/rest/v1/answer_feedback?answer_id=eq.${answerId}`, { method: "PATCH", token: people.s1.token, prefer: "return=representation", body: { model: "sua" } });
  t("học sinh không sửa được nhận xét", Array.isArray(editFb.data) ? editFb.data.length === 0 : editFb.status >= 400);
  await rest(`/rest/v1/answer_feedback?answer_id=eq.${answerId}`, { method: "DELETE", token: people.s1.token });
  t("học sinh không xóa được nhận xét", (await readFb(people.s1)) === 1);

  // Hoàn thành buổi (0005): chỉ chủ buổi, chỉ khi mọi câu đã có câu trả lời.
  const complete = (p) => rest("/rest/v1/rpc/complete_session", { method: "POST", token: p.token, body: { sid } });
  const status = async () => (await admin(`practice_sessions?select=status,completed_at&id=eq.${sid}`))[0];
  t("chưa trả lời đủ câu thì không hoàn thành được", (await complete(people.s1)).data === false && (await status()).status === "in_progress");
  for (const qid of plan.slice(1)) await answer(people.s1.token, { question_id: qid, audio_path: null });
  t("học sinh khác không hoàn thành hộ được", (await complete(people.s2)).data === false);
  t("giáo viên không hoàn thành hộ được", (await complete(people.t1)).data === false && (await status()).status === "in_progress");
  t("đủ câu thì chủ buổi hoàn thành được", (await complete(people.s1)).data === true);
  const done = await status();
  t("buổi chuyển sang completed và có completed_at", done.status === "completed" && !!done.completed_at);
  t("gọi lại với buổi đã xong vẫn trả true", (await complete(people.s1)).data === true);
  t("không ghi thêm câu trả lời vào buổi đã hoàn thành", (await answer(people.s1.token, { question_id: plan[2], attempt_no: 2, audio_path: null })).status >= 400);
  t("người chưa đăng nhập không gọi được complete_session", (await rest("/rest/v1/rpc/complete_session", { method: "POST", token: ANON, body: { sid } })).status >= 400);
}

try {
  await main();
} catch (e) {
  console.error("LỖI khi chạy:", e.message);
  fail++;
} finally {
  await cleanup();
  console.log("Đã dọn tài khoản, Unit và file thử.");
}
console.log(fail ? `${fail} hỏng` : "Tất cả đạt");
process.exit(fail ? 1 : 0);
