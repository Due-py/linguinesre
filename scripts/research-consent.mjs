// Ghi nhận phiếu đồng ý (bản giấy) và việc rút khỏi nghiên cứu. Người giữ danh sách chạy trên máy.
//
// Chạy: npm run research:consent -- files/research/dong-y.csv
//   File CSV gồm cột: code,phu_huynh,hoc_sinh[,rut_lui,du_lieu,ghi_chu]
//     code       mã học sinh (FBG20124)
//     phu_huynh  ngày phụ huynh ký, dạng 2026-11-12 (bỏ trống = chưa có)
//     hoc_sinh   ngày học sinh ký
//     rut_lui    ngày rút khỏi nghiên cứu (bỏ trống = vẫn tham gia)
//     du_lieu    khi rút: giu (giữ dữ liệu đã thu) hoặc xoa (muốn xóa)
//     ghi_chu    không ghi họ tên
//
// Script này KHÔNG xóa dữ liệu nào. Nếu có yêu cầu xóa (du_lieu = xoa), script in danh sách để nhóm xác nhận với
// người xây web và cô Vân rồi mới xóa bằng tay. Rút khỏi nghiên cứu không ảnh hưởng điểm số ở trường.
import { admin, readCsv } from "./research-lib.mjs";
import { normalizeCode } from "../src/lib/research/code.ts";

const path = process.argv[2];
if (!path) {
  console.log("Cách dùng: npm run research:consent -- <file.csv>");
  process.exit(1);
}
const date = (v) => {
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`Ngày "${v}" phải có dạng 2026-11-12`);
  return v;
};
const { data: people } = await admin.from("research_participants").select("student_id, code");
const id = new Map((people ?? []).map((p) => [p.code, p.student_id]));
const rows = [];
const toDelete = [];
for (const r of readCsv(path)) {
  const code = normalizeCode(r.code ?? "");
  if (!code || !id.has(code)) throw new Error(`Mã "${r.code}" không có trong danh sách người tham gia`);
  const withdrawData = r.du_lieu === "xoa" ? "delete" : r.du_lieu === "giu" ? "keep" : null;
  rows.push({
    student_id: id.get(code),
    parent_consent_on: date(r.phu_huynh),
    student_consent_on: date(r.hoc_sinh),
    withdrawn_on: date(r.rut_lui),
    withdraw_data: withdrawData,
    note: r.ghi_chu ? r.ghi_chu.slice(0, 300) : null,
    updated_at: new Date().toISOString(),
  });
  if (withdrawData === "delete") toDelete.push(code);
}
const { error } = await admin.from("research_consent").upsert(rows);
if (error) throw new Error(`${error.message} (đã chạy migration 0015 chưa?)`);
console.log(`Đã ghi ${rows.length} dòng.`);
const missing = (people ?? []).filter((p) => !rows.some((r) => r.student_id === p.student_id)).map((p) => p.code);
if (missing.length) console.log(`Chưa có dòng phiếu đồng ý trong file này: ${missing.join(", ")}`);
if (toDelete.length) console.log(`YÊU CẦU XÓA DỮ LIỆU (cần xác nhận, chưa xóa gì): ${toDelete.join(", ")}`);
