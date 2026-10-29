// Kiểm tra cấu trúc mọi Unit trong content/ (không cần mạng). Chạy: npm run content:check
import { loadContentFiles } from "./lib.mjs";

const files = loadContentFiles();
let bad = 0;
for (const f of files) {
  if (f.errors) {
    bad++;
    console.log(`LỖI  ${f.file}`);
    for (const e of f.errors) console.log(`     - ${e}`);
  } else {
    const u = f.unit;
    const d = [1, 2, 3].map((k) => u.questions.filter((q) => q.difficulty === k).length).join("/");
    console.log(`ĐẠT  ${f.file}  ${u.title}: ${u.vocab.length} từ, ${u.frames.length} khung câu, ${u.questions.length} câu hỏi (độ khó 1/2/3: ${d})`);
  }
}
if (files.length === 0) console.log("Chưa có file nội dung nào trong content/.");
process.exit(bad ? 1 : 0);
