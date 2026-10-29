// Bật/tắt cài đặt nghiên cứu. Hiện có: post_test_open (mở bài kiểm tra lần 2, dự kiến 30/11).
// Chạy: npm run research:settings                       (xem giá trị hiện tại)
//       npm run research:settings -- post_test_open true
import { admin } from "./research-lib.mjs";

const KEYS = ["post_test_open"];
const [key, value] = process.argv.slice(2);
if (key) {
  if (!KEYS.includes(key) || !["true", "false"].includes(value)) {
    console.log(`Cách dùng: npm run research:settings -- <${KEYS.join("|")}> <true|false>`);
    process.exit(1);
  }
  const { error } = await admin.from("research_settings").upsert({ key, value: value === "true" });
  if (error) throw new Error(error.message);
}
const { data } = await admin.from("research_settings").select("key, value");
for (const r of data ?? []) console.log(`${r.key} = ${JSON.stringify(r.value)}`);
