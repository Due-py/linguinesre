// Xuất dữ liệu bài kiểm tra ra files/research/ (thư mục không đưa lên GitHub).
// Chạy: npm run research:export                 → 2 file CSV: từng câu trả lời, và tóm tắt mỗi học sinh mỗi lần
//       npm run research:export -- --audio      → tải thêm toàn bộ file ghi âm (để đo tay bằng Audacity, mục 3.7)
//       npm run research:export -- --with-arm   → thêm cột chế độ A/B. CHỈ người giữ danh sách nhóm dùng; không gửi
//                                                 file này cho người chấm (chấm mù, mục 3.6).
// RL của một học sinh = trung vị 15 câu, câu không trả lời tính 10 giây (mục 1.4). Không tính 2 câu làm mẫu.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { admin, RESEARCH_DIR, stamp, writeCsv } from "./research-lib.mjs";
import { median } from "../src/lib/research/latency.ts";

const args = process.argv.slice(2);
const withArm = args.includes("--with-arm");

const [{ data: people }, { data: attempts }, { data: items }] = await Promise.all([
  admin.from("research_participants").select("student_id, code, grade, form_order, arm, pilot"),
  admin.from("test_attempts").select("id, student_id, phase, form, status, started_at, completed_at, user_agent"),
  admin.from("test_items").select("id, form, position, unit_no, kind, text"),
]);
const responses = [];
for (let from = 0; ; from += 1000) {
  const { data } = await admin
    .from("test_responses")
    .select("attempt_id, student_id, item_id, form, position, audio_path, beep_end_ms, duration_ms, rl_ms, rl_status, first_word, transcript, created_at")
    .order("created_at")
    .range(from, from + 999);
  responses.push(...(data ?? []));
  if (!data || data.length < 1000) break;
}
const person = new Map((people ?? []).map((p) => [p.student_id, p]));
const attempt = new Map((attempts ?? []).map((a) => [a.id, a]));
const item = new Map((items ?? []).map((i) => [i.id, i]));

const rows = responses.map((r) => {
  const p = person.get(r.student_id);
  const a = attempt.get(r.attempt_id);
  const it = item.get(r.item_id);
  return {
    ma_hoc_sinh: p?.code,
    khoi: p?.grade,
    thu_de: p?.pilot ? 1 : 0,
    ...(withArm ? { che_do: p?.arm ?? "" } : {}),
    lan: a?.phase === "pre" ? "dau_vao" : "dau_ra",
    de: a?.form,
    cau_mau: r.form === "W" ? 1 : 0,
    so_cau: r.form === "W" ? r.position : r.position - 2,
    unit: it?.unit_no ?? "",
    dang_cau: it?.kind ?? "",
    cau_hoi: it?.text,
    rl_giay: r.rl_ms === null ? "" : (r.rl_ms / 1000).toFixed(2),
    trang_thai_rl: r.rl_status,
    tu_dau_tien: r.first_word ?? "",
    chu_ghi_loi: r.transcript ?? "",
    het_bip_ms: r.beep_end_ms,
    do_dai_ms: r.duration_ms,
    file_ghi_am: r.audio_path,
    luc: r.created_at,
  };
});
console.log(`Từng câu: ${writeCsv(`kiem-tra-tung-cau-${stamp()}.csv`, rows)}`);

const summary = (attempts ?? []).map((a) => {
  const p = person.get(a.student_id);
  const mine = responses.filter((r) => r.attempt_id === a.id && r.form !== "W");
  const rl = mine.filter((r) => r.rl_ms !== null).map((r) => r.rl_ms);
  const m = median(rl);
  return {
    ma_hoc_sinh: p?.code,
    khoi: p?.grade,
    thu_de: p?.pilot ? 1 : 0,
    thu_tu_de: p?.form_order,
    ...(withArm ? { che_do: p?.arm ?? "" } : {}),
    lan: a.phase === "pre" ? "dau_vao" : "dau_ra",
    de: a.form,
    trang_thai: a.status === "completed" ? "xong" : "dang_lam",
    so_cau_da_ghi: mine.length,
    rl_trung_vi_giay: m === null ? "" : (m / 1000).toFixed(2),
    so_cau_khong_tra_loi: mine.filter((r) => r.rl_status === "no_response").length,
    so_cau_chua_do_duoc: mine.filter((r) => r.rl_status === "pending" || r.rl_status === "failed").length,
    bat_dau: a.started_at,
    xong_luc: a.completed_at ?? "",
    trinh_duyet: a.user_agent ?? "",
  };
});
console.log(`Tóm tắt mỗi học sinh: ${writeCsv(`kiem-tra-tom-tat-${stamp()}.csv`, summary)}`);
const pending = responses.filter((r) => r.rl_status === "pending" || r.rl_status === "failed").length;
if (pending) console.log(`Còn ${pending} câu chưa đo được RL: chạy npm run research:rescore`);

if (args.includes("--audio")) {
  let n = 0;
  for (const r of responses) {
    const { data, error } = await admin.storage.from("test-recordings").download(r.audio_path);
    if (error || !data) {
      console.log(`LỖI tải ${r.audio_path}`);
      continue;
    }
    const out = join(RESEARCH_DIR, "ghi-am", r.audio_path);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, Buffer.from(await data.arrayBuffer()));
    n++;
  }
  console.log(`Đã tải ${n} file ghi âm vào ${join(RESEARCH_DIR, "ghi-am")}`);
}
