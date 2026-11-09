// Thử bản đồ phiêu lưu bằng trình duyệt thật (Edge), không tốn tiền dịch vụ AI.
// Cần: đã chạy 0001–0013 (thiếu 0013 thì phần XP, mini-game được báo "bỏ qua", phần còn lại vẫn thử), web chạy với MOCK_AI=1:
//   Git Bash:    MOCK_AI=1 npx next dev -p 3126
// Rồi: npm run test:e2e-adventure      (SHOT_DIR=<thư mục> để lưu ảnh chụp màn hình)
// Tạo học sinh, giáo viên, lớp, Unit thử (lớp 9, Unit 19) dùng nội dung mẫu lớp 8 Unit 7, đánh dấu sẵn ngày 1–2 đã xong
// (dữ liệu của tài khoản thử), rồi XÓA SẠCH khi xong.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { loadEnv, ROOT, serviceHeaders } from "./lib.mjs";

const env = loadEnv();
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BASE = process.env.BASE_URL ?? "http://localhost:3126";
const EMAIL = "e2e-adventure@example.test";
const TEACHER = "e2e-adventure-teacher@example.test";
const PW = "Thu-e2e-xyz-123";
const json = { "Content-Type": "application/json" };
const svc = (x = {}) => serviceHeaders(env, x);
const CONTENT = JSON.parse(readFileSync(join(ROOT, "content/modules/grade-8/unit-07.json"), "utf8"));
const SHOTS = process.env.SHOT_DIR;

let fail = 0;
let skipped = 0;
const t = (n, ok, extra = "") => {
  console.log((ok ? "ĐẠT " : "HỎNG ") + n + (extra ? ` (${extra})` : ""));
  if (!ok) fail++;
};
const skip = (n, why) => {
  console.log(`BỎ QUA ${n} (${why})`);
  skipped++;
};
async function admin(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${U}/rest/v1/${path}`, { method, headers: svc({ ...json, ...(prefer ? { Prefer: prefer } : {}) }), body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}
async function cleanup() {
  const list = await (await fetch(`${U}/auth/v1/admin/users?per_page=200`, { headers: svc() })).json();
  for (const u of list.users ?? []) if (u.email === EMAIL || u.email === TEACHER) await fetch(`${U}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: svc() });
  await fetch(`${U}/rest/v1/units?grade=eq.9&unit_no=eq.19`, { method: "DELETE", headers: svc() });
}
const signIn = async (email) =>
  (await (await fetch(`${U}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, ...json }, body: JSON.stringify({ email, password: PW }) })).json()).access_token;

async function login(page, email) {
  await page.goto(`${BASE}/login?as=email`);
  await page.getByLabel("Email, tên tài khoản hoặc mã học sinh").fill(email);
  await page.getByLabel("Mật khẩu hoặc PIN", { exact: true }).fill(PW);
  await page.getByRole("button", { name: /^Đăng nhập$/ }).click();
}

async function main() {
  await cleanup();
  const userId = (await (await fetch(`${U}/auth/v1/admin/users`, { method: "POST", headers: svc(json), body: JSON.stringify({ email: EMAIL, password: PW, email_confirm: true }) })).json()).id;
  const asStudent = { apikey: ANON, Authorization: `Bearer ${await signIn(EMAIL)}`, ...json };
  await fetch(`${U}/rest/v1/rpc/complete_onboarding`, { method: "POST", headers: asStudent, body: JSON.stringify({ p_role: "student", p_display_name: "Bạn Phiêu Lưu", p_grade: 9, p_goal: null }) });
  const teacherId = (await (await fetch(`${U}/auth/v1/admin/users`, { method: "POST", headers: svc(json), body: JSON.stringify({ email: TEACHER, password: PW, email_confirm: true }) })).json()).id;
  const asTeacher = { apikey: ANON, Authorization: `Bearer ${await signIn(TEACHER)}`, ...json };
  await fetch(`${U}/rest/v1/rpc/complete_onboarding`, { method: "POST", headers: asTeacher, body: JSON.stringify({ p_role: "teacher", p_display_name: "Cô Phiêu Lưu", p_grade: null, p_goal: null }) });
  const [cls] = await (await fetch(`${U}/rest/v1/classes?select=id`, { method: "POST", headers: { ...asTeacher, Prefer: "return=representation" }, body: JSON.stringify({ teacher_id: teacherId, name: "Lớp Phiêu Lưu", join_code: "E2EP58", grade: 9 }) })).json();
  await fetch(`${U}/rest/v1/rpc/join_class`, { method: "POST", headers: asStudent, body: JSON.stringify({ code: "E2EP58" }) });

  const [unit] = await admin("units?select=id", {
    method: "POST",
    prefer: "return=representation",
    body: { grade: 9, unit_no: 19, title: "E2E Adventure Unit", title_vi: "Unit thử phiêu lưu", topic: "Unit dùng để kiểm tra tự động.", source: "thử", content_hash: "x", status: "approved", reviewed_by: "e2e", reviewed_at: new Date().toISOString() },
  });
  const [mod] = await admin("modules?select=id", {
    method: "POST",
    prefer: "return=representation",
    body: { unit_id: unit.id, grade: 9, unit_no: 19, title: "E2E Adventure Unit", content: CONTENT, content_hash: "x", status: "team_checked" },
  });
  // Ngày 1–2 đã xong (dữ liệu của tài khoản thử, để mở nhiệm vụ 3 và mini-game đầu tiên).
  const lessons = await admin("module_lessons?select=id,day", {
    method: "POST",
    prefer: "return=representation",
    body: [1, 2].map((day) => ({ student_id: userId, module_id: mod.id, day, plan: { day, phase: 1, titleVi: "", minutes: 20, notesVi: ["Ghi chú thích ứng thử"], steps: [] }, status: "completed", completed_at: new Date(Date.now() - (3 - day) * 3600_000).toISOString() })),
  });
  const day2 = lessons.find((l) => l.day === 2).id;

  const has0013 = (await fetch(`${U}/rest/v1/xp_events?select=id&limit=1`, { headers: svc() })).ok;
  console.log(has0013 ? "Đã có bảng của 0013_adventure.sql." : "CHƯA chạy 0013_adventure.sql: phần XP và mini-game sẽ được báo bỏ qua.");

  // RLS: học sinh không tự cộng XP, không tự tạo lượt chơi.
  if (has0013) {
    const x = await fetch(`${U}/rest/v1/xp_events`, { method: "POST", headers: asStudent, body: JSON.stringify({ student_id: userId, source: "cheat:1", kind: "quest", xp: 500 }) });
    t("RLS: học sinh không tự ghi XP", !x.ok, String(x.status));
    const g = await fetch(`${U}/rest/v1/game_rounds`, { method: "POST", headers: asStudent, body: JSON.stringify({ student_id: userId, module_id: mod.id, game: "vocab_match", items: [], total: 1 }) });
    t("RLS: học sinh không tự tạo lượt chơi", !g.ok, String(g.status));
  }

  const browser = await chromium.launch({ channel: "msedge" });
  try {
    // ---- Máy tính: bản đồ ngang ----
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30_000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await login(page, EMAIL);
    await page.waitForURL(`${BASE}/student`);
    const entry = page.getByRole("link", { name: /bản đồ phiêu lưu|cuộc phiêu lưu|Học tiếp trên bản đồ/ }).first();
    t("trang tổng quan có lối vào bản đồ phiêu lưu", await entry.waitFor({ timeout: 30_000 }).then(() => true, () => false));

    await page.goto(`${BASE}/student/phieu-luu?m=${mod.id}&xong=${day2}`);
    const done = page.getByRole("dialog", { name: "Hoàn thành nhiệm vụ!" });
    t("màn hình hoàn thành nhiệm vụ hiện khi vừa xong bài", await done.waitFor({ timeout: 30_000 }).then(() => true, () => false));
    if (has0013) t("màn hình hoàn thành có XP vừa nhận", await done.getByText("+100 XP").isVisible().catch(() => false));
    t("màn hình hoàn thành ghi rõ cấp phiêu lưu không phải trình độ", !has0013 || (await done.getByText("không phải trình độ tiếng Anh").isVisible()));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/hoan-thanh.png` });
    await done.getByRole("button", { name: "Về bản đồ" }).click();
    t("đóng màn hình hoàn thành bỏ ?xong khỏi địa chỉ", !page.url().includes("xong="));

    const desktop = page.locator(".hidden.md\\:block");
    const node = (name) => desktop.getByRole("button", { name });
    t("nhiệm vụ đã xong có chữ trạng thái", await node(/^Ngày 1: .*Đã xong\.$/).isVisible());
    t("nhiệm vụ hiện tại là ngày 3 (thử thách)", await node(/^Ngày 3 · Thử thách: .*Nhiệm vụ hiện tại\.$/).isVisible());
    t("nhiệm vụ sau bị khóa", await node(/^Ngày 4: .*Chưa mở\.$/).isVisible());
    t("mini-game đầu tiên đã mở (sau ngày 2)", await node(/^Mini-game · tùy chọn: Ghép từ ở chợ làng\. Đã mở\.$/).isVisible());
    t("mini-game sau còn khóa", await node(/^Mini-game · tùy chọn: Cầu câu chữ\. Chưa mở\.$/).isVisible());
    t("đủ 14 nhiệm vụ và 5 mini-game", (await desktop.getByRole("button", { name: /^(Ngày \d+|Mini-game)/ }).count()) === 19);
    const frame = desktop.locator(".overflow-x-auto").first();
    t("bản đồ cuộn ngang trong khung, không kéo giãn trang", (await frame.evaluate((el) => el.scrollWidth > el.clientWidth + 100)) && (await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)));
    await page.waitForTimeout(1800); // chờ đường đã đi tự vẽ xong
    const trace = await desktop.locator("path.adv-trace").first().evaluate((el) => ({ dash: getComputedStyle(el).strokeDasharray, off: getComputedStyle(el).strokeDashoffset })).catch(() => null);
    t("đường đã đi được tô tới nhiệm vụ hiện tại", !!trace && trace.off.replace("px", "") === "0" && parseFloat(trace.dash) > 0, JSON.stringify(trace));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/ban-do-may-tinh.png`, fullPage: true });
    t("không có lỗi trong trình duyệt ở bản đồ", errors.length === 0, errors.slice(0, 3).join(" | ").slice(0, 4000));

    await node(/^Ngày 3 · Thử thách/).click();
    const sheet = page.getByRole("dialog");
    t("bảng chi tiết nhiệm vụ: câu chuyện, mục tiêu, thời gian, độ khó, XP, kỹ năng", (await sheet.getByText("Mục tiêu:").isVisible()) && (await sheet.getByText("150 XP").isVisible()) && (await sheet.getByText("Kỹ năng được luyện").isVisible()));
    t("nhiệm vụ thử thách nói rõ không gợi ý, XP không theo kết quả", await sheet.getByText(/không gợi ý, không đồng hồ trò chơi/).isVisible());
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/chi-tiet-nhiem-vu.png` });
    await sheet.getByRole("button", { name: "Đóng" }).click();
    await node(/^Ngày 4:/).click();
    t("nhiệm vụ khóa: không có nút bắt đầu", !(await page.getByRole("dialog").getByRole("button", { name: /Bắt đầu nhiệm vụ/ }).isVisible()));
    await page.getByRole("dialog").getByRole("button", { name: "Đóng" }).click();
    await node(/^Ngày 3 · Thử thách/).click();
    await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu nhiệm vụ" }).click();
    await page.waitForURL(/\/bai\//);
    t("bấm Bắt đầu mở bài học thật của ngày 3", page.url().includes(`/student/module/${mod.id}/bai/`));
    const rows = await admin(`module_lessons?select=day,status&student_id=eq.${userId}&day=eq.3`);
    t("bài ngày 3 được máy chủ lập (đang làm)", rows.length === 1 && rows[0].status === "in_progress");

    // Bản đồ giữ "Làm tiếp nhiệm vụ" khi có bài đang dở.
    await page.goto(`${BASE}/student/phieu-luu?m=${mod.id}`);
    await node(/^Ngày 3 · Thử thách: .*Đang làm dở\.$/).click();
    t("nhiệm vụ đang dở: nút Làm tiếp", await page.getByRole("dialog").getByRole("button", { name: "Làm tiếp nhiệm vụ" }).isVisible());
    await page.getByRole("dialog").getByRole("button", { name: "Đóng" }).click();

    // ---- Mini-game ----
    if (has0013) {
      await page.goto(`${BASE}/student/phieu-luu/tro-choi/vocab_match?m=${mod.id}`);
      const play = async () => {
        await page.getByRole("button", { name: /^Bắt đầu: Ghép từ|^Chơi lượt mới$/ }).click();
        await page.getByRole("list", { name: "Từ tiếng Anh" }).waitFor();
        for (let k = 0; k < 6; k++) {
          await page.getByRole("list", { name: "Từ tiếng Anh" }).getByRole("button").and(page.locator(":enabled")).first().click();
          await page.getByRole("list", { name: "Nghĩa tiếng Việt" }).getByRole("button").and(page.locator(":enabled")).first().click();
          await page.getByRole("status").first().waitFor();
        }
        await page.getByRole("button", { name: /Xem kết quả/ }).click();
        await page.getByRole("heading", { name: "Xong lượt chơi!" }).waitFor();
      };
      await play();
      t("mini-game: chơi xong, lần đầu nhận 40 XP", await page.getByText(/\+40 XP/).isVisible());
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/mini-game.png`, fullPage: true });
      await play();
      t("mini-game: chơi lại không thêm XP", await page.getByText(/không có thêm XP/).isVisible());
      const xp = await admin(`xp_events?select=source,xp&student_id=eq.${userId}`);
      t("XP ghi đúng một lần cho mỗi nguồn", xp.filter((e) => e.source.startsWith("game:")).length === 1 && xp.filter((e) => e.source.startsWith("lesson:")).length === 2, xp.map((e) => e.source).join(", "));
      const rounds = await admin(`game_rounds?select=answers,total,finished_at&student_id=eq.${userId}`);
      t("lượt chơi lưu đủ câu trả lời, đã chấm", rounds.length === 2 && rounds.every((r) => r.finished_at && r.answers.length === r.total));
      await page.goto(`${BASE}/student/phieu-luu/tro-choi/grammar_fix?m=${mod.id}`);
      t("mini-game chưa mở thì không chơi được", await page.getByText(/mở sau khi em xong nhiệm vụ ngày 6/).isVisible());

      await page.goto(`${BASE}/student/phieu-luu/ho-so`);
      t("hồ sơ phiêu lưu: cấp 2 sau 240 XP", await page.getByRole("heading", { name: /^Cấp 2:/ }).isVisible());
      t("hồ sơ: thành tích 'Chuyến đi đầu tiên'", await page.getByText("Chuyến đi đầu tiên").first().isVisible());
      await page.getByRole("button", { name: /^Cờ đỏ Ý/ }).click();
      await page.getByRole("button", { name: /^Cờ đỏ Ý/, pressed: true }).waitFor();
      const prof = await admin(`adventure_profiles?select=cosmetics&student_id=eq.${userId}`);
      t("đổi đồ trang trí đã mở khóa", prof[0]?.cosmetics?.flag === "red");
      t("đồ chưa mở khóa không bấm được", await page.getByRole("button", { name: /^Mùa đông/ }).isDisabled());
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/ho-so.png`, fullPage: true });
    } else {
      skip("mini-game, XP, hồ sơ phiêu lưu", "chưa chạy 0013_adventure.sql");
      await page.goto(`${BASE}/student/phieu-luu/ho-so`);
      t("chưa có 0013: hồ sơ báo cần chạy file SQL, không lỗi", await page.getByText(/0013_adventure\.sql/).waitFor({ timeout: 30_000 }).then(() => true, () => false));
    }

    await page.goto(`${BASE}/student/ky-nang`);
    t("trang Kỹ năng: 6 kỹ năng, chưa đủ dữ liệu thì nói rõ", (await page.getByRole("heading", { level: 2 }).count()) === 6 && (await page.getByText("Chưa đủ dữ liệu").count()) === 6);
    t("trang Kỹ năng nói rõ XP không làm kỹ năng tăng", await page.getByText(/XP không làm kỹ năng tăng/).isVisible());
    await ctx.close();

    // ---- Điện thoại: bản đồ dọc ----
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p2 = await phone.newPage();
    p2.setDefaultTimeout(30_000);
    const phoneErrors = [];
    p2.on("pageerror", (e) => phoneErrors.push(String(e)));
    p2.on("console", (m) => m.type() === "error" && phoneErrors.push(m.text()));
    await login(p2, EMAIL);
    await p2.waitForURL(`${BASE}/student`);
    await p2.goto(`${BASE}/student/phieu-luu?m=${mod.id}`);
    const mobile = p2.locator(".md\\:hidden").filter({ has: p2.getByRole("button", { name: /^Ngày 1:/ }) });
    t("điện thoại: bản đồ dọc hiện đủ nút", (await mobile.getByRole("button", { name: /^(Ngày \d+|Mini-game)/ }).count()) === 19);
    t("điện thoại: không tràn ngang trang", await p2.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await mobile.getByRole("button", { name: /^Ngày 2:/ }).click();
    t("điện thoại: mở được bảng chi tiết", await p2.getByRole("dialog").getByText("Đã nhận 100 XP").isVisible());
    await p2.getByRole("dialog").getByRole("button", { name: "Đóng" }).click();
    if (SHOTS) await p2.screenshot({ path: `${SHOTS}/ban-do-dien-thoai.png`, fullPage: true });
    t("điện thoại: không có lỗi trong trình duyệt", phoneErrors.length === 0, phoneErrors.slice(0, 2).join(" | ").slice(0, 600));
    await phone.close();

    // ---- Giáo viên ----
    const tctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
    const tp = await tctx.newPage();
    tp.setDefaultTimeout(30_000);
    await login(tp, TEACHER);
    await tp.waitForURL(`${BASE}/teacher`);
    await tp.goto(`${BASE}/teacher/classes/${cls.id}`);
    t("giáo viên: có bảng kỹ năng nói của lớp", await tp.getByRole("heading", { name: "Kỹ năng nói của lớp" }).isVisible());
    t("giáo viên: bảng có học sinh và số nhiệm vụ", await tp.getByRole("rowheader", { name: "Bạn Phiêu Lưu" }).isVisible());
    t("giáo viên: bảng kỹ năng không có cột XP hay cấp", !/XP|Cấp/.test(await tp.locator("table").filter({ has: tp.getByRole("rowheader", { name: "Bạn Phiêu Lưu" }) }).locator("thead").innerText()));
    const csv = await tp.request.get(`${BASE}/teacher/classes/${cls.id}/export?kind=lessons`);
    const body = await csv.text();
    t("giáo viên: xuất CSV từng bài (có thời gian luyện, gợi ý, thay đổi thích ứng)", csv.headers()["content-type"]?.includes("text/csv") && body.includes("active_minutes_est") && body.includes("adaptive_notes") && body.includes("Ghi chú thích ứng thử"));
    t("CSV không chứa XP", !/xp/i.test(body.split("\r\n")[0]));
    const csv2 = await tp.request.get(`${BASE}/teacher/classes/${cls.id}/export?kind=attempts`);
    t("giáo viên: xuất CSV từng lượt có số đo thô", (await csv2.text()).split("\r\n")[0].includes("think_ms"));
    if (SHOTS) await tp.screenshot({ path: `${SHOTS}/giao-vien.png`, fullPage: true });
    // Giáo viên khác lớp không xuất được.
    const other = (await fetch(`${BASE}/teacher/classes/${cls.id}/export?kind=lessons`, { redirect: "manual" })).status;
    t("xuất CSV cần đăng nhập giáo viên", other === 401 || other === 307 || other === 302, String(other));
    await tctx.close();
  } finally {
    await browser.close();
    await cleanup();
    console.log("Đã dọn tài khoản, Unit, module và dữ liệu thử.");
  }
  console.log(fail ? `${fail} hỏng${skipped ? `, ${skipped} bỏ qua` : ""}` : `Tất cả đạt${skipped ? ` (${skipped} phần bỏ qua)` : ""}`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await cleanup().catch(() => {});
  process.exit(1);
});
