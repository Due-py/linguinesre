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
  const has0014 = (await fetch(`${U}/rest/v1/shop_items?select=key&limit=1`, { headers: svc() })).ok;
  console.log(has0014 ? "Đã có bảng của 0014_shop.sql." : "CHƯA chạy 0014_shop.sql: phần Lingua Coins và cửa hàng sẽ được báo bỏ qua.");
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
    if (has0013) t("màn hình hoàn thành có EXP vừa nhận", await done.getByText(/^\+100 EXP/).isVisible().catch(() => false));
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
    t("bảng chi tiết nhiệm vụ: câu chuyện, mục tiêu, thời gian, độ khó, XP, kỹ năng", (await sheet.getByText("Mục tiêu:").isVisible()) && (await sheet.getByText("Tới 150 EXP").isVisible()) && (await sheet.getByText("Kỹ năng được luyện").isVisible()));
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
          // Chọn đúng nghĩa theo nội dung bài (mini-game chỉ thưởng khi đúng từ một nửa).
          const word = page.getByRole("list", { name: "Từ tiếng Anh" }).getByRole("button").and(page.locator(":enabled")).first();
          const en = (await word.innerText()).trim();
          await word.click();
          const vi = CONTENT.vocab.find((v) => v.en === en)?.vi;
          await page.getByRole("list", { name: "Nghĩa tiếng Việt" }).getByRole("button", { name: vi, exact: true }).click();
          await page.getByRole("status").first().waitFor();
        }
        await page.getByRole("button", { name: /Xem kết quả/ }).click();
        await page.getByRole("heading", { name: "Xong lượt chơi!" }).waitFor();
      };
      await play();
      t("mini-game: chơi đạt, lần đầu nhận 40 EXP", await page.getByText(/\+40 EXP/).isVisible());
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/mini-game.png`, fullPage: true });
      await play();
      t("mini-game: chơi lại không thêm EXP", await page.getByText(/không có thêm EXP/).isVisible());
      const xp = await admin(`xp_events?select=source,xp&student_id=eq.${userId}`);
      t("XP ghi đúng một lần cho mỗi nguồn", xp.filter((e) => e.source.startsWith("game:")).length === 1 && xp.filter((e) => e.source.startsWith("lesson:")).length === 2, xp.map((e) => e.source).join(", "));
      const rounds = await admin(`game_rounds?select=answers,total,finished_at&student_id=eq.${userId}`);
      t("lượt chơi lưu đủ câu trả lời, đã chấm", rounds.length === 2 && rounds.every((r) => r.finished_at && r.answers.length === r.total));
      await page.goto(`${BASE}/student/phieu-luu/tro-choi/grammar_fix?m=${mod.id}`);
      t("mini-game chưa mở thì không chơi được", await page.getByText(/mở sau khi em xong nhiệm vụ ngày 6/).isVisible());

      await page.goto(`${BASE}/student/phieu-luu/ho-so`);
      t("hồ sơ phiêu lưu: cấp 2 sau 240 EXP", await page.getByRole("heading", { name: /^Cấp 2:/ }).waitFor({ timeout: 30_000 }).then(() => true, () => false));
      t("hồ sơ: thành tích 'Chuyến đi đầu tiên'", await page.getByText("Chuyến đi đầu tiên").first().isVisible());
      await page.getByRole("button", { name: /^Cờ đỏ Ý/ }).click();
      await page.getByRole("button", { name: /^Cờ đỏ Ý/, pressed: true }).waitFor();
      const prof = await admin(`adventure_profiles?select=cosmetics&student_id=eq.${userId}`);
      t("đổi đồ trang trí đã mở khóa", prof[0]?.cosmetics?.flag === "red");
      t("đồ chưa mở khóa không bấm được", await page.getByRole("button", { name: /^Mùa đông/ }).isDisabled());
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/ho-so.png`, fullPage: true });

      // ---- Lingua Coins và Cửa hàng Penguin ----
      if (has0014) {
        const coins = await admin(`coin_transactions?select=source,delta&student_id=eq.${userId}`);
        const bal = coins.reduce((n, c) => n + c.delta, 0);
        // 2 nhiệm vụ (10+10), mini-game đạt (5), lên cấp 2 (20), thành tích (mỗi cái 10).
        t("nhận Lingua Coins từ việc học thật, không trùng", bal >= 45 && new Set(coins.map((c) => c.source)).size === coins.length, `${bal} LC: ${coins.map((c) => c.source).join(", ")}`);
        await page.goto(`${BASE}/student/cua-hang`);
        await page.getByRole("heading", { name: "Phông nền" }).waitFor();
        t("cửa hàng: món quá đắt không mua được", await page.getByRole("listitem").filter({ hasText: "Linguine học giả" }).getByRole("button", { name: "Mua" }).isDisabled());
        await page.getByRole("listitem").filter({ hasText: "Đồng cỏ" }).getByRole("button", { name: "Mua" }).click();
        const confirm = page.getByRole("dialog", { name: /Mua Đồng cỏ\?/ });
        t("cửa hàng: hỏi xác nhận trước khi mua, ghi rõ số dư sau khi mua", await confirm.getByText(`${bal - 40} LC`).isVisible());
        await confirm.getByRole("button", { name: "Mua" }).click();
        await page.getByText(/Đã mua Đồng cỏ/).waitFor();
        const after = (await admin(`coin_transactions?select=delta&student_id=eq.${userId}`)).reduce((n, c) => n + c.delta, 0);
        t("mua xong: trừ đúng giá, có trong đồ đã có", after === bal - 40 && (await admin(`owned_items?select=item_key&student_id=eq.${userId}`)).some((o) => o.item_key === "bg_meadow"), `${after} LC`);
        // Mua trùng và mua khi thiếu tiền: chặn ở CSDL (gọi thẳng hàm như máy chủ).
        const rpc = (item) => fetch(`${U}/rest/v1/rpc/buy_item`, { method: "POST", headers: svc(json), body: JSON.stringify({ p_student: userId, p_item: item }) }).then((r) => r.json());
        t("mua trùng bị chặn", (await rpc("bg_meadow")) === "owned");
        t("thiếu tiền bị chặn, số dư không âm", (await rpc("skin_scholar")) === "insufficient");
        const both = await Promise.all([rpc("acc_book"), rpc("acc_book")]);
        const left = (await admin(`coin_transactions?select=delta&student_id=eq.${userId}`)).reduce((n, c) => n + c.delta, 0);
        t("bấm mua hai lần cùng lúc chỉ trừ tiền một lần", both.filter((x) => x === "ok").length === 1 && left === after - 40 && left >= 0, `${both.join(",")} → ${left} LC`);
        const stu = await fetch(`${U}/rest/v1/rpc/buy_item`, { method: "POST", headers: asStudent, body: JSON.stringify({ p_student: userId, p_item: "bg_night" }) });
        t("học sinh không tự gọi hàm mua được (chỉ máy chủ)", !stu.ok, String(stu.status));
        const cheat = await fetch(`${U}/rest/v1/coin_transactions`, { method: "POST", headers: asStudent, body: JSON.stringify({ student_id: userId, delta: 9999, source: "cheat", reason: "x" }) });
        t("RLS: học sinh không tự cộng Lingua Coins", !cheat.ok, String(cheat.status));
        // Dùng, tải lại vẫn giữ, bỏ dùng.
        await page.reload();
        await page.getByRole("listitem").filter({ hasText: "Đồng cỏ" }).getByRole("button", { name: "Dùng" }).click();
        await page.getByText(/Linguine đang dùng Đồng cỏ/).waitFor();
        await page.reload();
        t("trang bị được lưu, tải lại trang vẫn còn", await page.getByRole("listitem").filter({ hasText: "Đồng cỏ" }).getByText("Đang dùng").waitFor({ timeout: 30_000 }).then(() => true, () => false));
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/cua-hang.png`, fullPage: true });
        await page.getByRole("listitem").filter({ hasText: "Đồng cỏ" }).getByRole("button", { name: "Bỏ dùng" }).click();
        await page.getByText(/Đã bỏ Đồng cỏ/).waitFor();
        const prof2 = await admin(`adventure_profiles?select=cosmetics&student_id=eq.${userId}`);
        t("bỏ dùng được", !prof2[0]?.cosmetics?.m_background && prof2[0]?.cosmetics?.flag === "red");
        await page.goto(`${BASE}/student/phieu-luu/ho-so`);
        t("hồ sơ: lịch sử Lingua Coins có cả nhận và tiêu", (await page.getByText("Mua Đồng cỏ").isVisible()) && (await page.getByText(/Lên cấp 2/).isVisible()));
        // Giáo viên không đọc được ví của học sinh (RLS chỉ cho chính học sinh).
        const tc = await (await fetch(`${U}/rest/v1/coin_transactions?select=id&student_id=eq.${userId}`, { headers: asTeacher })).json();
        t("RLS: giáo viên không xem được ví của học sinh", Array.isArray(tc) && tc.length === 0);
      } else skip("Lingua Coins, cửa hàng", "chưa chạy 0014_shop.sql");

      await page.goto(`${BASE}/student`);
      const companion = page.getByRole("region", { name: "Linguine và tiến trình phiêu lưu" });
      t("trang tổng quan: khối Linguine có cấp và EXP", await companion.getByText(/EXP$/).first().waitFor({ timeout: 30_000 }).then(() => true, () => false));
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/tong-quan.png`, fullPage: true });
    } else {
      skip("mini-game, XP, hồ sơ phiêu lưu", "chưa chạy 0013_adventure.sql");
      await page.goto(`${BASE}/student/phieu-luu/ho-so`);
      t("chưa có 0013: hồ sơ báo cần chạy file SQL, không lỗi", await page.getByText(/0013_adventure\.sql/).waitFor({ timeout: 30_000 }).then(() => true, () => false));
    }

    await page.goto(`${BASE}/student/ky-nang`);
    await page.getByRole("heading", { level: 1, name: /Kỹ năng/ }).waitFor({ timeout: 30_000 }).catch(() => {});
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/ky-nang.png`, fullPage: true });
    t("trang Kỹ năng: 6 kỹ năng, chưa đủ dữ liệu thì nói rõ", (await page.getByRole("heading", { level: 2 }).count()) === 6 && (await page.getByText("Chưa đủ dữ liệu").count()) === 6);
    t("trang Kỹ năng nói rõ EXP không làm kỹ năng tăng", await page.getByText(/EXP không làm kỹ năng tăng/).isVisible());
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
    t("điện thoại: mở được bảng chi tiết", await p2.getByRole("dialog").getByText(has0013 ? "Đã nhận EXP" : "Mục tiêu:").isVisible());
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
    t("giáo viên: bảng kỹ năng không có cột EXP hay cấp", !/XP|Cấp/.test(await tp.locator("table").filter({ has: tp.getByRole("rowheader", { name: "Bạn Phiêu Lưu" }) }).locator("thead").innerText()));
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
