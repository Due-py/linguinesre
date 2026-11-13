// Giao bài thi thử nói MỘT LẦN cho mọi học sinh hiện có (lớp 6–12, đã hoàn tất đăng ký). Chạy lại không giao trùng.
// Tài khoản tạo sau lần chạy này KHÔNG tự nhận bài. Không giao cho tài khoản nghiên cứu (mã học sinh): bài thi thử
// không được làm lệch bài kiểm tra nói của nghiên cứu.
// Chạy: npm run mocktest:send            → giao bài
//       npm run mocktest:send -- --dry   → chỉ đếm, không ghi
import { admin } from "./research-lib.mjs";

const dry = process.argv.includes("--dry");
const { data: students, error } = await admin.from("profiles").select("id, grade, onboarded_at").eq("role", "student");
if (error) throw new Error(error.message);
const { data: parts } = await admin.from("research_participants").select("student_id");
const research = new Set((parts ?? []).map((p) => p.student_id));
const { data: existing, error: e2 } = await admin.from("mock_test_invites").select("student_id");
if (e2) throw new Error(`${e2.message} (đã chạy migration 0017 chưa?)`);
const already = new Set((existing ?? []).map((r) => r.student_id));

const target = students.filter((s) => s.onboarded_at && s.grade >= 6 && s.grade <= 12 && !research.has(s.id) && !already.has(s.id));
const byGrade = target.reduce((m, s) => ((m[s.grade] = (m[s.grade] ?? 0) + 1), m), {});
console.log(`Học sinh: ${students.length}. Đã có bài: ${already.size}. Tài khoản nghiên cứu (không giao): ${research.size}.`);
console.log(`Sẽ giao mới: ${target.length}`, byGrade);
if (dry || target.length === 0) process.exit(0);
const { error: e3 } = await admin.from("mock_test_invites").insert(target.map((s) => ({ student_id: s.id, grade: s.grade })));
if (e3) throw new Error(e3.message);
console.log("Đã giao bài.");
