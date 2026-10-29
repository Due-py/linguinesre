// Thử XÓA TÀI KHOẢN bằng trình duyệt thật (M7): tạo học sinh thử ZZ908 có file ghi âm ở cả 3 kho, đăng nhập, vào
// Tài khoản, xóa, rồi kiểm tra tài khoản, dữ liệu và file đều đã mất. Không tốn tiền dịch vụ AI.
// Cần web đang chạy (BASE_URL, mặc định http://localhost:3126). Chạy: npm run test:e2e-account
import { chromium } from "@playwright/test";
import { admin, createParticipant, deleteParticipant } from "./research-lib.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3126";
const CODE = "ZZ908";
let fail = 0;
const t = (n, ok, extra = "") => {
  console.log((ok ? "ĐẠT " : "HỎNG ") + n + (extra ? ` (${extra})` : ""));
  if (!ok) fail++;
};

async function main() {
  await deleteParticipant(CODE);
  const p = await createParticipant({ code: CODE, grade: 8, formOrder: "AB" });
  const file = new Uint8Array(600);
  const paths = [
    ["recordings", `${p.id}/buoi-thu/a.webm`],
    ["test-recordings", `${CODE}/pre-A/01-cau-x.webm`],
    ["mode-recordings", `${CODE}/buoi-01/00-vocab-1.webm`],
  ];
  for (const [b, path] of paths) await admin.storage.from(b).upload(path, file, { contentType: "audio/webm", upsert: true });
  await admin.from("test_attempts").insert({ student_id: p.id, phase: "pre", form: "A" });

  const browser = await chromium.launch({ channel: "msedge" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(30_000);
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Mã học sinh").fill(CODE);
  await page.getByLabel("PIN").fill(p.pin);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(`${BASE}/student`);
  await page.getByRole("link", { name: "Tài khoản" }).click();
  await page.getByRole("heading", { name: "Tài khoản", exact: true }).waitFor();
  t("trang Tài khoản hiện mã học sinh", await page.locator("dd", { hasText: CODE }).isVisible());
  t("nhắc người tham gia nghiên cứu về quyền rút lui", await page.getByText("Bạn có quyền rút lui").isVisible());

  await page.getByRole("button", { name: "Xóa tài khoản và toàn bộ dữ liệu" }).click();
  await page.getByText("Gõ đúng chữ xoa").waitFor();
  t("chưa gõ xác nhận thì không xóa", true);

  await page.getByLabel(/Gõ chữ/).fill("XOA");
  await page.getByRole("button", { name: "Xóa tài khoản và toàn bộ dữ liệu" }).click();
  await page.waitForURL(`${BASE}/da-xoa`);
  t("xóa xong thì sang trang báo đã xóa", true);
  await page.goto(`${BASE}/student`);
  t("đã đăng xuất (vào trang học sinh thì về đăng nhập)", page.url().startsWith(`${BASE}/login`));
  await browser.close();

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  t("tài khoản đăng nhập đã bị xóa", !users.users.some((u) => u.id === p.id));
  const [{ data: prof }, { data: part }, { data: att }] = await Promise.all([
    admin.from("profiles").select("id").eq("id", p.id),
    admin.from("research_participants").select("code").eq("code", CODE),
    admin.from("test_attempts").select("id").eq("student_id", p.id),
  ]);
  t("hồ sơ, dòng tham gia, bài kiểm tra đã bị xóa theo", prof.length === 0 && part.length === 0 && att.length === 0);
  for (const [b, path] of paths) {
    const { data } = await admin.storage.from(b).download(path);
    t(`file ghi âm trong kho ${b} đã bị xóa`, !data);
  }
}

try {
  await main();
} catch (e) {
  console.error("LỖI khi chạy:", e.message);
  fail++;
} finally {
  await deleteParticipant(CODE);
}
console.log(fail ? `${fail} hỏng` : "Tất cả đạt");
process.exit(fail ? 1 : 0);
