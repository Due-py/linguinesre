// Nhập điểm chấm mù 0–1–2 vào CSDL (bảng test_scores). Người giữ danh sách (Lâm) chạy trên máy của mình.
//
// Chạy: npm run research:import-scores -- --key <BI-MAT-bang-doi-chieu.csv> --rater 1 --file <nguoi-cham-1.csv>
//       --rater 1 hoặc 2: hai người chấm độc lập. --rater 0: điểm THỐNG NHẤT cho các câu hai người chấm lệch nhau.
//       --dry-run: chỉ kiểm tra file, không ghi.
//   File điểm: tải trang "Người chấm 1" (hoặc 2) của Google Sheet về dạng CSV (Tệp → Tải xuống → .csv),
//   cần cột ma_file và diem (ghi_chu không bắt buộc). Dòng chưa có điểm được bỏ qua và báo lại.
//
// Ghi đè điểm cũ của CÙNG người chấm cho cùng câu (để sửa lỗi nhập). Không bao giờ xóa điểm.
// Sau khi nhập, in Cohen's kappa trên các file cả hai người cùng chấm.
import { readFileSync } from "node:fs";
import { admin } from "./research-lib.mjs";
import { cohenKappa } from "../src/lib/research/stats.ts";

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const keyPath = arg("--key");
const filePath = arg("--file");
const rater = Number(arg("--rater"));
const dry = args.includes("--dry-run");
if (!keyPath || !filePath || ![0, 1, 2].includes(rater)) {
  console.log("Cách dùng: npm run research:import-scores -- --key <bang-doi-chieu.csv> --rater <1|2|0> --file <diem.csv> [--dry-run]");
  process.exit(1);
}

/** CSV có ngoặc kép (Google Sheets, Excel). Trả mảng object theo tên cột (chữ thường). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  const s = text.replace(/^﻿/, "");
  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") endCell();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      endRow();
    } else cell += c;
  }
  if (cell !== "" || row.length) endRow();
  const head = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  return rows.filter((r) => r.some((v) => v.trim())).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

const key = new Map(parseCsv(readFileSync(keyPath, "utf8")).map((r) => [r.ma_file, r.response_id]));
const scores = parseCsv(readFileSync(filePath, "utf8"));
if (!scores.length || !("ma_file" in scores[0]) || !("diem" in scores[0])) {
  console.log("File điểm cần cột ma_file và diem.");
  process.exit(1);
}

const problems = [];
const seen = new Set();
const rows = [];
let empty = 0;
for (const s of scores) {
  if (!key.has(s.ma_file)) problems.push(`${s.ma_file || "(trống)"}: không có trong bảng đối chiếu`);
  else if (seen.has(s.ma_file)) problems.push(`${s.ma_file}: xuất hiện hai lần trong file điểm`);
  else if (s.diem === "") empty++;
  else if (!["0", "1", "2"].includes(s.diem)) problems.push(`${s.ma_file}: điểm "${s.diem}" không phải 0, 1, 2`);
  else rows.push({ response_id: key.get(s.ma_file), rater, score: Number(s.diem), blind_code: s.ma_file, note: s.ghi_chu ? s.ghi_chu.slice(0, 500) : null });
  seen.add(s.ma_file);
}
if (problems.length) {
  console.log(`Có ${problems.length} lỗi, CHƯA nhập gì. Sửa trong Google Sheet rồi tải lại:`);
  for (const p of problems.slice(0, 30)) console.log("  - " + p);
  process.exit(1);
}
console.log(`Người chấm ${rater === 0 ? "(điểm thống nhất)" : rater}: ${rows.length} điểm hợp lệ, ${empty} dòng chưa chấm.`);
if (dry) {
  console.log("--dry-run: không ghi gì.");
  process.exit(0);
}
for (let i = 0; i < rows.length; i += 500) {
  const { error } = await admin.from("test_scores").upsert(rows.slice(i, i + 500), { onConflict: "response_id,rater" });
  if (error) throw new Error(error.message);
}
console.log("Đã nhập.");

const { data: all } = await admin.from("test_scores").select("response_id, rater, score").in("rater", [1, 2]);
const by = new Map();
for (const r of all ?? []) by.set(r.response_id, { ...by.get(r.response_id), [r.rater]: r.score });
const pairs = [...by.values()].filter((x) => x[1] !== undefined && x[2] !== undefined).map((x) => [x[1], x[2]]);
const k = cohenKappa(pairs);
if (k.n) {
  console.log(`Chấm đôi: ${k.n} file, trùng điểm ${(k.agree * 100).toFixed(1)}%, Cohen's kappa = ${k.kappa === null ? "—" : k.kappa.toFixed(3)}`);
  console.log(k.kappa !== null && k.kappa >= 0.6 ? "kappa ≥ 0,6: đạt (mục 3.6)." : "kappa < 0,6: hai người chấm ngồi cùng cô Vân thống nhất lại bảng chấm, chấm lại bộ 20% (mục 3.6).");
  const diff = pairs.filter(([a, b]) => a !== b).length;
  if (diff) console.log(`${diff} file hai người chấm lệch nhau: nhập điểm thống nhất bằng --rater 0.`);
}
