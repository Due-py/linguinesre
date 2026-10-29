// Thử cả bài kiểm tra phản xạ nói bằng trình duyệt thật (Edge), micro giả phát IM LẶNG, không tốn tiền dịch vụ AI.
// Cần: đã chạy 0001–0006, npm run research:seed-tests, và web chạy với MOCK_AI=1 ở cổng 3126:
//   Git Bash:  MOCK_AI=1 npx next dev -p 3126
// Rồi: npm run test:e2e-test     (mất khoảng 4 phút: 17 câu, mỗi câu im lặng tự dừng sau 10 giây)
// Tạo học sinh thử ZZ903 (thử đề, nên làm được cả hai lần liền nhau) rồi XÓA SẠCH khi xong.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { admin, createParticipant, deleteParticipant, RESEARCH_DIR } from "./research-lib.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3126";
const CODE = "ZZ903";
let fail = 0;
const t = (n, ok, extra = "") => {
  console.log((ok ? "ĐẠT " : "HỎNG ") + n + (extra ? ` (${extra})` : ""));
  if (!ok) fail++;
};

/** File WAV im lặng 30 giây cho micro giả (để kiểm tra luật "im lặng 10 giây thì sang câu sau"). */
function silentWav() {
  const rate = 16000;
  const n = rate * 30;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  mkdirSync(RESEARCH_DIR, { recursive: true });
  const path = join(RESEARCH_DIR, "e2e-im-lang.wav");
  writeFileSync(path, buf);
  return path;
}

async function main() {
  await deleteParticipant(CODE);
  const p = await createParticipant({ code: CODE, grade: 8, formOrder: "BA", pilot: true });

  const browser = await chromium.launch({
    channel: "msedge",
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${silentWav()}`],
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["microphone"] });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30_000);

  await page.goto(`${BASE}/login`);
  await page.getByLabel("Mã học sinh").fill("zz 903");
  await page.getByLabel("PIN").fill("000000" === p.pin ? "111111" : "000000");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  // Chờ máy chủ trả lời: sau khi gửi, form tự xóa ô PIN, nên phải điền PIN đúng SAU khi thông báo hiện ra.
  const wrongPin = await page
    .getByText("Mã học sinh hoặc PIN chưa đúng")
    .waitFor({ timeout: 10_000 })
    .then(() => true, () => false);
  t("PIN sai thì báo lỗi, không vào được", wrongPin && page.url() === `${BASE}/login`);
  await page.getByLabel("PIN").fill(p.pin);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(`${BASE}/student`);
  t("đăng nhập bằng mã (gõ chữ thường, có dấu cách) + PIN", true);
  t("trang chính chỉ hiện bài kiểm tra lần 1", await page.getByRole("heading", { name: "Bài kiểm tra nói lần 1" }).isVisible());
  t("trang chính gọi học sinh bằng mã, không có họ tên", await page.getByText(`Chào ${CODE},`).isVisible());

  await page.goto(`${BASE}/student/practice`);
  t("chưa chia nhóm thì chưa vào được trang luyện", page.url() === `${BASE}/student`);

  await page.getByRole("link", { name: "Mở bài kiểm tra" }).click();
  await page.getByRole("button", { name: "Bắt đầu bài kiểm tra" }).click();
  await page.getByRole("button", { name: "Bật micro" }).click();
  await page.getByRole("button", { name: "Bắt đầu câu làm mẫu" }).click();
  await page.getByText("How are you today?").waitFor();
  t("câu làm mẫu 1 hiện chữ câu hỏi", await page.getByText("Câu làm mẫu 1/2").isVisible());
  t("không có đồng hồ đếm ngược", (await page.getByText(/giây|\d+s\b/).count()) === 0);
  await page.getByRole("heading", { name: "Xong phần làm mẫu" }).waitFor({ timeout: 90_000 });
  t("hai câu làm mẫu xong thì dừng chờ bắt đầu bài thật", true);

  const started = Date.now();
  await page.getByRole("button", { name: "Bắt đầu bài thật" }).click();
  await page.getByText("Câu 1/15").waitFor();
  await page.getByRole("heading", { name: "Bạn đã làm xong bài kiểm tra" }).waitFor({ timeout: 15 * 25_000 });
  const perItem = (Date.now() - started) / 15 / 1000;
  t("15 câu tự chạy hết, không cần bấm", true);
  t("15 câu chạy hết trong thời gian hợp lý", perItem > 9 && perItem < 25, `${perItem.toFixed(1)} giây/câu, gồm cả thời gian chờ máy chủ`);

  // Dữ liệu trong CSDL (đọc bằng khóa máy chủ).
  await new Promise((r) => setTimeout(r, 3000)); // chờ phần chép lời chạy sau (after)
  const { data: who } = await admin.from("research_participants").select("student_id").eq("code", CODE).single();
  const { data: att } = await admin.from("test_attempts").select("id, phase, form, status").eq("student_id", who.student_id);
  t("lượt đầu vào đã xong, đúng đề B (thứ tự BA)", att?.length === 1 && att[0].form === "B" && att[0].status === "completed");
  const { data: resp } = await admin.from("test_responses").select("form, position, rl_ms, rl_status, beep_end_ms, duration_ms, audio_path").eq("attempt_id", att[0].id).order("position");
  t("có đủ 17 bản ghi (2 mẫu + 15 câu)", resp?.length === 17, `${resp?.length}`);
  t(
    "im lặng thì tự dừng ghi sau 10 giây kể từ hết bíp",
    resp?.every((r) => r.duration_ms - r.beep_end_ms >= 10_000 && r.duration_ms - r.beep_end_ms <= 11_000),
    `${Math.min(...resp.map((r) => r.duration_ms))}–${Math.max(...resp.map((r) => r.duration_ms))} ms`,
  );
  t("câu làm mẫu được đánh dấu riêng", resp?.filter((r) => r.form === "W").length === 2);
  t("mốc hết tiếng bíp ghi trong từng dòng (khoảng 0,45 giây)", resp?.every((r) => r.beep_end_ms >= 400 && r.beep_end_ms <= 600));
  t("đo RL bằng mốc từ: bỏ 'um', RL = 1,2 giây (dữ liệu mô phỏng)", resp?.every((r) => r.rl_status === "ok" && r.rl_ms === 1200));
  t("file ghi âm đặt tên theo mã HS và số câu", resp?.every((r) => r.audio_path.startsWith(`${CODE}/pre-B/`)));
  const { data: file } = await admin.storage.from("test-recordings").download(resp[2].audio_path);
  t("file ghi âm có trong kho bài kiểm tra", (file?.size ?? 0) > 1000, `${file?.size} byte`);

  await page.getByRole("link", { name: "Về trang chính" }).click();
  const second = await page
    .getByRole("heading", { name: "Bài kiểm tra nói lần 2" })
    .waitFor()
    .then(() => true, () => false);
  t("học sinh thử đề: bài lần 2 mở ngay sau lần 1", second);
  await browser.close();
}

try {
  await main();
} catch (e) {
  console.error("LỖI khi chạy:", e.message);
  fail++;
} finally {
  await deleteParticipant(CODE);
  console.log("Đã dọn học sinh thử và file ghi âm.");
}
console.log(fail ? `${fail} hỏng` : "Tất cả đạt");
process.exit(fail ? 1 : 0);
