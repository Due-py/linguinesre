// Ghi kết quả chia nhóm (bốc thăm theo cặp ngày 06/11, mục 2.3) vào web.
// Chạy: npm run research:arms -- files/research/chia-nhom.csv     (cột: code,arm  với arm = A hoặc B)
// Không đổi nhóm của bạn đã được chia, trừ khi thêm --force (ghi rõ lý do vào nhật ký nghiên cứu).
// Sau 15/12, mở chế độ A cho mọi người (đạo đức, mục 2.4): npm run research:arms -- --all-A
import { admin, readCsv } from "./research-lib.mjs";
import { normalizeCode } from "../src/lib/research/code.ts";

const args = process.argv.slice(2);
const force = args.includes("--force");

if (args.includes("--all-A")) {
  const { error, count } = await admin.from("research_participants").update({ arm: "A" }, { count: "exact" }).eq("pilot", false).not("arm", "is", null);
  if (error) throw new Error(error.message);
  console.log(`Đã mở chế độ A cho ${count} học sinh.`);
  process.exit(0);
}

const path = args.find((a) => !a.startsWith("--"));
if (!path) {
  console.log("Cách dùng: npm run research:arms -- files/research/chia-nhom.csv [--force]");
  process.exit(1);
}
let changed = 0;
let failed = 0;
for (const r of readCsv(path)) {
  const code = normalizeCode(r.code ?? "");
  const arm = (r.arm ?? "").toUpperCase();
  if (!code || !["A", "B"].includes(arm)) {
    console.log(`LỖI dòng ${JSON.stringify(r)}: cần code và arm (A/B)`);
    failed++;
    continue;
  }
  const { data } = await admin.from("research_participants").select("arm").eq("code", code).maybeSingle();
  if (!data) {
    console.log(`LỖI ${code}: chưa có tài khoản`);
    failed++;
    continue;
  }
  if (data.arm && data.arm !== arm && !force) {
    console.log(`BỎ QUA ${code}: đã ở chế độ ${data.arm} (dùng --force nếu thật sự cần đổi)`);
    failed++;
    continue;
  }
  await admin.from("research_participants").update({ arm }).eq("code", code);
  changed++;
}
console.log(`Đã ghi ${changed} học sinh, ${failed} dòng có vấn đề.`);
process.exit(failed ? 1 : 0);
