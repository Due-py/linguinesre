// Chuẩn bị chấm mù bài kiểm tra nói (Quy trình mục 3.6). CHỈ người giữ danh sách (Lâm) chạy, trên máy của mình.
//
// Chạy: npm run research:blind                → mọi câu trả lời (đầu vào + đầu ra) của học sinh không phải thử đề
//       npm run research:blind -- --no-audio  → chỉ tạo danh sách, không tải file ghi âm (để thử)
//
// Kết quả trong files/research/cham-mu-<ngày giờ>/ (thư mục không đưa lên GitHub):
//   am-thanh/R0001.webm …     file ghi âm đã đổi tên ngẫu nhiên, trộn lẫn bài trước và bài sau
//   nguoi-cham-1.csv           danh sách cho người chấm 1 (ma_file, cau_hoi)
//   nguoi-cham-2.csv           danh sách cho người chấm 2
//   BI-MAT-bang-doi-chieu.csv  mã file → câu trả lời. KHÔNG gửi cho người chấm. Dùng cho research:import-scores.
//
// 20% số file (chọn ngẫu nhiên) có trong CẢ HAI danh sách để tính Cohen's kappa; phần còn lại chia đôi.
// Người chấm chỉ thấy câu hỏi (đề A/B được dùng ở cả hai lần nên câu hỏi không cho biết bài trước hay sau).
import { randomInt } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { admin, RESEARCH_DIR, stamp, writeCsv } from "./research-lib.mjs";

const noAudio = process.argv.includes("--no-audio");

async function all(table, cols) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select(cols).order("id").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const [{ data: people }, { data: items }, responses, { count: scored }] = await Promise.all([
  admin.from("research_participants").select("student_id, pilot"),
  admin.from("test_items").select("id, text"),
  all("test_responses", "id, student_id, item_id, form, audio_path"),
  admin.from("test_scores").select("response_id", { count: "exact", head: true }),
]);
if (scored) {
  console.log(`Đã có ${scored} điểm chấm trong CSDL. Tạo bộ mã mới sẽ làm hai bộ mã lẫn nhau.`);
  console.log("Nếu thật sự cần (VD thêm học sinh làm bài muộn), hỏi người xây web trước. Dừng.");
  process.exit(1);
}
const pilot = new Set((people ?? []).filter((p) => p.pilot).map((p) => p.student_id));
const question = new Map((items ?? []).map((i) => [i.id, i.text]));
const list = responses.filter((r) => r.form !== "W" && !pilot.has(r.student_id));
if (list.length === 0) {
  console.log("Chưa có câu trả lời kiểm tra nào để chấm.");
  process.exit(0);
}

// Trộn ngẫu nhiên (Fisher–Yates, số ngẫu nhiên mật mã) rồi đánh mã theo thứ tự đã trộn.
for (let i = list.length - 1; i > 0; i--) {
  const j = randomInt(0, i + 1);
  [list[i], list[j]] = [list[j], list[i]];
}
const width = list.length >= 10000 ? 5 : 4;
const coded = list.map((r, i) => ({ ...r, code: `R${String(i + 1).padStart(width, "0")}`, ext: (r.audio_path.split(".").pop() ?? "webm").toLowerCase() }));
const nDouble = Math.ceil(coded.length * 0.2);
// Danh sách đã trộn ngẫu nhiên nên lấy nDouble file đầu = chọn ngẫu nhiên 20%.
const double = new Set(coded.slice(0, nDouble));
const rest = coded.slice(nDouble);
const toRow = (r) => ({ ma_file: r.code, file: `${r.code}.${r.ext}`, cau_hoi: question.get(r.item_id) ?? "", diem: "", ghi_chu: "" });
const byCodeOrder = (a, b) => a.code.localeCompare(b.code);
const r1 = [...double, ...rest.filter((_, i) => i % 2 === 0)].sort(byCodeOrder);
const r2 = [...double, ...rest.filter((_, i) => i % 2 === 1)].sort(byCodeOrder);

const sub = `cham-mu-${stamp()}`;
mkdirSync(join(RESEARCH_DIR, sub), { recursive: true });
console.log(`Người chấm 1: ${writeCsv(`${sub}/nguoi-cham-1.csv`, r1.map(toRow))} (${r1.length} file)`);
console.log(`Người chấm 2: ${writeCsv(`${sub}/nguoi-cham-2.csv`, r2.map(toRow))} (${r2.length} file)`);
const key = writeCsv(
  `${sub}/BI-MAT-bang-doi-chieu.csv`,
  coded.map((r) => ({ ma_file: r.code, response_id: r.id, cham_doi: double.has(r) ? 1 : 0 })),
);
console.log(`Bảng đối chiếu BÍ MẬT (không gửi người chấm): ${key}`);
console.log(`Chấm đôi để tính kappa: ${nDouble} file (20%).`);

if (!noAudio) {
  const dir = join(RESEARCH_DIR, sub, "am-thanh");
  mkdirSync(dir, { recursive: true });
  let ok = 0;
  for (const r of coded) {
    const { data, error } = await admin.storage.from("test-recordings").download(r.audio_path);
    if (error || !data) {
      console.log(`LỖI tải file của ${r.code}`);
      continue;
    }
    writeFileSync(join(dir, `${r.code}.${r.ext}`), Buffer.from(await data.arrayBuffer()));
    ok++;
  }
  console.log(`Đã tải ${ok}/${coded.length} file ghi âm vào ${dir}`);
}
