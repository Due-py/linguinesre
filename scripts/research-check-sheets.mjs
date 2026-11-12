// Kiểm tra cổng Google Sheets (Apps Script) có chạy không, dùng RESEARCH_SHEETS_URL và RESEARCH_SHEETS_SECRET trong .env.local.
// Chạy: npm run research:check-sheets
// Chỉ in tên form, đã tạo chưa và SỐ dòng câu trả lời. Không in nội dung câu trả lời, không in mã bí mật.
import { loadEnv } from "./lib.mjs";

const env = loadEnv();
const url = env.RESEARCH_SHEETS_URL;
const secret = env.RESEARCH_SHEETS_SECRET;
if (!url || !secret) {
  console.log("Thiếu RESEARCH_SHEETS_URL hoặc RESEARCH_SHEETS_SECRET trong .env.local (xem research-system/HUONG-DAN.md, bước 4).");
  process.exit(1);
}
const get = async (form) => {
  const q = new URLSearchParams({ secret, ...(form ? { form } : {}) });
  const res = await fetch(`${url}?${q}`, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
const list = await get();
if (!list.ok) {
  console.log(list.error === "unauthorized" ? "Mã bí mật không khớp với mã trong Apps Script (chạy lại taoMaBiMat để xem, hoặc doiMaBiMat)." : `Lỗi: ${list.error}`);
  process.exit(1);
}
for (const f of list.forms) {
  const d = await get(f.key);
  console.log(`${f.key}  ${f.created ? "đã tạo" : "CHƯA tạo"}  ${d.rows?.length ?? 0} câu trả lời  ${f.title}`);
}
console.log("Cổng dữ liệu hoạt động.");
