// Kiểm tra cấu trúc mọi Learning Module trong content/modules/ (không cần mạng). Chạy: npm run module:check
import { loadModuleFiles } from "./lib.mjs";

const files = loadModuleFiles();
let bad = 0;
for (const f of files) {
  if (f.errors) {
    bad++;
    console.log(`LỖI  ${f.file}`);
    for (const e of f.errors) console.log(`     - ${e}`);
  } else {
    const m = f.module;
    const sgk = [...m.vocab, ...m.grammar, ...m.pronunciation, ...m.expressions].filter((x) => x.src.kind === "sgk").length;
    const all = m.vocab.length + m.grammar.length + m.pronunciation.length + m.expressions.length;
    console.log(
      `ĐẠT  ${f.file}  ${m.title}: ${m.vocab.length} từ, ${m.grammar.length} ngữ pháp, ${m.pronunciation.length} phát âm, ` +
        `${m.expressions.length} cụm câu, ${m.roleplays.length} roleplay; ${sgk}/${all} mục kiến thức có trang SGK`,
    );
  }
}
if (files.length === 0) console.log("Chưa có module nào trong content/modules/.");
process.exit(bad ? 1 : 0);
