// Duyệt một Unit sau khi người có chuyên môn đã đọc kỹ nội dung. Chỉ Unit đã duyệt mới hiện cho học sinh.
// Chạy: npm run content:approve -- 8 1 "Cô Vân"
//       npm run content:approve -- 8 1 --revoke     (đưa về nháp)
import { loadEnv, serviceHeaders } from "./lib.mjs";

const [grade, unit, who] = process.argv.slice(2);
if (!/^\d+$/.test(grade ?? "") || !/^\d+$/.test(unit ?? "") || !who) {
  console.log('Cách dùng: npm run content:approve -- <khối> <unit> "<người duyệt>"   hoặc   ... <khối> <unit> --revoke');
  process.exit(1);
}
const env = loadEnv();
const revoke = who === "--revoke";
const body = revoke
  ? { status: "draft", reviewed_by: null, reviewed_at: null }
  : { status: "approved", reviewed_by: who, reviewed_at: new Date().toISOString() };

const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/units?grade=eq.${grade}&unit_no=eq.${unit}&select=title,status`, {
  method: "PATCH",
  headers: serviceHeaders(env, { Prefer: "return=representation" }),
  body: JSON.stringify(body),
});
const rows = await res.json();
if (!res.ok || !Array.isArray(rows) || rows.length === 0) {
  console.log(`Không tìm thấy lớp ${grade} Unit ${unit} trong cơ sở dữ liệu. Đã chạy npm run content:seed chưa?`);
  process.exit(1);
}
console.log(revoke ? `Đã đưa "${rows[0].title}" về nháp.` : `Đã duyệt "${rows[0].title}" (người duyệt: ${who}). Học sinh lớp ${grade} giờ thấy Unit này.`);
