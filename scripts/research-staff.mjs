// Cấp / bỏ quyền mở trang thống kê nghiên cứu /research. Người giữ danh sách chạy trên máy (cần khóa máy chủ).
//
// Chạy: npm run research:staff                                 → xem danh sách
//       npm run research:staff -- add <email> blind [ghi chú]  → xem mù (không thấy nhóm A/B)
//       npm run research:staff -- add <email> key [ghi chú]    → giữ danh sách (thấy so sánh A/B)
//       npm run research:staff -- remove <email>
// Tài khoản phải là tài khoản email đã đăng nhập web ít nhất một lần (tài khoản giáo viên). Không dùng mã học sinh.
// Người chấm mù (Duy, Hiệu) chỉ được cấp mức blind (Quy trình mục 2.3, 3.6).
import { admin } from "./research-lib.mjs";
import { isCodeEmail } from "../src/lib/research/code.ts";

const [cmd, emailArg, level, ...rest] = process.argv.slice(2);

async function findUser(email) {
  const want = email.trim().toLowerCase();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const u = data.users.find((x) => x.email?.toLowerCase() === want);
    if (u) return u;
    if (data.users.length < 200) return null;
  }
  return null;
}

if (cmd === "add" || cmd === "remove") {
  if (!emailArg) throw new Error("Thiếu email");
  if (isCodeEmail(emailArg)) throw new Error("Không cấp quyền nghiên cứu cho tài khoản học sinh.");
  const user = await findUser(emailArg);
  if (!user) throw new Error(`Không có tài khoản ${emailArg}. Người đó cần đăng ký và đăng nhập web trước.`);
  if (cmd === "add") {
    if (!["blind", "key"].includes(level)) throw new Error("Mức phải là blind hoặc key");
    const { data: profile } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (!profile) throw new Error("Tài khoản chưa hoàn tất đăng ký (chưa có hồ sơ).");
    const { error } = await admin.from("research_staff").upsert({ user_id: user.id, level, label: rest.join(" ").slice(0, 60) || null });
    if (error) throw new Error(error.message);
    console.log(`Đã cấp mức ${level} cho ${emailArg}.`);
  } else {
    const { error } = await admin.from("research_staff").delete().eq("user_id", user.id);
    if (error) throw new Error(error.message);
    console.log(`Đã bỏ quyền của ${emailArg}.`);
  }
}

const { data: staff, error } = await admin.from("research_staff").select("user_id, level, label, created_at");
if (error) throw new Error(`${error.message} (đã chạy migration 0015 chưa?)`);
console.log(`\nNhóm nghiên cứu (${staff.length} người):`);
for (const s of staff) {
  const { data } = await admin.auth.admin.getUserById(s.user_id);
  console.log(`  ${s.level.padEnd(5)}  ${data.user?.email ?? s.user_id}  ${s.label ?? ""}`);
}
