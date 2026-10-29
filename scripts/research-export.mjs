// Xuất dữ liệu bài kiểm tra ra files/research/ (thư mục không đưa lên GitHub).
// Chạy: npm run research:export                 → 2 file CSV: từng câu trả lời, và tóm tắt mỗi học sinh mỗi lần
//       npm run research:export -- --audio      → tải thêm toàn bộ file ghi âm (để đo tay bằng Audacity, mục 3.7)
//       npm run research:export -- --with-arm   → thêm cột chế độ A/B. CHỈ người giữ danh sách nhóm dùng; không gửi
//                                                 file này cho người chấm (chấm mù, mục 3.6).
//       npm run research:export -- --practice   → thêm 3 file của giai đoạn luyện (mục 3.8): từng lượt nói, từng buổi,
//                                                 câu hỏi hằng tuần. Các file này CÓ chế độ A/B: không gửi cho người chấm.
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

if (args.includes("--practice")) {
  const all = async (table, cols, order) => {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from(table).select(cols).order(order).range(from, from + 999);
      if (error) throw new Error(`${table}: ${error.message}`);
      out.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return out;
  };
  const [sessions, turns, checkins] = await Promise.all([
    all("mode_sessions", "id, student_id, mode, session_no, unit_no, day, status, active_ms, started_at, completed_at, user_agent", "started_at"),
    all(
      "mode_turns",
      "session_id, student_id, mode, step, layer, activity, item_ref, prompt, attempt_no, time_limit_ms, rl_ms, rl_status, rl_client_ms, in_limit, hint_level, duration_ms, transcript, check_result, audio_path, created_at",
      "created_at",
    ),
    all("weekly_checkins", "student_id, week_start, practised_elsewhere, detail, created_at", "week_start"),
  ]);
  const sess = new Map(sessions.map((x) => [x.id, x]));
  const secs = (ms) => (ms === null || ms === undefined ? "" : (ms / 1000).toFixed(2));
  const yn = (b) => (b === null || b === undefined ? "" : b ? 1 : 0);

  // Một dòng mỗi lượt nói (mục 3.8). Lượt 2 của L0 là nói theo mẫu; lượt 2 của Speed Q&A là nói lại không giới hạn.
  const turnRows = turns.map((t) => {
    const s = sess.get(t.session_id);
    return {
      ma_hoc_sinh: person.get(t.student_id)?.code,
      che_do: t.mode,
      ngay: s?.day,
      buoi_so: s?.session_no,
      unit: s?.unit_no,
      tang: t.layer ?? "",
      hoat_dong: t.activity,
      ma_noi_dung: t.item_ref,
      luot: t.attempt_no,
      gioi_han_giay: t.time_limit_ms ? (t.time_limit_ms / 1000).toString() : "khong_gioi_han",
      rl_giay: secs(t.rl_ms),
      trang_thai_rl: t.rl_status,
      rl_trinh_duyet_giay: secs(t.rl_client_ms),
      kip_gioi_han: yn(t.in_limit),
      muc_goi_y: t.hint_level,
      do_dai_luot_giay: secs(t.duration_ms),
      so_tu: t.check_result?.words ?? "",
      dung_muc_tieu: yn(t.check_result?.target),
      co_ly_do: yn(t.check_result?.reason),
      thoi_luong_buoi_phut: s ? (s.active_ms / 60000).toFixed(1) : "",
      noi_dung: t.prompt,
      chu_ghi_loi: t.transcript ?? "",
      file_ghi_am: t.audio_path,
      luc: t.created_at,
    };
  });
  console.log(`Luyện tập, từng lượt: ${writeCsv(`luyen-tung-luot-${stamp()}.csv`, turnRows)}`);

  const sessionRows = sessions.map((s) => {
    const mine = turns.filter((t) => t.session_id === s.id);
    const speed = mine.filter((t) => t.activity === "speed" && t.time_limit_ms);
    const rl = median(speed.filter((t) => t.rl_status === "ok").map((t) => t.rl_ms));
    return {
      ma_hoc_sinh: person.get(s.student_id)?.code,
      che_do: s.mode,
      buoi_so: s.session_no,
      ngay: s.day,
      unit: s.unit_no,
      trang_thai: s.status === "completed" ? "xong" : "chua_xong",
      thoi_luong_phut: (s.active_ms / 60000).toFixed(1),
      du_10_phut: s.active_ms >= 600000 ? 1 : 0,
      so_luot: mine.length,
      speed_so_cau: speed.length,
      speed_kip_gio: speed.filter((t) => t.in_limit).length,
      speed_rl_trung_vi_giay: rl === null ? "" : (rl / 1000).toFixed(2),
      speed_gioi_han_cuoi_giay: speed.length ? (speed.at(-1).time_limit_ms / 1000).toString() : "",
      so_luot_dung_goi_y: mine.filter((t) => t.hint_level > 0).length,
      bat_dau: s.started_at,
      xong_luc: s.completed_at ?? "",
      trinh_duyet: s.user_agent ?? "",
    };
  });
  console.log(`Luyện tập, từng buổi: ${writeCsv(`luyen-tung-buoi-${stamp()}.csv`, sessionRows)}`);

  const checkinRows = checkins.map((c) => ({
    ma_hoc_sinh: person.get(c.student_id)?.code,
    tuan_bat_dau: c.week_start,
    luyen_them_noi_khac: c.practised_elsewhere ? 1 : 0,
    o_dau: c.detail ?? "",
    luc: c.created_at,
  }));
  console.log(`Câu hỏi hằng tuần: ${writeCsv(`hoi-hang-tuan-${stamp()}.csv`, checkinRows)}`);
}
