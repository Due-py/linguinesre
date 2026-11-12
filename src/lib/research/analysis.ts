/**
 * Tính toàn bộ số liệu cho trang thống kê nghiên cứu (/research) từ dữ liệu thô. File thuần (không gọi CSDL) để test.
 *
 * Nguyên tắc (Quy trình mục 1.4, 3.6, 4.1 và yêu cầu trung thực của nhóm):
 *  - Chỉ MÔ TẢ. Không loại học sinh nào khỏi bảng: người rút lui, thiếu bài, bản trùng đều được giữ và đánh dấu.
 *    Học sinh thử đề (pilot) không vào số liệu phân tích (đúng Quy trình) nhưng vẫn được đếm riêng.
 *  - showArms = false (mức "xem mù"): không trả nhóm A/B ở bất kỳ đâu, kể cả tách số liệu theo nhóm,
 *    đường cong 15 buổi của chế độ A và phiếu cảm nhận (cả hai đều chỉ thuộc một chế độ).
 *  - RL của một học sinh = trung vị các câu của một lần kiểm tra (không tính 2 câu mẫu); câu không trả lời = 10 giây.
 *  - Điểm 0–1–2 cuối cùng của một câu: điểm thống nhất (rater 0) nếu có; nếu không, điểm chung khi hai người chấm
 *    giống nhau, hoặc điểm của người duy nhất đã chấm. Hai người lệch nhau mà chưa thống nhất → chưa có điểm (báo lại).
 */
import { FLCAS_ITEMS, FLCAS_SPEAKING, scoreFlcas, type FlcasScore } from "./flcas";
import { answer, byCode, quizScore, type CodedSheet, type SheetData } from "./sheetData";
import { cohenKappa, cronbachAlpha, mean, median, sd } from "./stats";

export type Arm = "A" | "B";
export type FormKey = "F1" | "F2" | "F3" | "F5" | "F6" | "F7";

export type RawParticipant = { student_id: string; code: string; grade: number; form_order: "AB" | "BA"; arm: Arm | null; pilot: boolean };
export type RawConsent = { student_id: string; parent_consent_on: string | null; student_consent_on: string | null; withdrawn_on: string | null; withdraw_data: "keep" | "delete" | null };
export type RawAttempt = { id: string; student_id: string; phase: "pre" | "post"; form: "A" | "B"; status: "in_progress" | "completed"; started_at: string };
export type RawResponse = { id: string; attempt_id: string; form: "A" | "B" | "W"; rl_ms: number | null; rl_status: string };
export type RawScore = { response_id: string; rater: number; score: number };
export type RawSession = { id: string; student_id: string; mode: Arm; session_no: number; day: string; status: string; active_ms: number };
export type RawTurn = { session_id: string; activity: string; time_limit_ms: number | null; rl_ms: number | null; rl_status: string; in_limit: boolean | null; hint_level: number };

export type Raw = {
  participants: RawParticipant[];
  consent: RawConsent[];
  attempts: RawAttempt[];
  responses: RawResponse[];
  scores: RawScore[];
  sessions: RawSession[];
  turns: RawTurn[];
  /** null = form chưa kết nối / chưa tạo. */
  sheets: Partial<Record<FormKey, SheetData | null>>;
  postTestOpen: boolean;
};

export type Options = { showArms: boolean; from?: string | null; to?: string | null; arm?: Arm | null };

export type Stat = { n: number; mean: number | null; sd: number | null; median: number | null };
const stat = (xs: number[]): Stat => ({ n: xs.length, mean: mean(xs), sd: sd(xs), median: median(xs) });

export type TestSummary = {
  status: "none" | "in_progress" | "completed";
  form: "A" | "B" | null;
  date: string | null;
  items: number;
  /** Trung vị RL (ms) trên các câu đã đo được. */
  rlMedianMs: number | null;
  rlMeasured: number;
  rlNoResponse: number;
  rlPending: number;
  scored: number;
  conflicts: number;
  /** Điểm chính xác trung bình 0–2 (ĐTB) và tỷ lệ câu đạt 2 (ACC, %). Chỉ có khi đã chấm đủ mọi câu. */
  dtb: number | null;
  acc: number | null;
};

export type PersonRow = {
  code: string;
  grade: number;
  formOrder: "AB" | "BA";
  arm: Arm | null;
  pilot: boolean;
  consent: "full" | "partial" | "none";
  withdrawn: string | null;
  deleteRequested: boolean;
  pre: TestSummary;
  post: TestSummary;
  flcasPre: FlcasScore | null;
  flcasPost: FlcasScore | null;
  mini: number | null;
  sessions: { started: number; completed: number; tenMin: number; minutes: number; lastDay: string | null };
  weekly: number;
};

export type Issue = { severity: "warn" | "info"; title: string; detail?: string; codes?: string[] };

export type GroupSplit<T> = { all: T; A?: T; B?: T };

export type Dashboard = {
  showArms: boolean;
  counts: {
    participants: number;
    pilots: number;
    withdrawn: number;
    arms: { A: number; B: number; none: number } | null;
    preDone: number;
    postDone: number;
    sessionsRecorded: number;
    sessionsCompleted: number;
    tenOrMore: number;
    completionRate: number | null;
  };
  people: PersonRow[];
  speaking: {
    pre: GroupSplit<{ rl: Stat; dtb: Stat; acc: Stat }>;
    post: GroupSplit<{ rl: Stat; dtb: Stat; acc: Stat }>;
    kappa: { kappa: number | null; agree: number | null; n: number };
    responses: number;
    scored: number;
    conflicts: number;
  };
  anxiety: {
    connected: { pre: boolean; post: boolean };
    pre: GroupSplit<{ speaking: Stat; total: Stat }>;
    post: GroupSplit<{ speaking: Stat; total: Stat }>;
    alphaPre: number | null;
    alphaPreSpeaking: number | null;
    pairs: number;
  };
  knowledge: { connected: boolean; mini: Stat; paperSlow: { eligible: number; count: number } };
  practice: {
    bySession: { no: number; all: number; A?: number; B?: number }[];
    /** CH3: chỉ chế độ A, chỉ khi được xem nhóm. */
    curve: { no: number; byLimit: Record<"5000" | "3000" | "1500", number | null>; inLimitPct: number | null; hintMean: number | null; turns: number }[] | null;
  };
  ch1: { connected: boolean; n: number; byGrade: Record<number, number>; items: { title: string; n: number; agreePct: number | null; byGrade: Record<number, number | null> }[] };
  perception: { A: { title: string; mean: number | null; n: number }[]; B: { title: string; mean: number | null; n: number }[]; n: { A: number; B: number } } | null;
  weekly: { connected: boolean; responses: number; elsewhere: number; otherTools: number; contamination: number; missed: number; tech: { code: string; at: string | null; text: string }[] };
  quality: Issue[];
};

/** Ngày theo giờ Việt Nam (YYYY-MM-DD) của một mốc thời gian ISO. */
export const vnDay = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : new Date(t + 7 * 3_600_000).toISOString().slice(0, 10);
};

function finalScore(list: RawScore[]): number | "conflict" | null {
  const r0 = list.find((s) => s.rater === 0);
  if (r0) return r0.score;
  const r1 = list.find((s) => s.rater === 1);
  const r2 = list.find((s) => s.rater === 2);
  if (r1 && r2) return r1.score === r2.score ? r1.score : "conflict";
  return (r1 ?? r2)?.score ?? null;
}

export function buildDashboard(raw: Raw, opt: Options): Dashboard {
  const { showArms } = opt;
  const inRange = (day: string | null) => !!day && (!opt.from || day >= opt.from) && (!opt.to || day <= opt.to);
  const anyRange = !!(opt.from || opt.to);
  const keep = (day: string | null) => !anyRange || inRange(day);

  const consentBy = new Map(raw.consent.map((c) => [c.student_id, c]));
  const scoresBy = new Map<string, RawScore[]>();
  for (const s of raw.scores) scoresBy.set(s.response_id, [...(scoresBy.get(s.response_id) ?? []), s]);
  const responsesBy = new Map<string, RawResponse[]>();
  for (const r of raw.responses) if (r.form !== "W") responsesBy.set(r.attempt_id, [...(responsesBy.get(r.attempt_id) ?? []), r]);
  const sessionById = new Map(raw.sessions.map((s) => [s.id, s]));

  // Google Sheets: lần nộp đầu tiên của mỗi mã, trong khoảng thời gian đang lọc.
  const coded = (key: FormKey): CodedSheet | null => {
    const d = raw.sheets[key];
    if (!d) return null;
    return byCode({ headers: d.headers, rows: d.rows.filter((r) => keep(vnDay(String(r[0] ?? "")))) });
  };
  const sF2 = coded("F2");
  const sF3 = coded("F3");
  const sF5 = coded("F5");
  const sF6 = coded("F6");
  const sF7 = coded("F7");

  const summarize = (att: RawAttempt | undefined): TestSummary => {
    if (!att || !keep(vnDay(att.started_at))) {
      return { status: "none", form: null, date: null, items: 0, rlMedianMs: null, rlMeasured: 0, rlNoResponse: 0, rlPending: 0, scored: 0, conflicts: 0, dtb: null, acc: null };
    }
    const rs = responsesBy.get(att.id) ?? [];
    const measured = rs.filter((r) => (r.rl_status === "ok" || r.rl_status === "no_response") && r.rl_ms !== null);
    const finals = rs.map((r) => finalScore(scoresBy.get(r.id) ?? []));
    const nums = finals.filter((f): f is number => typeof f === "number");
    const complete = rs.length > 0 && nums.length === rs.length;
    return {
      status: att.status,
      form: att.form,
      date: vnDay(att.started_at),
      items: rs.length,
      rlMedianMs: median(measured.map((r) => r.rl_ms!)),
      rlMeasured: measured.length,
      rlNoResponse: rs.filter((r) => r.rl_status === "no_response").length,
      rlPending: rs.filter((r) => r.rl_status === "pending" || r.rl_status === "failed").length,
      scored: nums.length,
      conflicts: finals.filter((f) => f === "conflict").length,
      dtb: complete ? mean(nums) : null,
      acc: complete ? (nums.filter((x) => x === 2).length / nums.length) * 100 : null,
    };
  };

  const weeklyCount = new Map<string, number>();
  if (raw.sheets.F5) {
    const d = raw.sheets.F5;
    const col = d.headers.findIndex((h) => /^mã học sinh/i.test(String(h).trim()));
    for (const r of d.rows) {
      if (!keep(vnDay(String(r[0] ?? "")))) continue;
      const c = String(r[col] ?? "").toUpperCase().replace(/[\s-]/g, "");
      weeklyCount.set(c, (weeklyCount.get(c) ?? 0) + 1);
    }
  }

  const all = raw.participants.map((p): PersonRow => {
    const c = consentBy.get(p.student_id);
    const atts = raw.attempts.filter((a) => a.student_id === p.student_id);
    const sess = raw.sessions.filter((s) => s.student_id === p.student_id && keep(s.day));
    const done = sess.filter((s) => s.status === "completed");
    const f2 = sF2?.first.get(p.code);
    const f6 = sF6?.first.get(p.code);
    const f3 = sF3?.first.get(p.code);
    return {
      code: p.code,
      grade: p.grade,
      formOrder: p.form_order,
      arm: showArms ? p.arm : null,
      pilot: p.pilot,
      consent: c?.parent_consent_on && c?.student_consent_on ? "full" : c?.parent_consent_on || c?.student_consent_on ? "partial" : "none",
      withdrawn: c?.withdrawn_on ?? null,
      deleteRequested: c?.withdraw_data === "delete",
      pre: summarize(atts.find((a) => a.phase === "pre")),
      post: summarize(atts.find((a) => a.phase === "post")),
      flcasPre: f2 && raw.sheets.F2 ? scoreFlcas(raw.sheets.F2.headers, f2.row) : null,
      flcasPost: f6 && raw.sheets.F6 ? scoreFlcas(raw.sheets.F6.headers, f6.row) : null,
      mini: f3 && raw.sheets.F3 ? quizScore(raw.sheets.F3.headers, f3.row) : null,
      sessions: {
        started: sess.length,
        completed: done.length,
        tenMin: done.filter((s) => s.active_ms >= 600_000).length,
        minutes: Math.round(sess.reduce((a, s) => a + s.active_ms, 0) / 60_000),
        lastDay: sess.map((s) => s.day).sort().at(-1) ?? null,
      },
      weekly: weeklyCount.get(p.code) ?? 0,
    };
  });
  const armOf = new Map(raw.participants.map((p) => [p.code, p.arm]));
  const study = all.filter((p) => !p.pilot);
  const studyIds = new Set(raw.participants.filter((p) => !p.pilot).map((p) => p.student_id));

  /** Tách theo nhóm chỉ khi được xem nhóm. Học sinh chưa chia nhóm chỉ nằm trong "all". */
  function split<T>(f: (rows: PersonRow[]) => T): GroupSplit<T> {
    const out: GroupSplit<T> = { all: f(study) };
    if (showArms) {
      out.A = f(study.filter((p) => armOf.get(p.code) === "A"));
      out.B = f(study.filter((p) => armOf.get(p.code) === "B"));
    }
    return out;
  }

  const testStats = (phase: "pre" | "post") => (rows: PersonRow[]) => {
    const t = rows.map((p) => p[phase]).filter((s) => s.status === "completed");
    return {
      rl: stat(t.map((s) => s.rlMedianMs).filter((x): x is number => x !== null).map((x) => x / 1000)),
      dtb: stat(t.map((s) => s.dtb).filter((x): x is number => x !== null)),
      acc: stat(t.map((s) => s.acc).filter((x): x is number => x !== null)),
    };
  };
  const flcasStats = (key: "flcasPre" | "flcasPost") => (rows: PersonRow[]) => ({
    speaking: stat(rows.map((p) => p[key]?.speakingMean).filter((x): x is number => typeof x === "number")),
    total: stat(rows.map((p) => p[key]?.mean).filter((x): x is number => typeof x === "number")),
  });

  // Chấm đôi (kappa) trên toàn bộ câu có cả hai người chấm.
  const pairs: [number, number][] = [];
  for (const list of scoresBy.values()) {
    const a = list.find((s) => s.rater === 1);
    const b = list.find((s) => s.rater === 2);
    if (a && b) pairs.push([a.score, b.score]);
  }
  const studyAttempts = new Set(raw.attempts.filter((a) => studyIds.has(a.student_id)).map((a) => a.id));
  const studyResponses = raw.responses.filter((r) => r.form !== "W" && studyAttempts.has(r.attempt_id));
  const finalsAll = studyResponses.map((r) => finalScore(scoresBy.get(r.id) ?? []));

  // Cronbach's alpha FLCAS lần 1, chỉ người trả lời đủ câu.
  const fullPre = study.map((p) => p.flcasPre).filter((f): f is FlcasScore => !!f && f.missing.length === 0);
  const alphaPre = cronbachAlpha(fullPre.map((f) => Array.from({ length: FLCAS_ITEMS }, (_, i) => f.items[i + 1])));
  const alphaPreSpeaking = cronbachAlpha(fullPre.map((f) => FLCAS_SPEAKING.map((n) => f.items[n])));

  // Luyện tập theo buổi số 1–15 (buổi hoàn thành).
  const studySessions = raw.sessions.filter((s) => studyIds.has(s.student_id) && keep(s.day));
  const armById = new Map(raw.participants.map((p) => [p.student_id, p.arm]));
  const maxNo = Math.max(15, ...studySessions.map((s) => s.session_no));
  const bySession = Array.from({ length: maxNo }, (_, i) => {
    const done = studySessions.filter((s) => s.session_no === i + 1 && s.status === "completed");
    return showArms
      ? { no: i + 1, all: done.length, A: done.filter((s) => armById.get(s.student_id) === "A").length, B: done.filter((s) => armById.get(s.student_id) === "B").length }
      : { no: i + 1, all: done.length };
  });

  let curve: Dashboard["practice"]["curve"] = null;
  if (showArms) {
    const aTurns = raw.turns.filter((t) => {
      const s = sessionById.get(t.session_id);
      return s && s.mode === "A" && studyIds.has(s.student_id) && keep(s.day);
    });
    curve = Array.from({ length: maxNo }, (_, i) => {
      const ts = aTurns.filter((t) => sessionById.get(t.session_id)!.session_no === i + 1);
      const rl = (limit: number) => median(ts.filter((t) => t.time_limit_ms === limit && t.rl_status === "ok" && t.rl_ms !== null).map((t) => t.rl_ms! / 1000));
      const limited = ts.filter((t) => t.in_limit !== null);
      return {
        no: i + 1,
        byLimit: { "5000": rl(5000), "3000": rl(3000), "1500": rl(1500) },
        inLimitPct: limited.length ? (limited.filter((t) => t.in_limit).length / limited.length) * 100 : null,
        hintMean: mean(ts.map((t) => t.hint_level)),
        turns: ts.length,
      };
    });
  }

  // Khảo sát CH1 (ẩn danh, không gắn mã).
  const ch1: Dashboard["ch1"] = { connected: !!raw.sheets.F1, n: 0, byGrade: {}, items: [] };
  if (raw.sheets.F1) {
    const { headers } = raw.sheets.F1;
    const rows = raw.sheets.F1.rows.filter((r) => keep(vnDay(String(r[0] ?? ""))));
    const gradeOf = (r: unknown[]) => Number(/\d+/.exec(answer(headers, r, "A1") ?? "")?.[0] ?? NaN);
    ch1.n = rows.length;
    for (const r of rows) {
      const g = gradeOf(r);
      if (Number.isFinite(g)) ch1.byGrade[g] = (ch1.byGrade[g] ?? 0) + 1;
    }
    headers.forEach((h, i) => {
      if (!/^C\d+\.\s/.test(String(h))) return;
      const pct = (rs: unknown[][]) => {
        const v = rs.map((r) => Number(r[i])).filter((x) => x >= 1 && x <= 5);
        return v.length ? (v.filter((x) => x >= 4).length / v.length) * 100 : null;
      };
      const byGrade: Record<number, number | null> = {};
      for (const g of Object.keys(ch1.byGrade).map(Number)) byGrade[g] = pct(rows.filter((r) => gradeOf(r) === g));
      ch1.items.push({ title: String(h), n: rows.filter((r) => Number(r[i]) >= 1).length, agreePct: pct(rows), byGrade });
    });
  }

  // Phiếu cảm nhận: chỉ khi được xem nhóm (mỗi nhánh thuộc một chế độ).
  let perception: Dashboard["perception"] = null;
  if (showArms && raw.sheets.F7 && sF7) {
    const { headers } = raw.sheets.F7;
    const firstRows = [...sF7.first.values()].map((x) => x.row);
    const items = (prefix: "A" | "B") =>
      headers
        .map((h, i) => ({ h: String(h), i }))
        .filter(({ h }) => new RegExp(`^${prefix}\\d+\\.\\s`).test(h))
        .map(({ h, i }) => {
          const v = firstRows.map((r) => Number(r[i])).filter((x) => x >= 1 && x <= 5);
          return { title: h, mean: mean(v), n: v.length };
        });
    const branch = (r: unknown[]) => answer(headers, r, "P2");
    perception = { A: items("A"), B: items("B"), n: { A: firstRows.filter((r) => branch(r) === "Chế độ A").length, B: firstRows.filter((r) => branch(r) === "Chế độ B").length } };
  }

  // Khảo sát hằng tuần: đếm trên MỌI lần nộp (mỗi tuần một lần nộp là đúng, không phải bản trùng).
  const weekly: Dashboard["weekly"] = { connected: !!raw.sheets.F5, responses: 0, elsewhere: 0, otherTools: 0, contamination: 0, missed: 0, tech: [] };
  if (raw.sheets.F5) {
    const { headers } = raw.sheets.F5;
    const col = headers.findIndex((h) => /^mã học sinh/i.test(String(h).trim()));
    for (const r of raw.sheets.F5.rows.filter((r) => keep(vnDay(String(r[0] ?? ""))))) {
      weekly.responses++;
      if (answer(headers, r, "W1") === "Có") weekly.elsewhere++;
      if (answer(headers, r, "W4") === "Có") weekly.otherTools++;
      const w6 = answer(headers, r, "W6");
      if (w6 && w6 !== "Không") weekly.contamination++;
      const w9 = answer(headers, r, "W9");
      if (w9 && w9 !== "Không") weekly.missed++;
      const w7 = answer(headers, r, "W7");
      if (w7 && w7 !== "Không gặp vấn đề gì") {
        const w8 = answer(headers, r, "W8");
        weekly.tech.push({ code: String(r[col] ?? "").toUpperCase(), at: vnDay(String(r[0] ?? "")), text: w8 ? `${w7}: ${w8}` : w7 });
      }
    }
  }

  // ───────── Chất lượng dữ liệu: chỉ báo, không xóa hay loại gì ─────────
  const q: Issue[] = [];
  const active = study.filter((p) => !p.withdrawn);
  const push = (severity: Issue["severity"], title: string, rows: PersonRow[] | string[], detail?: string) => {
    const codes = (rows as (PersonRow | string)[]).map((r) => (typeof r === "string" ? r : r.code));
    if (codes.length) q.push({ severity, title: `${title} (${codes.length})`, codes, detail });
  };
  if (!anyRange) {
    push("warn", "Chưa làm xong bài kiểm tra nói đầu vào", active.filter((p) => p.pre.status !== "completed"));
    if (raw.postTestOpen) push("warn", "Chưa làm xong bài kiểm tra nói đầu ra", active.filter((p) => p.post.status !== "completed"));
    if (sF2) push("warn", "Chưa có FLCAS lần 1 (F2)", active.filter((p) => !p.flcasPre));
    if (sF3) push("warn", "Chưa có mini-test (F3)", active.filter((p) => p.mini === null));
    if (sF6 && raw.postTestOpen) push("warn", "Chưa có FLCAS lần 2 (F6)", active.filter((p) => !p.flcasPost));
    push("warn", "Chưa ghi nhận đủ phiếu đồng ý (phụ huynh + học sinh)", study.filter((p) => p.consent !== "full"), "Ghi bằng npm run research:consent");
    if (showArms) push("info", "Chưa chia nhóm A/B", raw.participants.filter((p) => !p.pilot && !p.arm).map((p) => p.code));
  }
  const pending = study.reduce((a, p) => a + p.pre.rlPending + p.post.rlPending, 0);
  if (pending) q.push({ severity: "warn", title: `${pending} câu kiểm tra chưa đo được RL`, detail: "Chạy npm run research:rescore để đo lại." });
  const unanswered = study.filter((p) => p.pre.status === "completed" && p.pre.items < 15);
  push("warn", "Bài đầu vào đã nộp nhưng thiếu câu ghi âm", unanswered, "Một bài đủ có 15 câu (không tính 2 câu mẫu).");
  push("info", "Đã rút khỏi nghiên cứu (vẫn giữ trong bảng, đánh dấu riêng)", study.filter((p) => p.withdrawn));
  push("warn", "Yêu cầu xóa dữ liệu chưa xử lý", study.filter((p) => p.deleteRequested), "Cần nhóm, cô Vân và người xây web xác nhận rồi mới xóa bằng tay.");
  const conflicts = finalsAll.filter((f) => f === "conflict").length;
  if (conflicts) q.push({ severity: "warn", title: `${conflicts} câu hai người chấm lệch nhau, chưa có điểm thống nhất`, detail: "Nhập điểm thống nhất bằng npm run research:import-scores -- --rater 0" });
  const known = new Set(raw.participants.map((p) => p.code));
  for (const [key, s] of [["F2", sF2], ["F3", sF3], ["F5", sF5], ["F6", sF6], ["F7", sF7]] as const) {
    if (!s) continue;
    if (key !== "F5" && s.duplicates.size) push("info", `${key}: mã nộp nhiều lần (dùng lần nộp ĐẦU TIÊN)`, [...s.duplicates.keys()]);
    if (s.invalid.length) q.push({ severity: "warn", title: `${key}: ${s.invalid.length} dòng không có mã học sinh hợp lệ (ghi họ tên hoặc gõ sai mã)`, detail: "Người giữ danh sách đối chiếu họ tên → mã rồi sửa ô đó trong Google Sheets (không xóa dòng). Tên không hiện trên trang này." });
    const unknown = [...s.first.keys()].filter((c) => !known.has(c));
    if (unknown.length) push("warn", `${key}: mã không có trong danh sách người tham gia`, unknown);
  }
  if (studySessions.length) push("info", "Chưa hoàn thành buổi luyện nào", active.filter((p) => armOf.get(p.code) && p.sessions.completed === 0));
  if (weekly.tech.length) q.push({ severity: "info", title: `Vấn đề kỹ thuật học sinh báo (${weekly.tech.length})`, detail: "Xem chi tiết ở phần Hằng tuần." });

  const people = showArms && opt.arm ? all.filter((p) => armOf.get(p.code) === opt.arm) : all;
  const arms = showArms
    ? { A: study.filter((p) => armOf.get(p.code) === "A").length, B: study.filter((p) => armOf.get(p.code) === "B").length, none: study.filter((p) => !armOf.get(p.code)).length }
    : null;

  return {
    showArms,
    counts: {
      participants: study.length,
      pilots: all.length - study.length,
      withdrawn: study.filter((p) => p.withdrawn).length,
      arms,
      preDone: study.filter((p) => p.pre.status === "completed").length,
      postDone: study.filter((p) => p.post.status === "completed").length,
      sessionsRecorded: studySessions.length,
      sessionsCompleted: studySessions.filter((s) => s.status === "completed").length,
      tenOrMore: study.filter((p) => p.sessions.tenMin >= 10).length,
      completionRate: study.length ? (study.filter((p) => p.post.status === "completed").length / study.length) * 100 : null,
    },
    people,
    speaking: {
      pre: split(testStats("pre")),
      post: split(testStats("post")),
      kappa: cohenKappa(pairs),
      responses: studyResponses.length,
      scored: finalsAll.filter((f) => typeof f === "number").length,
      conflicts,
    },
    anxiety: {
      connected: { pre: !!raw.sheets.F2, post: !!raw.sheets.F6 },
      pre: split(flcasStats("flcasPre")),
      post: split(flcasStats("flcasPost")),
      alphaPre,
      alphaPreSpeaking,
      pairs: study.filter((p) => p.flcasPre && p.flcasPost).length,
    },
    knowledge: {
      connected: !!raw.sheets.F3,
      mini: stat(study.map((p) => p.mini).filter((x): x is number => x !== null)),
      // Quy trình mục 4.2 (ngưỡng khóa trước): mini-test ≥ 16/20 và RL trung vị đầu vào > 3 giây.
      paperSlow: (() => {
        const el = study.filter((p) => p.mini !== null && p.pre.rlMedianMs !== null);
        return { eligible: el.length, count: el.filter((p) => p.mini! >= 16 && p.pre.rlMedianMs! > 3000).length };
      })(),
    },
    practice: { bySession, curve },
    ch1,
    perception,
    weekly,
    quality: q,
  };
}

