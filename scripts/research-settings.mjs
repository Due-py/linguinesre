// Bật/tắt cài đặt nghiên cứu.
//   post_test_open  mở bài kiểm tra lần 2 (dự kiến 30/11)
//   practice_open   mở hai chế độ luyện A/B cho người đã chia nhóm (dự kiến 09/11). Người thử đề luôn được mở.
//   study_over      sau 15/12: mọi người tham gia dùng chế độ A và trang luyện tự do
//   practice_units  các Unit lớp 8 để luyện, mỗi Unit 5 buổi theo thứ tự (mặc định 1,2,3)
// Chạy: npm run research:settings                          (xem giá trị hiện tại)
//       npm run research:settings -- practice_open true
//       npm run research:settings -- practice_units 1,2,3
import { admin } from "./research-lib.mjs";

const BOOLS = ["post_test_open", "practice_open", "study_over"];
const [key, value] = process.argv.slice(2);
if (key) {
  let v;
  if (BOOLS.includes(key) && ["true", "false"].includes(value)) v = value === "true";
  else if (key === "practice_units" && /^\d+(,\d+)*$/.test(value ?? "")) v = value.split(",").map(Number);
  if (v === undefined) {
    console.log(`Cách dùng: npm run research:settings -- <${BOOLS.join("|")}> <true|false>`);
    console.log("           npm run research:settings -- practice_units 1,2,3");
    process.exit(1);
  }
  const { error } = await admin.from("research_settings").upsert({ key, value: v });
  if (error) throw new Error(error.message);
}
const { data } = await admin.from("research_settings").select("key, value").order("key");
for (const r of data ?? []) console.log(`${r.key} = ${JSON.stringify(r.value)}`);
