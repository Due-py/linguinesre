// Nạp content/*.json vào Supabase. Chạy lại bao nhiêu lần cũng được (idempotent).
// - Unit mới: trạng thái "draft".
// - Unit có nội dung đổi so với lần nạp trước: về lại "draft", phải duyệt lại.
// - Unit không đổi: bỏ qua, giữ nguyên trạng thái duyệt.
// Câu hỏi được giữ id ổn định (theo q01, q02...) vì lịch sử luyện tập trỏ tới chúng; câu bị bỏ khỏi file chỉ bị tắt (active = false).
// Chạy: npm run content:seed   (cần đã chạy 0002_content.sql)
import { loadContentFiles, loadEnv, serviceHeaders } from "./lib.mjs";

const env = loadEnv();
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const H = serviceHeaders(env);

async function api(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${U}/rest/v1/${path}`, {
    method,
    headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const files = loadContentFiles();
const broken = files.filter((f) => f.errors);
if (broken.length) {
  console.log("Dừng: có file nội dung lỗi. Chạy npm run content:check để xem chi tiết.");
  process.exit(1);
}

for (const { file, unit: u, hash } of files) {
  const [existing] = await api(`units?select=id,status,content_hash&grade=eq.${u.grade}&unit_no=eq.${u.unit}`);
  const fields = { grade: u.grade, unit_no: u.unit, title: u.title, title_vi: u.titleVi, topic: u.topic, source: u.source, content_hash: hash };

  let unitId;
  if (!existing) {
    [{ id: unitId }] = await api("units?select=id", { method: "POST", body: { ...fields, status: "draft" }, prefer: "return=representation" });
    console.log(`MỚI      ${file} → nháp`);
  } else if (existing.content_hash === hash) {
    console.log(`KHÔNG ĐỔI ${file} (${existing.status === "approved" ? "đã duyệt" : "nháp"})`);
    continue;
  } else {
    unitId = existing.id;
    await api(`units?id=eq.${unitId}`, {
      method: "PATCH",
      body: { ...fields, status: "draft", reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString() },
    });
    console.log(`ĐÃ ĐỔI   ${file} → về nháp, cần duyệt lại`);
  }

  await api(`vocab?unit_id=eq.${unitId}`, { method: "DELETE" });
  await api("vocab", { method: "POST", body: u.vocab.map((v) => ({ unit_id: unitId, key: v.id, en: v.en, vi: v.vi, example: v.example })) });

  await api(`frames?unit_id=eq.${unitId}`, { method: "DELETE" });
  await api("frames", {
    method: "POST",
    body: u.frames.map((f) => ({ unit_id: unitId, key: f.id, text: f.text, vi: f.vi, grammar_note: f.grammarNote, examples: f.examples })),
  });

  await api("questions?on_conflict=unit_id,key", {
    method: "POST",
    prefer: "resolution=merge-duplicates",
    body: u.questions.map((q) => ({
      unit_id: unitId,
      key: q.id,
      text: q.text,
      difficulty: q.difficulty,
      kind: q.kind,
      keywords: q.keywords,
      frame_key: q.frameId,
      hint_direction_vi: q.hintDirectionVi,
      example_answer: q.exampleAnswer,
      expects_reason: q.expectsReason,
      active: true,
    })),
  });
  const keep = u.questions.map((q) => q.id).join(",");
  await api(`questions?unit_id=eq.${unitId}&key=not.in.(${keep})`, { method: "PATCH", body: { active: false } });
}
console.log("Xong. Học sinh chỉ thấy Unit đã duyệt: npm run content:approve -- <khối> <unit> \"<người duyệt>\"");
