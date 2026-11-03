// Nạp content/modules/*.json (Learning Module) vào Supabase. Chạy lại bao nhiêu lần cũng được.
// Quy trình nội dung: Thu thập (SGK) → Trích xuất (file JSON, có trang) → Soạn bài luyện → Kiểm tra (npm run module:check,
// chạy lại ở đây) → Thầy cô duyệt (trang /teacher/modules hoặc npm run module:approve) → Học sinh dùng.
// - Module mới hoặc có nội dung đổi: "team_checked" (đã qua kiểm tra tự động và nhóm soạn), xóa người duyệt cũ.
// - Module không đổi: giữ nguyên trạng thái.
// Cần đã chạy 0010_modules.sql và đã nạp Unit luyện tập (npm run content:seed).
// Chạy: npm run module:seed
import { loadEnv, loadModuleFiles, serviceHeaders } from "./lib.mjs";

const env = loadEnv();
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const H = serviceHeaders(env);

async function api(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${U}/rest/v1/${path}`, { method, headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const files = loadModuleFiles();
if (files.some((f) => f.errors)) {
  console.log("Dừng: có module lỗi. Chạy npm run module:check để xem chi tiết.");
  process.exit(1);
}

for (const { file, module: m, hash } of files) {
  const [unit] = await api(`units?select=id&grade=eq.${m.grade}&unit_no=eq.${m.unit}`);
  if (!unit) {
    console.log(`BỎ QUA   ${file}: chưa có Unit lớp ${m.grade} số ${m.unit} trong CSDL (chạy npm run content:seed trước)`);
    continue;
  }
  const [existing] = await api(`modules?select=id,status,content_hash&unit_id=eq.${unit.id}`);
  const fields = { unit_id: unit.id, grade: m.grade, unit_no: m.unit, title: m.title, content: m, content_hash: hash };
  if (!existing) {
    await api("modules", { method: "POST", body: { ...fields, status: "team_checked" } });
    console.log(`MỚI      ${file} → nhóm đã kiểm tra, chờ thầy cô duyệt`);
  } else if (existing.content_hash === hash) {
    console.log(`KHÔNG ĐỔI ${file} (${existing.status})`);
  } else {
    await api(`modules?id=eq.${existing.id}`, {
      method: "PATCH",
      body: { ...fields, status: "team_checked", reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString() },
    });
    console.log(`ĐÃ ĐỔI   ${file} → về "nhóm đã kiểm tra", cần thầy cô duyệt lại`);
  }
}
console.log('Xong. Thầy cô duyệt ở trang /teacher/modules, hoặc: npm run module:approve -- <khối> <unit> "<người duyệt>"');
