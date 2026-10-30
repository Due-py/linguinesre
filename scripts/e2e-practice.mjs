// Thử cả luồng luyện nói bằng trình duyệt thật (Edge) với micro giả, không tốn tiền dịch vụ AI.
// Cần: đã chạy 0001–0005, và web đang chạy với MOCK_AI=1:
//   PowerShell:  $env:MOCK_AI="1"; npx next dev -p 3126
//   Git Bash:    MOCK_AI=1 npx next dev -p 3126
// Rồi: npm run test:e2e
// Tạo học sinh thử + Unit thử (lớp 9, Unit 20) rồi XÓA SẠCH khi xong. Không đụng nội dung thật.
import { chromium } from "@playwright/test";
import { loadEnv, serviceHeaders } from "./lib.mjs";

const env = loadEnv();
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BASE = process.env.BASE_URL ?? "http://localhost:3126";
const EMAIL = "e2e-practice@example.test";
const TEACHER = "e2e-teacher@example.test";
const PW = "Thu-e2e-xyz-123";
const json = { "Content-Type": "application/json" };
const svc = (x = {}) => serviceHeaders(env, x);

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
      const inner = await (await fetch(`${U}/storage/v1/object/list/recordings`, { method: "POST", headers: svc(json), body: JSON.stringify({ prefix: `${u.id}/${f.name}`, limit: 100 }) })).json();
      const paths = (Array.isArray(inner) ? inner : []).map((x) => `${u.id}/${f.name}/${x.name}`);
      if (paths.length) await fetch(`${U}/storage/v1/object/recordings`, { method: "DELETE", headers: svc(json), body: JSON.stringify({ prefixes: paths }) });
    }
    await fetch(`${U}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: svc() });
  }
  await fetch(`${U}/rest/v1/units?grade=eq.9&unit_no=eq.20`, { method: "DELETE", headers: svc() });
}

async function main() {
  await cleanup();
  const r = await fetch(`${U}/auth/v1/admin/users`, { method: "POST", headers: svc(json), body: JSON.stringify({ email: EMAIL, password: PW, email_confirm: true }) });
  const userId = (await r.json()).id;
  const tok = await (await fetch(`${U}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, ...json }, body: JSON.stringify({ email: EMAIL, password: PW }) })).json();
  await fetch(`${U}/rest/v1/rpc/complete_onboarding`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${tok.access_token}`, ...json },
    body: JSON.stringify({ p_role: "student", p_display_name: "Bạn Thử", p_grade: 9, p_goal: null }),
  });

  // Giáo viên thử có một lớp; học sinh thử vào lớp đó (để kiểm tra trang giáo viên ở cuối).
  const tr = await fetch(`${U}/auth/v1/admin/users`, { method: "POST", headers: svc(json), body: JSON.stringify({ email: TEACHER, password: PW, email_confirm: true }) });
  const teacherId = (await tr.json()).id;
  const ttok = await (await fetch(`${U}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, ...json }, body: JSON.stringify({ email: TEACHER, password: PW }) })).json();
  const asTeacher = { apikey: ANON, Authorization: `Bearer ${ttok.access_token}`, ...json };
  await fetch(`${U}/rest/v1/rpc/complete_onboarding`, { method: "POST", headers: asTeacher, body: JSON.stringify({ p_role: "teacher", p_display_name: "Cô Thử", p_grade: null, p_goal: null }) });
  const [cls] = await (await fetch(`${U}/rest/v1/classes?select=id`, { method: "POST", headers: { ...asTeacher, Prefer: "return=representation" }, body: JSON.stringify({ teacher_id: teacherId, name: "Lớp E2E", join_code: "E2EQ23", grade: 9 }) })).json();
  await fetch(`${U}/rest/v1/rpc/join_class`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${tok.access_token}`, ...json }, body: JSON.stringify({ code: "E2EQ23" }) });

  const [unit] = await admin("units?select=id", {
    method: "POST",
    prefer: "return=representation",
    body: { grade: 9, unit_no: 20, title: "E2E Test Unit", title_vi: "Unit thử", topic: "Unit dùng để kiểm tra tự động.", source: "thử", content_hash: "x", status: "approved", reviewed_by: "e2e", reviewed_at: new Date().toISOString() },
  });
  await admin("frames", { method: "POST", body: [{ unit_id: unit.id, key: "f01", text: "I like ___ because ___.", vi: "Mình thích ... vì ...", grammar_note: "like + V-ing", examples: ["I like reading because it is fun."] }] });
  await admin("vocab", { method: "POST", body: [{ unit_id: unit.id, key: "v01", en: "hobby", vi: "sở thích", example: "My hobby is reading." }] });
  await admin("questions", {
    method: "POST",
    body: Array.from({ length: 6 }, (_, i) => ({
      unit_id: unit.id, key: `q0${i + 1}`, text: `What is test question number ${i + 1}?`, difficulty: (i % 3) + 1, kind: "personal",
      keywords: ["hobby", "because"], frame_key: "f01", hint_direction_vi: "Nghĩ về sở thích của bạn.", example_answer: "I like reading.", expects_reason: false,
    })),
  });

  const browser = await chromium.launch({
    channel: "msedge",
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["microphone"] });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30_000);
  const SHOTS = process.env.SHOT_DIR;
  const shot = async (name) => SHOTS && (await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }));
  let mockLabelSeen = false;


  await page.goto(`${BASE}/login?as=email`);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Mật khẩu").fill(PW);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(`${BASE}/student`);
  t("đăng nhập xong vào trang học sinh", true);
  // Lớp 9 đã có Unit thật được duyệt, nên "hôm nay" là Unit đầu tiên chưa học; bài thử luyện trên Unit thử (Unit 20).
  const seen = (loc) => loc.waitFor({ timeout: 15_000 }).then(() => true, () => false);
  t("trang chính gợi ý Unit hôm nay", await seen(page.getByText(/^Hôm nay: /).first()));
  t("lộ trình có Unit thử", await seen(page.getByText("E2E Test Unit").first()));
  await shot("18-hoc-sinh-trang-chinh-co-bai-hom-nay");

  await page.goto(`${BASE}/student/practice/${unit.id}`);
  t("màn giới thiệu có phần khởi động", await page.getByRole("heading", { name: "Khởi động" }).isVisible());
  await shot("19-gioi-thieu-buoi-luyen");
  await page.getByRole("button", { name: "Bắt đầu luyện tập" }).click();
  await page.waitForURL(/\/student\/practice\/session\//);
  const sessionUrl = page.url();

  // started: đã bắt đầu sẵn (nút "Nói lại câu này" đọc câu hỏi và nghe ngay, không cần bấm "Nghe câu hỏi").
  // ai: bấm "Xem nhận xét của AI" sau khi lưu (AI không còn tự chạy cho mọi câu).
  async function answerOne({ hints = 0, shots = false, started = false, ai = false } = {}) {
    if (shots) await shot("14-luyen-noi-san-sang");
    if (!started) await page.getByRole("button", { name: "Nghe câu hỏi" }).click();
    // Micro giả phát tiếng bíp đều nên không có "lúc bắt đầu nói" rõ ràng: bấm dừng bằng tay.
    const stop = page.getByRole("button", { name: /Đang nghe|Xong, gửi câu trả lời/ });
    await stop.waitFor({ timeout: 40_000 });
    for (let i = 0; i < hints; i++) await page.getByRole("button", { name: /gợi ý/i }).click();
    if (shots) await shot("15-luyen-noi-dang-nghe-co-goi-y");
    // Như người thật: nói một lúc rồi mới bấm dừng (bấm ngay thì bản ghi quá ngắn và trang báo lỗi).
    await page.waitForTimeout(1500);
    await stop.click();
    // Lúc đang chép lời có thể thoáng hiện "chưa nghe thấy bạn nói" (micro giả không có lúc bắt đầu nói rõ ràng), nên chỉ
    // khi chờ quá lâu mới in thông báo đang hiện trên trang để biết vì sao.
    await page
      .getByText("Máy nghe được")
      .waitFor()
      .catch(async () => {
        const alerts = await page.getByRole("alert").allInnerTexts();
        throw new Error(`Không thấy kết quả chép lời. Trang đang báo: ${alerts.join(" | ") || "(không có thông báo)"}`);
      });
    mockLabelSeen ||= await page.getByText("Dữ liệu mô phỏng, không phải lời bạn nói").isVisible();
    if (shots) await shot("16-luyen-noi-xem-lai-chu-ghi-loi");
    const box = page.getByRole("textbox");
    await box.fill("I usually play badminton with my friends because it is fun.");
    await page.getByRole("button", { name: "Lưu câu trả lời" }).click();
    await page.getByText(/Đã lưu câu trả lời/).waitFor();
    await page.getByRole("heading", { name: "Đo trực tiếp" }).waitFor();
    if (ai) {
      await page.getByRole("button", { name: "Xem nhận xét của AI" }).click();
      await page.getByRole("heading", { name: "AI nhận xét" }).waitFor();
    }
    if (shots) await shot("17-luyen-noi-da-luu-co-phan-hoi");
  }

  await answerOne({ hints: 2, shots: true, ai: true });
  t("câu 1: nghe, ghi âm, chép lời (mô phỏng), sửa, lưu", true);
  t("có nhãn dữ liệu mô phỏng khi MOCK_AI=1", mockLabelSeen);
  t("có khối 'Đo trực tiếp' tách riêng", await page.getByRole("heading", { name: "Đo trực tiếp" }).isVisible());
  t("ghi rõ phát âm chưa được đánh giá", await page.getByText("Phát âm chưa được đánh giá.").isVisible());
  t("nhận xét mô phỏng có nhãn mô phỏng", await page.getByText("Dữ liệu mô phỏng, không phải nhận xét thật").isVisible());
  t("lỗi bịa của AI bị máy chủ bỏ, không hiện", !(await page.getByText("câu không có trong bài nói").isVisible()));
  t("không so sánh khi mới có một lần", !(await page.getByRole("heading", { name: /So sánh lần/ }).isVisible()));

  // Nói lại câu 1: lưu thành lần 2 và có bảng so sánh.
  await page.getByRole("button", { name: "Nói lại câu này (còn 2 lần)" }).click();
  await answerOne({ started: true });
  t("nói lại câu 1 thành lần 2", await page.getByText("Đã lưu câu trả lời (lần 2).").isVisible());
  t("chưa bấm thì chưa có AI nhận xét, chỉ có nút xem", (await page.getByRole("button", { name: "Xem nhận xét của AI" }).isVisible()) && (await page.getByRole("heading", { name: "AI nhận xét" }).count()) === 0);
  t("có so sánh lần 1 và lần 2 kể cả khi lần 2 chưa có AI nhận xét", await page.getByRole("heading", { name: "So sánh lần 1 và lần 2" }).isVisible());
  await shot("21-noi-lai-co-so-sanh");
  await page.getByRole("button", { name: "Câu tiếp theo" }).click();
  await answerOne();
  t("câu 2 lưu được", true);

  // Đóng giữa chừng rồi mở lại: tiếp tục từ câu 3.
  await page.goto(`${BASE}/student`);
  t("trang chính hiện 'Tiếp tục' với 2/5 câu", await page.getByText("Bạn đã trả lời 2/5 câu.").isVisible());
  await page.goto(sessionUrl);
  t("mở lại buổi thì tiếp tục từ câu 3", await page.getByText("Câu 3/5").isVisible());

  for (let i = 3; i <= 5; i++) {
    await answerOne();
    await page.getByRole("button", { name: i < 5 ? "Câu tiếp theo" : "Xem kết quả" }).click();
  }
  t("trả lời đủ 5 câu thì thấy màn kết thúc", await page.getByText("Bạn đã trả lời đủ 5 câu").isVisible());
  await shot("20-ket-thuc-buoi-luyen");

  // Tổng kết (M6).
  await page.getByRole("button", { name: "Xem tổng kết buổi luyện" }).click();
  await page.waitForURL(/\/student\/sessions\/[0-9a-f-]{36}$/);
  t("mở trang tổng kết", await page.getByRole("heading", { name: "Tổng kết: E2E Test Unit" }).isVisible());
  t("tổng kết ghi buổi đã hoàn thành", await page.getByText("Đã hoàn thành").isVisible());
  t("tổng kết có mục tiêu cho buổi sau kèm căn cứ", (await page.getByText("Mục tiêu cho buổi sau").isVisible()) && (await page.getByText(/Căn cứ \(đo trực tiếp\)/).isVisible()));
  // AI theo yêu cầu: tổng kết tính lần trả lời cuối của mỗi câu, các lần này chưa bấm xem nên chưa có nhận xét.
  t("tổng kết ghi rõ câu nào chưa có nhận xét AI", await page.getByText("chưa có nhận xét").first().isVisible());
  t("tổng kết có 5 câu", (await page.locator("section[aria-labelledby=answers] ol > li").count()) === 5);
  await page.locator("summary").first().click();
  t("câu 1 hiện lần trả lời cuối là lần 2", await page.getByText("Lần 2 (lần cuối)").isVisible());
  t("câu 1 có trình phát bản ghi để nghe lại", (await page.locator("details[open] audio").count()) === 1);
  t("tổng kết cho xin nhận xét AI ngay tại đó (ô câu 1 đang mở)", await seen(page.locator("details[open]").getByRole("button", { name: "Xem nhận xét của AI" })));
  await shot("22-tong-ket-buoi-luyen");

  await page.getByRole("link", { name: "Lịch sử", exact: true }).click();
  await page.waitForURL(`${BASE}/student/history`);
  t("lịch sử có buổi vừa hoàn thành", await page.getByText("Hoàn thành").first().isVisible());
  await shot("23-lich-su");

  await page.getByRole("link", { name: "Tổng quan", exact: true }).click();
  await page.waitForURL(`${BASE}/student`);
  t("dashboard: Unit thử đã xong", await page.getByText("Đã xong").isVisible());
  t("dashboard: chưa đủ 3 buổi thì không kết luận điểm cần cải thiện", await page.getByText("Bạn đã hoàn thành 1/3 buổi.").isVisible());
  t("dashboard: buổi gần đây có buổi vừa xong", await page.locator("section[aria-labelledby=recent]").getByText("Hoàn thành").isVisible());
  await shot("24-hoc-sinh-trang-chinh-sau-buoi-dau");

  // Giáo viên của lớp xem buổi luyện của học sinh (chỉ xem).
  const tctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const tp = await tctx.newPage();
  tp.setDefaultTimeout(30_000);
  await tp.goto(`${BASE}/login?as=email`);
  await tp.getByLabel("Email").fill(TEACHER);
  await tp.getByLabel("Mật khẩu").fill(PW);
  await tp.getByRole("button", { name: "Đăng nhập" }).click();
  await tp.waitForURL(`${BASE}/teacher`);
  await tp.goto(`${BASE}/teacher/classes/${cls.id}`);
  t("giáo viên: trang lớp hiện số buổi hoàn thành của học sinh", await tp.getByText(/1 buổi hoàn thành, luyện gần nhất/).isVisible());
  await tp.getByRole("link", { name: "Bạn Thử" }).click();
  await tp.waitForURL(/\/teacher\/students\//);
  t("giáo viên: thấy danh sách buổi của học sinh", await tp.getByText("Hoàn thành").first().isVisible());
  await tp.getByRole("link", { name: /E2E Test Unit/ }).click();
  await tp.waitForURL(/\/teacher\/sessions\//);
  t("giáo viên: mở được buổi luyện của học sinh", await tp.getByRole("heading", { name: "Bạn Thử: E2E Test Unit" }).isVisible());
  t("giáo viên: thấy mục tiêu gợi ý cho học sinh", await tp.getByText("Mục tiêu gợi ý cho học sinh").isVisible());
  await tp.locator("summary").first().click();
  t("giáo viên: xem được chữ ghi lời và nhận xét", await tp.locator("details[open]").getByRole("heading", { name: "AI nhận xét" }).isVisible());
  t("giáo viên: không có nút gọi AI", (await tp.getByRole("button", { name: "Thử lấy nhận xét lại" }).count()) === 0);
  if (SHOTS) await tp.screenshot({ path: `${SHOTS}/25-giao-vien-xem-buoi.png`, fullPage: true });
  const sessionPath = new URL(tp.url()).pathname;
  await tctx.close();

  // Học sinh không mở được trang giáo viên; giáo viên lớp khác không thấy buổi (RLS, xem test:sessions).
  await page.goto(`${BASE}${sessionPath}`);
  // Có trang "đang tải" nên lệnh chuyển hướng chạy sau khi khung trang đã hiện: chờ đường dẫn đổi.
  const moved = await page.waitForURL((u) => !u.pathname.startsWith("/teacher/"), { timeout: 15_000 }).then(() => true, () => false);
  t("học sinh vào trang giáo viên thì bị chuyển đi", moved && (await page.getByText("Bạn Thử: E2E Test Unit").count()) === 0);

  const answers = await admin(`session_answers?select=id,attempt_no,hint_level,transcript_edited,transcript_final,audio_path&student_id=eq.${userId}&order=created_at`);
  t("có đúng 6 câu trả lời trong CSDL (5 câu, câu 1 nói 2 lần)", answers.length === 6, `${answers.length}`);
  t("lần nói lại được lưu với attempt_no = 2", answers[1]?.attempt_no === 2, `${answers[1]?.attempt_no}`);
  const feedback = await admin(`answer_feedback?select=answer_id,status,model,payload&student_id=eq.${userId}`);
  t("chỉ câu đã bấm xem mới gọi AI (1 trong 6 lần trả lời)", feedback.length === 1 && feedback.every((f) => f.status === "ok" && f.model === "mock"), `${feedback.length}`);
  t("máy chủ đã bỏ lỗi bịa trước khi lưu", feedback.every((f) => f.payload.feedback.dropped_issues === 1 && f.payload.feedback.grammar.issues.length === 1));
  t("câu 1 ghi mức gợi ý 2", answers[0]?.hint_level === 2, `${answers[0]?.hint_level}`);
  t("chữ học sinh sửa được lưu và đánh dấu đã sửa", answers.every((a) => a.transcript_edited && a.transcript_final.includes("badminton")));
  t("mỗi câu có file ghi âm trong thư mục của học sinh", answers.every((a) => a.audio_path?.startsWith(`${userId}/`)));
  const [s] = await admin(`practice_sessions?select=status,completed_at&student_id=eq.${userId}`);
  t("buổi đã chuyển sang 'completed' trong CSDL", s?.status === "completed" && !!s.completed_at);

  await browser.close();
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
