// Ghi nhận thầy cô đã duyệt một Learning Module (sau khi đọc kỹ ở trang /teacher/modules/<id>).
// Chạy: npm run module:approve -- 8 7 "Cô Vân"
//       npm run module:approve -- 8 7 --revoke     (về "nhóm đã kiểm tra")
import { loadEnv, serviceHeaders } from "./lib.mjs";

const [grade, unit, who] = process.argv.slice(2);
if (!/^\d+$/.test(grade ?? "") || !/^\d+$/.test(unit ?? "") || !who) {
  console.log('Cách dùng: npm run module:approve -- <khối> <unit> "<người duyệt>"   hoặc   ... <khối> <unit> --revoke');
  process.exit(1);
}
const env = loadEnv();
const revoke = who === "--revoke";
const body = revoke
  ? { status: "team_checked", reviewed_by: null, reviewed_at: null }
  : { status: "teacher_approved", reviewed_by: who, reviewed_at: new Date().toISOString() };
const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/modules?grade=eq.${grade}&unit_no=eq.${unit}&select=title`, {
  method: "PATCH",
  headers: serviceHeaders(env, { Prefer: "return=representation" }),
  body: JSON.stringify(body),
});
const rows = await res.json();
if (!res.ok || !Array.isArray(rows) || rows.length === 0) {
  console.log(`Không tìm thấy module lớp ${grade} Unit ${unit}. Đã chạy npm run module:seed chưa?`);
  process.exit(1);
}
console.log(revoke ? `Đã đưa "${rows[0].title}" về "nhóm đã kiểm tra".` : `Đã ghi nhận "${rows[0].title}" được duyệt bởi ${who}.`);
