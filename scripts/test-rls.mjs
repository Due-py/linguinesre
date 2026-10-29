// Kiểm tra quyền lớp học bằng truy vấn thật tới Supabase (anon key + đăng nhập từng người), không qua giao diện.
// Cần: đã chạy supabase/migrations/0001_core.sql. Tạo tài khoản thử (@example.test) rồi XÓA SẠCH khi xong,
// kể cả khi lỗi. Không đụng tới tài khoản thật. Chạy: node scripts/test-rls.mjs
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const PW = "Thu-lop-xyz-123";
const json = { "Content-Type": "application/json" };
const svc = (x = {}) => ({ apikey: SVC, Authorization: `Bearer ${SVC}`, ...x });

const people = {
  t1: { email: "rls-t1@example.test", role: "teacher", name: "Cô Một" },
  t2: { email: "rls-t2@example.test", role: "teacher", name: "Cô Hai" },
  s1: { email: "rls-s1@example.test", role: "student", name: "Học sinh 1", grade: 8 },
  s2: { email: "rls-s2@example.test", role: "student", name: "Học sinh 2", grade: 8 },
  s3: { email: "rls-s3@example.test", role: "student", name: "Học sinh 3", grade: 9 },
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
const rpc = (name, token, body) => rest(`/rest/v1/rpc/${name}`, { method: "POST", token, body });

async function signIn(p) {
  const r = await fetch(`${U}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, ...json },
    body: JSON.stringify({ email: p.email, password: PW }),
  });
  return (await r.json()).access_token;
}

async function cleanup() {
  const list = await (await fetch(`${U}/auth/v1/admin/users?per_page=200`, { headers: svc() })).json();
  const emails = new Set(Object.values(people).map((p) => p.email));
  for (const u of list.users ?? []) {
    if (emails.has(u.email)) await fetch(`${U}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: svc() });
  }
}

async function main() {
  const probe = await fetch(`${U}/rest/v1/profiles?select=id&limit=1`, { headers: svc() });
  if (!probe.ok) throw new Error("Chưa có bảng profiles: hãy chạy supabase/migrations/0001_core.sql trước.");
  await cleanup();

  for (const p of Object.values(people)) {
    const r = await fetch(`${U}/auth/v1/admin/users`, {
      method: "POST",
      headers: svc(json),
      body: JSON.stringify({ email: p.email, password: PW, email_confirm: true }),
    });
    p.id = (await r.json()).id;
    p.token = await signIn(p);
  }

  // Trigger tạo hồ sơ trống cho mỗi tài khoản mới.
  const own = await rest(`/rest/v1/profiles?select=id,role,onboarded_at&id=eq.${people.s1.id}`, { token: people.s1.token });
  t("tài khoản mới có hồ sơ trống", own.data?.length === 1 && own.data[0].role === null && own.data[0].onboarded_at === null);

  // Onboarding qua RPC (đường đi thật của ứng dụng).
  for (const p of Object.values(people)) {
    const r = await rpc("complete_onboarding", p.token, {
      p_role: p.role, p_display_name: p.name, p_grade: p.role === "student" ? p.grade : null, p_goal: null,
    });
    if (r.status >= 400) throw new Error(`onboarding ${p.email}: ${JSON.stringify(r.data)}`);
  }
  const again = await rpc("complete_onboarding", people.s1.token, { p_role: "teacher", p_display_name: "x", p_grade: null, p_goal: null });
  t("onboarding chỉ chạy được một lần (không đổi vai trò sau đó)", again.status >= 400);
  const bad = await rpc("complete_onboarding", people.s3.token, { p_role: "admin", p_display_name: "x", p_grade: null, p_goal: null });
  t("vai trò lạ bị từ chối", bad.status >= 400);

  // Học sinh không sửa trực tiếp hồ sơ.
  const patch = await rest(`/rest/v1/profiles?id=eq.${people.s1.id}`, { method: "PATCH", token: people.s1.token, body: { role: "teacher" }, prefer: "return=representation" });
  t("học sinh không tự đổi vai trò bằng PATCH", Array.isArray(patch.data) ? patch.data.length === 0 : patch.status >= 400);

  // Lớp.
  const mk = async (p, name, code, grade) =>
    (await rest("/rest/v1/classes?select=id,join_code", { method: "POST", token: p.token, prefer: "return=representation", body: { teacher_id: p.id, name, join_code: code, grade } })).data?.[0];
  const c1 = await mk(people.t1, "RLS lớp 1", "TESTA2", 8);
  const c2 = await mk(people.t2, "RLS lớp 2", "TESTB3", 8);
  t("giáo viên tự tạo được lớp", !!c1 && !!c2);
  const s1class = await rest("/rest/v1/classes", { method: "POST", token: people.s1.token, body: { teacher_id: people.s1.id, name: "x", join_code: "BADCD2" } });
  t("học sinh không tạo được lớp", s1class.status >= 400);
  const forged = await rest("/rest/v1/classes", { method: "POST", token: people.t1.token, body: { teacher_id: people.t2.id, name: "x", join_code: "BADCD3" } });
  t("giáo viên không tạo lớp mang tên giáo viên khác", forged.status >= 400);

  // Vào lớp bằng mã.
  const join = (p, code) => rpc("join_class", p.token, { code });
  const j1 = await join(people.s1, "testa2");
  t("HS khối 8 vào lớp khối 8 bằng mã (chữ thường)", j1.data?.length === 1 && j1.data[0].class_name === "RLS lớp 1");
  t("HS thứ hai vào lớp của GV2", (await join(people.s2, "TESTB3")).data?.length === 1);
  const j3 = await join(people.s3, "TESTA2");
  t("HS khối 9 không vào được lớp khối 8", Array.isArray(j3.data) && j3.data.length === 0);
  const j4 = await join(people.s1, "ZZZZZ9");
  t("mã sai: không dòng nào, không lỗi lộ thông tin", Array.isArray(j4.data) && j4.data.length === 0 && j4.status === 200);
  const j5 = await join(people.t1, "TESTB3");
  t("giáo viên không dùng join_class được", Array.isArray(j5.data) && j5.data.length === 0);
  const sneak = await rest("/rest/v1/class_members", { method: "POST", token: people.s3.token, body: { class_id: c1.id, student_id: people.s3.id } });
  t("học sinh không ghi thẳng vào class_members", sneak.status >= 400);

  // Đọc hồ sơ / lớp.
  const names = async (p) => ((await rest("/rest/v1/profiles?select=display_name&role=eq.student", { token: p.token })).data ?? []).map((r) => r.display_name).sort();
  t("GV1 chỉ thấy học sinh của lớp mình", JSON.stringify(await names(people.t1)) === JSON.stringify(["Học sinh 1"]));
  t("GV2 chỉ thấy học sinh của lớp mình", JSON.stringify(await names(people.t2)) === JSON.stringify(["Học sinh 2"]));
  t("HS1 chỉ thấy chính mình", JSON.stringify(await names(people.s1)) === JSON.stringify(["Học sinh 1"]));
  const classNames = async (p) => ((await rest("/rest/v1/classes?select=name&name=like.RLS*", { token: p.token })).data ?? []).map((r) => r.name).sort();
  t("GV1 chỉ thấy lớp mình", JSON.stringify(await classNames(people.t1)) === JSON.stringify(["RLS lớp 1"]));
  t("HS1 chỉ thấy lớp mình đã vào", JSON.stringify(await classNames(people.s1)) === JSON.stringify(["RLS lớp 1"]));
  t("HS3 chưa vào lớp nào thì không thấy lớp", (await classNames(people.s3)).length === 0);

  // GV2 không sửa/xóa được lớp của GV1.
  const hijack = await rest(`/rest/v1/classes?id=eq.${c1.id}`, { method: "PATCH", token: people.t2.token, prefer: "return=representation", body: { name: "bị đổi" } });
  t("GV2 không sửa được lớp của GV1", Array.isArray(hijack.data) && hijack.data.length === 0);
  const kick = await rest(`/rest/v1/class_members?class_id=eq.${c1.id}`, { method: "DELETE", token: people.t2.token, prefer: "return=representation" });
  t("GV2 không xóa được thành viên lớp của GV1", Array.isArray(kick.data) && kick.data.length === 0);

  // Đưa HS ra khỏi lớp thì GV mất quyền xem.
  const rm = await rest(`/rest/v1/class_members?class_id=eq.${c1.id}&student_id=eq.${people.s1.id}`, { method: "DELETE", token: people.t1.token, prefer: "return=representation" });
  t("GV1 đưa HS1 ra khỏi lớp của mình", rm.data?.length === 1);
  t("sau đó GV1 không còn thấy HS1", (await names(people.t1)).length === 0);

  // Lớp lưu trữ không nhận học sinh mới.
  await rest(`/rest/v1/classes?id=eq.${c2.id}`, { method: "PATCH", token: people.t2.token, body: { status: "archived" } });
  const late = await rpc("join_class", people.s1.token, { code: "TESTB3" });
  t("lớp đã lưu trữ không nhận học sinh bằng mã", Array.isArray(late.data) && late.data.length === 0);
}

try {
  await main();
} catch (e) {
  console.error("LỖI khi chạy:", e.message);
  fail++;
} finally {
  await cleanup();
  console.log("Đã dọn tài khoản thử.");
}
console.log(fail ? `${fail} hỏng` : "Tất cả đạt");
process.exit(fail ? 1 : 0);
