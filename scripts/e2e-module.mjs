// Thử cả Learning Module 14 ngày bằng trình duyệt thật (Edge) với micro giả, không tốn tiền dịch vụ AI.
// Cần: đã chạy 0001–0010, và web đang chạy với MOCK_AI=1:
//   PowerShell:  $env:MOCK_AI="1"; npx next dev -p 3126
//   Git Bash:    MOCK_AI=1 npx next dev -p 3126
// Rồi: npm run test:e2e-module
// Tạo học sinh, giáo viên, Unit thử (lớp 9, Unit 20) và một module thử dùng nội dung mẫu lớp 8 Unit 7, rồi XÓA SẠCH khi xong.
// Học thật bằng trình duyệt các ngày có đủ loại bước (1, 3, 4, 5, 6, 10, 12, 13, 14); các ngày còn lại được đánh dấu xong
// thẳng trong CSDL để rút ngắn thời gian chạy.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { loadEnv, ROOT, serviceHeaders } from "./lib.mjs";

const env = loadEnv();
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BASE = process.env.BASE_URL ?? "http://localhost:3126";
const EMAIL = "e2e-module@example.test";
const TEACHER = "e2e-module-teacher@example.test";
const PW = "Thu-e2e-xyz-123";
const json = { "Content-Type": "application/json" };
const svc = (x = {}) => serviceHeaders(env, x);
const CONTENT = JSON.parse(readFileSync(join(ROOT, "content/modules/grade-8/unit-07.json"), "utf8"));
const REAL_DAYS = process.env.E2E_DAYS ? process.env.E2E_DAYS.split(",").map(Number) : [1, 3, 4, 5, 6, 10, 12, 13, 14];

let fail = 0;
const t = (n, ok, extra = "") => {
  console.log((ok ? "ĐẠT " : "HỎNG ") + n + (extra ? ` (${extra})` : ""));
  if (!ok) fail++;
};
async function admin(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${U}/rest/v1/${path}`, { method, headers: svc({ ...json, ...(prefer ? { Prefer: prefer } : {}) }), body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}
async function cleanup() {
  const list = await (await fetch(`${U}/auth/v1/admin/users?per_page=200`, { headers: svc() })).json();
  for (const u of list.users ?? []) {
    if (u.email === TEACHER) await fetch(`${U}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: svc() });
    if (u.email !== EMAIL) continue;
    const folders = await (await fetch(`${U}/storage/v1/object/list/recordings`, { method: "POST", headers: svc(json), body: JSON.stringify({ prefix: u.id, limit: 100 }) })).json();
    for (const f of Array.isArray(folders) ? folders : []) {
      const inner = await (await fetch(`${U}/storage/v1/object/list/recordings`, { method: "POST", headers: svc(json), body: JSON.stringify({ prefix: `${u.id}/${f.name}`, limit: 1000 }) })).json();
      const paths = (Array.isArray(inner) ? inner : []).map((x) => `${u.id}/${f.name}/${x.name}`);
      if (paths.length) await fetch(`${U}/storage/v1/object/recordings`, { method: "DELETE", headers: svc(json), body: JSON.stringify({ prefixes: paths }) });
    }
    await fetch(`${U}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: svc() });
  }
  await fetch(`${U}/rest/v1/units?grade=eq.9&unit_no=eq.20`, { method: "DELETE", headers: svc() });
}
const signIn = async (email) =>
  (await (await fetch(`${U}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, ...json }, body: JSON.stringify({ email, password: PW }) })).json()).access_token;

const RECORD = /^(Bấm để nói|Nói từ này|Nói từ đó|Đọc to câu này|Nói câu của em|Đọc to câu đã xếp|Đọc câu ngắn|Nói cả câu dài hơn|Nghe câu hỏi và trả lời|Nghe và trả lời câu mới|Bắt đầu: nghe bạn nói rồi trả lời|Lượt \d+\/\d+: bấm để nói|Nói lại lượt \d+)$/;

async function main() {
  await cleanup();
  const userId = (await (await fetch(`${U}/auth/v1/admin/users`, { method: "POST", headers: svc(json), body: JSON.stringify({ email: EMAIL, password: PW, email_confirm: true }) })).json()).id;
  const tok = await signIn(EMAIL);
  const asStudent = { apikey: ANON, Authorization: `Bearer ${tok}`, ...json };
  await fetch(`${U}/rest/v1/rpc/complete_onboarding`, { method: "POST", headers: asStudent, body: JSON.stringify({ p_role: "student", p_display_name: "Bạn Module", p_grade: 9, p_goal: null }) });

  const teacherId = (await (await fetch(`${U}/auth/v1/admin/users`, { method: "POST", headers: svc(json), body: JSON.stringify({ email: TEACHER, password: PW, email_confirm: true }) })).json()).id;
  const asTeacher = { apikey: ANON, Authorization: `Bearer ${await signIn(TEACHER)}`, ...json };
  await fetch(`${U}/rest/v1/rpc/complete_onboarding`, { method: "POST", headers: asTeacher, body: JSON.stringify({ p_role: "teacher", p_display_name: "Cô Module", p_grade: null, p_goal: null }) });
  await fetch(`${U}/rest/v1/classes`, { method: "POST", headers: asTeacher, body: JSON.stringify({ teacher_id: teacherId, name: "Lớp Module", join_code: "E2EM47", grade: 9 }) });
  await fetch(`${U}/rest/v1/rpc/join_class`, { method: "POST", headers: asStudent, body: JSON.stringify({ code: "E2EM47" }) });

  const [unit] = await admin("units?select=id", {
    method: "POST",
    prefer: "return=representation",
    body: { grade: 9, unit_no: 20, title: "E2E Module Unit", title_vi: "Unit thử", topic: "Unit dùng để kiểm tra tự động.", source: "thử", content_hash: "x", status: "approved", reviewed_by: "e2e", reviewed_at: new Date().toISOString() },
  });
  await admin("frames", { method: "POST", body: [{ unit_id: unit.id, key: "f01", text: "We should ___ because ___.", vi: "Chúng ta nên ... vì ...", grammar_note: "should + V", examples: ["We should recycle because it helps."] }] });
  await admin("questions", {
    method: "POST",
    body: Array.from({ length: 12 }, (_, i) => ({
      unit_id: unit.id, key: `q${String(i + 1).padStart(2, "0")}`, text: `What can you do to protect the environment, idea ${i + 1}?`, difficulty: (i % 3) + 1, kind: "personal",
      keywords: ["recycle", "because"], frame_key: "f01", hint_direction_vi: "Nghĩ về việc em làm ở nhà.", example_answer: "I recycle plastic bottles because it helps reduce waste.", expects_reason: i % 2 === 0,
    })),
  });
  const [mod] = await admin("modules?select=id", {
    method: "POST",
    prefer: "return=representation",
    body: { unit_id: unit.id, grade: 9, unit_no: 20, title: "E2E Module Unit", content: CONTENT, content_hash: "x", status: "team_checked" },
  });

  // RLS: học sinh không tự ghi được lượt làm hay bài học (chỉ máy chủ ghi).
  const ins = await fetch(`${U}/rest/v1/module_lessons`, { method: "POST", headers: asStudent, body: JSON.stringify({ student_id: userId, module_id: mod.id, day: 5, plan: {} }) });
  t("RLS: học sinh không tự tạo bài học", !ins.ok, `${ins.status}`);

  const browser = await chromium.launch({ channel: "msedge", args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["microphone"] });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30_000);
  const SHOTS = process.env.SHOT_DIR;
  const shot = async (name) => SHOTS && (await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }));
  const vis = (loc) => loc.first().isVisible().catch(() => false);

  await page.goto(`${BASE}/login?as=email`);
  await page.getByLabel("Email, tên tài khoản hoặc mã học sinh").fill(EMAIL);
  await page.getByLabel("Mật khẩu hoặc PIN", { exact: true }).fill(PW);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(`${BASE}/student`);
  // Chờ trang tải xong (đang tải thì chỉ có khung xám) rồi mới kiểm tra.
  t("trang học sinh có khối lộ trình 14 ngày", await page.getByText(/^Lộ trình 14 ngày · Unit \d+$/).first().waitFor({ timeout: 30_000 }).then(() => true, () => false));
  if (process.env.DEBUG_DIR) await page.screenshot({ path: `${process.env.DEBUG_DIR}/trang-hoc-sinh.png`, fullPage: true });

  await page.goto(`${BASE}/student/module/${mod.id}`);
  t("trang module có nhãn 'chưa được thầy cô duyệt'", await vis(page.getByText(/chưa được thầy cô duyệt/)));
  t("trang module có lộ trình 5 giai đoạn", await vis(page.getByRole("heading", { name: "Lộ trình 5 giai đoạn" })));
  await shot("m01-module-tong-quan");

  await page.goto(`${BASE}/student/module/${mod.id}/kien-thuc`);
  t("Kho kiến thức có phiên âm và trang SGK", (await vis(page.getByText("/prəˈtekt/"))) && (await vis(page.getByText("SGK tr. 138"))));
  await shot("m02-kho-kien-thuc");

  const stepsSeen = new Set();
  let roleplayRedo = false;
  let noiseFilterOn = false;
  let pronShot = false;
  async function runLesson(day) {
    await page.goto(`${BASE}/student/module/${mod.id}`);
    await page.getByRole("button", { name: new RegExp(`^(Bắt đầu ngày ${day}|Học tiếp bài đang dở)$`) }).click();
    await page.waitForURL(/\/bai\//);
    let shotTaken = 0;
    for (let i = 0; i < 400; i++) {
      const done = page.getByRole("button", { name: "Hoàn thành bài hôm nay" });
      if (await vis(done)) {
        await done.click();
        await page.waitForURL(/\?xong=/);
        return true;
      }
      const chip = (await page.locator("main section p.rounded-full").first().textContent().catch(() => "")) ?? "";
      if (chip) stepsSeen.add(chip);
      if (SHOTS && shotTaken < 2 && chip) {
        await shot(`m-ngay${day}-${shotTaken}`);
        shotTaken++;
      }
      const options = page.getByRole("group", { name: "Các lựa chọn" }).getByRole("button");
      if ((await options.count()) > 0 && (await options.first().isEnabled())) {
        await options.first().click();
        await page.getByRole("button", { name: "Tiếp tục" }).waitFor();
        continue;
      }
      if (await vis(page.getByRole("button", { name: "Kiểm tra" }))) {
        const sentence = (await page.locator("main").textContent()) ?? "";
        const b = CONTENT.build.find((x) => sentence.includes(x.vi));
        for (const c of b.chunks) await page.getByRole("button", { name: c, exact: true }).last().click();
        await page.getByRole("button", { name: "Kiểm tra" }).click();
        await page.getByText(/^Đúng rồi:/).waitFor();
        continue;
      }
      const ask = page.getByRole("button", { name: "Xem nhận xét của AI" });
      if (await vis(ask)) {
        await ask.click();
        await page.getByRole("heading", { name: /^(AI|Linguine) nhận xét$/ }).first().waitFor();
        continue;
      }
      const next = page.getByRole("button", { name: /^(Tiếp tục|Đã hiểu, tiếp tục)$/ });
      // Nút có thể vừa biến mất (bước đổi): không chờ 30 giây, vòng sau kiểm tra lại.
      if ((await vis(next)) && (await next.first().isEnabled({ timeout: 1000 }).catch(() => false))) {
        await next.first().click();
        await page.waitForTimeout(250);
        continue;
      }
      // Roleplay: nói lại lượt vừa rồi một lần (lượt cũ được thay trong cuộc trò chuyện).
      const redo = page.getByRole("button", { name: "Nói lại lượt vừa rồi" });
      if (!roleplayRedo && (await vis(redo))) {
        roleplayRedo = true;
        await redo.click();
        continue;
      }
      const rec = page.getByRole("button", { name: RECORD });
      if (await vis(rec)) {
        await rec.first().click();
        const stop = page.getByRole("button", { name: /^(Đang nghe, em nói khi sẵn sàng|Xong, gửi câu trả lời)$/ });
        await stop.waitFor({ timeout: 40_000 });
        if (!noiseFilterOn) noiseFilterOn = await vis(page.getByText(/đang lọc tiếng ồn/));
        await page.waitForTimeout(1500);
        await stop.click();
        await page.getByText("Đang nghe lại bản ghi").waitFor({ state: "detached", timeout: 40_000 }).catch(() => {});
        if (process.env.DEBUG_DIR && !pronShot && (await page.getByRole("heading", { name: "Phát âm từng từ" }).waitFor({ timeout: 8000 }).then(() => true, () => false))) {
          pronShot = true;
          await page.screenshot({ path: `${process.env.DEBUG_DIR}/phat-am.png`, fullPage: true });
        }
        continue;
      }
      await page.waitForTimeout(400);
    }
    return false;
  }

  const fakePlan = (day) => ({ day, phase: 0, titleVi: "đánh dấu xong bởi bài thử", minutes: 0, notesVi: [], steps: [] });
  for (let day = 1; day <= 14; day++) {
    if (REAL_DAYS.includes(day)) {
      const ok = await runLesson(day).catch(async (e) => {
        console.error(`ngày ${day}:`, e.message);
        if (process.env.DEBUG_DIR) {
          await page.screenshot({ path: `${process.env.DEBUG_DIR}/loi-ngay-${day}.png`, fullPage: true });
          console.error(((await page.locator("main").textContent()) ?? "").slice(0, 1500));
        }
        return false;
      });
      t(`học xong ngày ${day} bằng trình duyệt`, ok);
      if (!ok) {
        await shot(`m-ket-ngay-${day}`);
        return;
      }
    } else {
      await admin("module_lessons", { method: "POST", body: { student_id: userId, module_id: mod.id, day, plan: fakePlan(day), status: "completed", completed_at: new Date().toISOString() } });
    }
  }
  t("gặp đủ các loại bước", ["Từ mới", "Kiến thức", "Nghe và nói theo", "Từ vựng thành câu", "Xếp câu", "Mở rộng câu", "Trả lời câu hỏi", "Speed Q&A", "Sửa lỗi và nói lại", "Micro-Roleplay", "Nói độc lập, không gợi ý", "Kết quả"].every((x) => stepsSeen.has(x)), [...stepsSeen].join(", "));

  await page.goto(`${BASE}/student/module/${mod.id}`);
  t("module xong cả 14 ngày", await vis(page.getByText("Em đã học xong cả 14 ngày")));
  t("có bảng so sánh đầu và cuối module", await vis(page.getByText("Nói độc lập, không gợi ý: đầu module và cuối module")));
  t("Error Memory có lỗi được ghi (từ AI mô phỏng)", await vis(page.getByText(ERROR_LABEL)));
  await shot("m03-module-xong");

  const rows = await admin(`module_attempts?select=kind,turn,attempt_no,measures,ai_status,error_tags,quiz_set,correct,audio_path&student_id=eq.${userId}`);
  t("bài đầu module có 8 câu kiến thức và cuối module có 8 câu", rows.filter((r) => r.quiz_set === "entry").length === 8 && rows.filter((r) => r.quiz_set === "final").length === 8);
  t("câu nói độc lập có AI nhận xét (mô phỏng)", rows.filter((r) => r.kind === "speak" && r.ai_status === "ok").length >= 6);
  t("lỗi bịa của AI bị bỏ, chỉ lưu nhãn lỗi thật", rows.filter((r) => r.ai_status === "ok").every((r) => r.error_tags.length === 1));
  t("mọi lượt nói có file ghi âm trong thư mục học sinh", rows.filter((r) => ["speak", "say", "learn_word", "roleplay"].includes(r.kind) && r.turn < 10).every((r) => r.audio_path?.startsWith(`${userId}/m-`)));
  const roleplay = rows.filter((r) => r.kind === "roleplay");
  t("roleplay lưu từng lượt nói", roleplay.length >= 5, `${roleplay.length}`);
  t("roleplay: nói lại được lượt vừa rồi (lần 2 được lưu)", roleplayRedo && roleplay.some((r) => r.attempt_no === 2));
  t("micro đi qua bộ lọc ồn RNNoise trong trình duyệt", noiseFilterOn);
  const pron = rows.filter((r) => ["learn_word", "say"].includes(r.kind) && r.measures?.pron?.words?.length);
  t("chấm phát âm từng âm tiết (mô phỏng) được lưu cho bước đọc theo", pron.length > 0 && pron.every((r) => r.measures.pron.mock === true && r.measures.pron.words.every((w) => Array.isArray(w.syllables))), String(pron.length));

  // Giáo viên: xem tiến độ module của học sinh trong lớp, duyệt module.
  const tctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const tp = await tctx.newPage();
  tp.setDefaultTimeout(30_000);
  await tp.goto(`${BASE}/login?as=email`);
  await tp.getByLabel("Email, tên tài khoản hoặc mã học sinh").fill(TEACHER);
  await tp.getByLabel("Mật khẩu hoặc PIN", { exact: true }).fill(PW);
  await tp.getByRole("button", { name: "Đăng nhập" }).click();
  await tp.waitForURL(`${BASE}/teacher`);
  await tp.goto(`${BASE}/teacher/students/${userId}`);
  t("giáo viên thấy tiến độ module của học sinh", await vis(tp.getByText("Đã xong 14/14 ngày.")));
  await tp.goto(`${BASE}/teacher/modules/${mod.id}`);
  await tp.getByRole("checkbox").check();
  await tp.getByRole("button", { name: "Ghi nhận đã duyệt" }).click();
  await tp.waitForURL(/ok=approved/);
  const [after] = await admin(`modules?select=status,reviewed_by&id=eq.${mod.id}`);
  t("giáo viên duyệt module: lưu tên người duyệt", after.status === "teacher_approved" && after.reviewed_by === "Cô Module", `${after.status}`);
  if (SHOTS) await tp.screenshot({ path: `${SHOTS}/m04-giao-vien-duyet.png`, fullPage: true });
  await tctx.close();

  // Module nháp: học sinh không thấy (RLS).
  await admin(`modules?id=eq.${mod.id}`, { method: "PATCH", body: { status: "draft", reviewed_by: null, reviewed_at: null } });
  const hidden = await (await fetch(`${U}/rest/v1/modules?select=id&id=eq.${mod.id}`, { headers: asStudent })).json();
  t("RLS: học sinh không thấy module nháp", Array.isArray(hidden) && hidden.length === 0);

  await browser.close();
}
const ERROR_LABEL = "Thiếu -s/-es sau chủ ngữ số ít (he, she, it)";

try {
  await main();
} catch (e) {
  console.error("LỖI khi chạy:", e.message);
  fail++;
} finally {
  await cleanup();
  console.log("Đã dọn tài khoản, Unit, module và file thử.");
}
console.log(fail ? `${fail} hỏng` : "Tất cả đạt");
process.exit(fail ? 1 : 0);
