// Thử cả buổi luyện CHẾ ĐỘ A và CHẾ ĐỘ B bằng trình duyệt thật (Edge, micro giả), không tốn tiền dịch vụ AI.
// Cần: đã chạy 0001–0008, nội dung lớp 8 đã nạp và duyệt, và web chạy với MOCK_AI=1 ở cổng 3126:
//   Git Bash:  MOCK_AI=1 npx next dev -p 3126
// Rồi: npm run test:e2e-modes     (khoảng 5 phút)
// Tạo 3 học sinh thử ZZ904 (A), ZZ905 (B), ZZ906 (đã chia nhóm nhưng chưa mở luyện) rồi XÓA SẠCH khi xong.
import { chromium } from "@playwright/test";
import { admin, createParticipant, deleteParticipant } from "./research-lib.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3126";
const CODES = { A: "ZZ904", B: "ZZ905", WAIT: "ZZ906" };
let fail = 0;
const t = (n, ok, extra = "") => {
  console.log((ok ? "ĐẠT " : "HỎNG ") + n + (extra ? ` (${extra})` : ""));
  if (!ok) fail++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Trang có khung "đang tải" nên nội dung hiện sau một chút: chờ tối đa 15 giây. */
const seen = (loc) => loc.waitFor({ timeout: 15_000 }).then(() => true, () => false);

/** Người tham gia đã làm xong cả hai bài kiểm tra (để không còn bài nào đến hạn), đã chia nhóm. */
async function participant(code, arm, pilot) {
  await deleteParticipant(code);
  const p = await createParticipant({ code, grade: 8, formOrder: "AB", pilot });
  const now = new Date().toISOString();
  const { error } = await admin.from("test_attempts").insert([
    { student_id: p.id, phase: "pre", form: "A", status: "completed", completed_at: now },
    { student_id: p.id, phase: "post", form: "B", status: "completed", completed_at: now },
  ]);
  if (error) throw new Error(error.message);
  await admin.from("research_participants").update({ arm }).eq("student_id", p.id);
  return p;
}

async function login(ctx, code, pin) {
  const page = await ctx.newPage();
  page.setDefaultTimeout(30_000);
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Mã học sinh").fill(code);
  await page.getByLabel("PIN").fill(pin);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(`${BASE}/student`);
  return page;
}

async function checkin(page) {
  await page.getByRole("heading", { name: "Câu hỏi của tuần" }).waitFor();
  t("phải trả lời câu hỏi của tuần trước khi luyện", (await page.getByRole("button", { name: /Bắt đầu buổi/ }).count()) === 0);
  await page.getByLabel("Có", { exact: true }).check();
  await page.locator('input[name="detail"]').fill("trung tâm tiếng Anh");
  await page.getByRole("button", { name: "Gửi câu trả lời" }).click();
  await page.getByRole("button", { name: "Bắt đầu buổi 1" }).waitFor();
}

/** Đi hết buổi chế độ A: bấm nút đang hiện; lúc ghi âm thì chờ 1,5 giây rồi bấm "Xong". */
async function runModeA(page) {
  let aiAsked = false;
  const btn = (name) => page.getByRole("button", { name, exact: true });
  for (let guard = 0; guard < 400; guard++) {
    if (await page.getByRole("heading", { name: "Xong buổi luyện hôm nay" }).isVisible()) return true;
    if (await page.getByRole("alert").filter({ hasText: "Chưa gửi được" }).isVisible()) return false;
    if (await btn("Xong").isVisible()) {
      await sleep(1500);
      await btn("Xong").click().catch(() => {});
    } else if (!aiAsked && (await btn("Xem AI nhận xét").isVisible())) {
      aiAsked = true;
      await btn("Xem AI nhận xét").click();
      await page.getByText("Dữ liệu mô phỏng", { exact: false }).first().waitFor();
      t("tầng L2 có AI nhận xét (mô phỏng, có nhãn)", true);
    } else {
      let clicked = false;
      for (const name of ["Nghe mẫu rồi nói theo", "Tiếp", "Kết thúc buổi luyện", "Sẵn sàng nói", "Nói theo", "Nghe và trả lời", "Bắt đầu"]) {
        if (await btn(name).isVisible()) {
          await btn(name).click().catch(() => {});
          clicked = true;
          break;
        }
      }
      if (!clicked) await sleep(300);
    }
  }
  return false;
}

async function main() {
  const pa = await participant(CODES.A, "A", true);
  const pb = await participant(CODES.B, "B", true);
  const pw = await participant(CODES.WAIT, "A", false);
  const { data: open } = await admin.from("research_settings").select("value").eq("key", "practice_open").single();

  const browser = await chromium.launch({ channel: "msedge", args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["microphone"] });

  // ---- Chưa mở giai đoạn luyện ----
  if (open?.value !== true) {
    const page = await login(ctx, pw.code, pw.pin);
    t("chưa mở giai đoạn luyện: chỉ thấy trang chờ", await seen(page.getByText("Giai đoạn luyện tập chưa bắt đầu")));
    await page.goto(`${BASE}/student/practice`);
    const back = await page.waitForURL(`${BASE}/student`, { timeout: 15_000 }).then(() => true, () => false);
    t("người tham gia không vào được trang luyện tự do", back);
    await ctx.clearCookies();
  }

  // ---- Chế độ A ----
  let page = await login(ctx, pa.code, pa.pin);
  t("trang chính hiện Chế độ A", await seen(page.getByRole("heading", { name: "Chế độ A: luyện phản xạ nói" })));
  await checkin(page);
  await page.getByRole("button", { name: "Bắt đầu buổi 1" }).click();
  await page.waitForURL(/\/student\/luyen\//);
  await page.getByRole("button", { name: "Bật micro" }).click();
  const started = Date.now();
  const doneA = await runModeA(page);
  t("đi hết buổi chế độ A (L0 → L3)", doneA, `${Math.round((Date.now() - started) / 1000)} giây`);

  const { data: sa } = await admin.from("mode_sessions").select("id, mode, session_no, unit_no, status, active_ms, plan").eq("student_id", pa.id).single();
  const { data: ta } = await admin.from("mode_turns").select("*").eq("session_id", sa.id).order("created_at");
  const by = (a) => ta.filter((x) => x.activity === a);
  t("buổi A: đã lưu, Unit 1, buổi số 1", sa.status === "completed" && sa.unit_no === 1 && sa.session_no === 1);
  t("L0: mỗi từ có lượt nhớ lại và lượt nói theo mẫu", by("vocab").length === 12 && by("vocab").filter((x) => x.attempt_no === 2).length === 6);
  t("đủ lượt các tầng (khung câu 3, Speed 6, mở rộng 3, hội thoại 4, nói đoạn 1)", [by("frame"), by("speed"), by("expand"), by("roleplay"), by("talk")].map((x) => x.length).join() === "3,6,3,4,1");
  const limits = by("speed").map((x) => x.time_limit_ms);
  t("Speed Q&A: kịp 3 câu ở 5 giây thì xuống 3 giây (máy chủ tự tính)", limits.join() === "5000,5000,5000,3000,3000,3000", limits.join());
  t("RL đo từ mốc từ, bỏ 'um' (mô phỏng 1,2 giây), đánh dấu kịp giờ", by("speed").every((x) => x.rl_ms === 1200 && x.in_limit === true));
  t("mỗi lượt có tầng, mã nội dung, file ghi âm", ta.every((x) => x.layer && x.item_ref && x.audio_path.startsWith(`${pa.code}/buoi-01/`)));
  t("có AI nhận xét được lưu cho lượt L2", by("expand").some((x) => x.feedback?.mock === true));
  t("đếm được thời gian luyện", sa.active_ms > 0, `${sa.active_ms} ms`);
  const { data: file } = await admin.storage.from("mode-recordings").download(ta[0].audio_path);
  t("file ghi âm có trong kho chế độ luyện", (file?.size ?? 0) > 200, `${file?.size} byte`);
  const { data: ck } = await admin.from("weekly_checkins").select("practised_elsewhere, detail").eq("student_id", pa.id).single();
  t("lưu câu trả lời hằng tuần", ck?.practised_elsewhere === true && ck.detail === "trung tâm tiếng Anh");
  await page.getByRole("link", { name: "Về trang chính" }).click();
  await page.getByText("Đã xong 1 buổi").waitFor();
  t("trang chính đếm buổi đã xong", true);
  await ctx.clearCookies();

  // ---- Chế độ B ----
  page = await login(ctx, pb.code, pb.pin);
  t("trang chính hiện Chế độ B", await seen(page.getByRole("heading", { name: "Chế độ B: đọc to" })));
  await checkin(page);
  await page.getByRole("button", { name: "Bắt đầu buổi 1" }).click();
  await page.waitForURL(/\/student\/luyen\//);
  await page.getByRole("button", { name: "Bật micro" }).click();
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  t("chế độ B không có gợi ý và không có AI", (await page.getByRole("button", { name: /Gợi ý|AI/ }).count()) === 0);
  for (let i = 0; i < 8; i++) {
    await page.getByRole("button", { name: "Bắt đầu đọc" }).click();
    await sleep(1500);
    await page.getByRole("button", { name: "Đọc xong" }).click();
    if (i < 7) await page.getByRole("button", { name: "Bắt đầu đọc" }).waitFor();
  }
  await page.getByRole("heading", { name: "Xong buổi luyện hôm nay" }).waitFor();
  const { data: sb } = await admin.from("mode_sessions").select("id, status").eq("student_id", pb.id).single();
  const { data: tb } = await admin.from("mode_turns").select("activity, layer, rl_status, item_ref").eq("session_id", sb.id);
  t("buổi B: 4 bài × 2 lần đọc, không đo RL", sb.status === "completed" && tb.length === 8 && tb.every((x) => x.activity === "read_aloud" && x.layer === null && x.rl_status === "not_measured"));
  await browser.close();
}

try {
  await main();
} catch (e) {
  console.error("LỖI khi chạy:", e.message);
  fail++;
} finally {
  for (const c of Object.values(CODES)) await deleteParticipant(c);
  console.log("Đã dọn học sinh thử và file ghi âm.");
}
console.log(fail ? `${fail} hỏng` : "Tất cả đạt");
process.exit(fail ? 1 : 0);
