// Tạo tài khoản học sinh tham gia nghiên cứu hàng loạt, xuất phiếu đăng nhập (mã + PIN) để in.
//
// Chạy: npm run research:students -- files/research/hoc-sinh.csv
//   File CSV gồm cột: code,grade,form_order[,pilot]
//     code        mã học sinh, VD HS008 (KHÔNG ghi họ tên)
//     grade       khối lớp, VD 8
//     form_order  AB hoặc BA, theo kết quả bốc thăm thứ tự đề (mục 3.5, tối 01/11)
//     pilot       1 nếu là học sinh thử đề (làm cả hai đề liền nhau, không đưa vào phân tích); bỏ trống = 0
// Cấp lại PIN cho một bạn quên: npm run research:students -- --reset HS008
//
// Phiếu PIN ghi vào files/research/ (thư mục không đưa lên GitHub). PIN không in ra màn hình.
import { admin, createParticipant, newPin, readCsv, stamp, writeCsv } from "./research-lib.mjs";
import { codeEmail, normalizeCode } from "../src/lib/research/code.ts";

const args = process.argv.slice(2);

if (args[0] === "--reset") {
  const code = normalizeCode(args[1] ?? "");
  if (!code) throw new Error("Cần mã học sinh, VD: --reset HS008");
  const { data } = await admin.from("research_participants").select("student_id").eq("code", code).maybeSingle();
  if (!data) throw new Error(`Không có học sinh ${code}`);
  const pin = newPin();
  const { error } = await admin.auth.admin.updateUserById(data.student_id, { password: pin });
  if (error) throw new Error(error.message);
  const file = writeCsv(`pin-cap-lai-${code}-${stamp()}.csv`, [{ ma_hoc_sinh: code, pin }]);
  console.log(`Đã cấp PIN mới cho ${code}. Phiếu: ${file}`);
  process.exit(0);
}

const path = args[0];
if (!path) {
  console.log("Cách dùng: npm run research:students -- files/research/hoc-sinh.csv   (xem đầu file script)");
  process.exit(1);
}
const rows = readCsv(path);
const { data: existing } = await admin.from("research_participants").select("code");
const have = new Set((existing ?? []).map((r) => r.code));

const out = [];
let skipped = 0;
let failed = 0;
for (const r of rows) {
  const code = normalizeCode(r.code ?? "");
  if (code && have.has(code)) {
    skipped++;
    continue;
  }
  try {
    const p = await createParticipant({ code: r.code, grade: r.grade, formOrder: (r.form_order ?? "").toUpperCase(), pilot: r.pilot === "1" });
    out.push({ ma_hoc_sinh: p.code, pin: p.pin, khoi: r.grade, dang_nhap_tai: "/login" });
    console.log(`ĐÃ TẠO ${p.code}`);
  } catch (e) {
    failed++;
    console.log(`LỖI ${e.message}`);
  }
}
if (out.length) console.log(`\nPhiếu đăng nhập (mã + PIN) để in: ${writeCsv(`phieu-dang-nhap-${stamp()}.csv`, out)}`);
console.log(`Tạo mới ${out.length}, bỏ qua ${skipped} mã đã có, lỗi ${failed}. Email nội bộ dạng ${codeEmail("HS000")} (không nhận thư).`);
process.exit(failed ? 1 : 0);
