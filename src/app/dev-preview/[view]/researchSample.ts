import type { Raw } from "@/lib/research/analysis";

/**
 * CHỈ ĐỂ XEM BỐ CỤC trang /research khi phát triển (dev-preview, 404 ở production).
 * Số sinh theo công thức cố định, KHÔNG phải dữ liệu nghiên cứu, không được dùng ở đâu khác.
 */
export function researchSample(): Raw {
  const n = 24;
  const r = (i: number, k: number) => ((i * 37 + k * 101) % 97) / 97; // giả ngẫu nhiên cố định
  const participants: Raw["participants"] = Array.from({ length: n }, (_, i) => ({
    student_id: `s${i}`,
    code: `HS${String(i + 1).padStart(3, "0")}`,
    grade: 8,
    form_order: i % 2 ? "BA" : "AB",
    arm: i < 22 ? (i % 2 ? "B" : "A") : null,
    pilot: false,
  }));
  const attempts: Raw["attempts"] = [];
  const responses: Raw["responses"] = [];
  const scores: Raw["scores"] = [];
  participants.forEach((p, i) => {
    for (const phase of ["pre", "post"] as const) {
      if (phase === "post" && i % 5 === 0) continue;
      const id = `${p.student_id}-${phase}`;
      attempts.push({ id, student_id: p.student_id, phase, form: "A", status: "completed", started_at: phase === "pre" ? "2026-11-12T02:00:00Z" : "2026-12-01T02:00:00Z" });
      for (let q = 0; q < 15; q++) {
        const rid = `${id}-${q}`;
        const rl = Math.round(1200 + r(i, q) * 4000 - (phase === "post" ? 400 : 0));
        responses.push({ id: rid, attempt_id: id, form: "A", rl_ms: q === 14 && i % 7 === 0 ? null : rl, rl_status: q === 14 && i % 7 === 0 ? "pending" : "ok" });
        if (i < 18) scores.push({ response_id: rid, rater: 1, score: r(i, q + 3) > 0.3 ? 2 : 1 });
      }
    }
  });
  const sessions: Raw["sessions"] = [];
  const turns: Raw["turns"] = [];
  participants.forEach((p, i) => {
    if (!p.arm) return;
    const count = 6 + Math.floor(r(i, 9) * 9);
    for (let s = 1; s <= count; s++) {
      const id = `${p.student_id}-m${s}`;
      sessions.push({ id, student_id: p.student_id, mode: p.arm, session_no: s, day: `2026-11-${String(15 + s).padStart(2, "0")}`, status: "completed", active_ms: 480_000 + Math.floor(r(i, s) * 400_000) });
      if (p.arm === "A")
        for (const limit of [5000, 3000, 1500])
          turns.push({ session_id: id, activity: "speed", time_limit_ms: limit, rl_ms: Math.round(2600 - s * 60 + r(i, s + limit) * 900), rl_status: "ok", in_limit: r(i, s) > 0.3, hint_level: Math.floor(r(i, s + 2) * 3) });
    }
  });
  const flcasHead = ["Dấu thời gian", "Mã học sinh của em", ...Array.from({ length: 33 }, (_, k) => `${k + 1}. câu ${k + 1}`)];
  const flcas = (shift: number) => ({
    headers: flcasHead,
    rows: participants.slice(0, 20).map((p, i) => ["2026-11-12T01:00:00Z", p.code, ...Array.from({ length: 33 }, (_, k) => Math.max(1, Math.min(5, Math.round(2 + r(i, k) * 3 - shift))))]),
  });
  return {
    participants,
    consent: participants.slice(0, 20).map((p) => ({ student_id: p.student_id, parent_consent_on: "2026-11-11", student_consent_on: "2026-11-11", withdrawn_on: null, withdraw_data: null })),
    attempts,
    responses,
    scores,
    sessions,
    turns,
    sheets: { F2: flcas(0), F6: flcas(0.4) },
    postTestOpen: true,
  };
}
