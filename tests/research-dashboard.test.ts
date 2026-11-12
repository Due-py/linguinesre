import { describe, expect, it } from "vitest";
import { buildDashboard, vnDay, type Raw } from "@/lib/research/analysis";

/** Dữ liệu thử tự dựng (KHÔNG phải dữ liệu nghiên cứu): 4 học sinh, 1 thử đề, đủ trường hợp khó. */
function raw(): Raw {
  const participants: Raw["participants"] = [
    { student_id: "s1", code: "HS001", grade: 8, form_order: "AB", arm: "A", pilot: false },
    { student_id: "s2", code: "HS002", grade: 8, form_order: "BA", arm: "B", pilot: false },
    { student_id: "s3", code: "HS003", grade: 8, form_order: "AB", arm: "A", pilot: false },
    { student_id: "s4", code: "HS004", grade: 8, form_order: "BA", arm: null, pilot: false },
    { student_id: "p1", code: "HS090", grade: 9, form_order: "AB", arm: null, pilot: true },
  ];
  const attempts: Raw["attempts"] = [
    { id: "a1", student_id: "s1", phase: "pre", form: "A", status: "completed", started_at: "2026-11-12T02:00:00Z" },
    { id: "a2", student_id: "s2", phase: "pre", form: "B", status: "completed", started_at: "2026-11-12T03:00:00Z" },
    { id: "a3", student_id: "s3", phase: "pre", form: "A", status: "in_progress", started_at: "2026-11-12T04:00:00Z" },
    { id: "ap", student_id: "p1", phase: "pre", form: "A", status: "completed", started_at: "2026-11-10T02:00:00Z" },
  ];
  // s1: 3 câu (RL 1, 2, 10 giây – câu cuối không trả lời) + 1 câu mẫu W không tính. s2: 2 câu, một câu chưa đo.
  const responses: Raw["responses"] = [
    { id: "r1", attempt_id: "a1", form: "A", rl_ms: 1000, rl_status: "ok" },
    { id: "r2", attempt_id: "a1", form: "A", rl_ms: 2000, rl_status: "ok" },
    { id: "r3", attempt_id: "a1", form: "A", rl_ms: 10000, rl_status: "no_response" },
    { id: "rw", attempt_id: "a1", form: "W", rl_ms: 9000, rl_status: "ok" },
    { id: "r4", attempt_id: "a2", form: "B", rl_ms: 4000, rl_status: "ok" },
    { id: "r5", attempt_id: "a2", form: "B", rl_ms: null, rl_status: "pending" },
    { id: "rp", attempt_id: "ap", form: "A", rl_ms: 500, rl_status: "ok" },
  ];
  const scores: Raw["scores"] = [
    { response_id: "r1", rater: 1, score: 2 },
    { response_id: "r1", rater: 2, score: 2 },
    { response_id: "r2", rater: 1, score: 1 },
    { response_id: "r2", rater: 2, score: 2 }, // lệch, chưa thống nhất
    { response_id: "r3", rater: 2, score: 0 },
    { response_id: "r4", rater: 1, score: 2 },
    { response_id: "r5", rater: 1, score: 1 },
    { response_id: "r5", rater: 2, score: 2 },
    { response_id: "r5", rater: 0, score: 2 }, // đã thống nhất
  ];
  const sessions: Raw["sessions"] = [
    { id: "m1", student_id: "s1", mode: "A", session_no: 1, day: "2026-11-16", status: "completed", active_ms: 700_000 },
    { id: "m2", student_id: "s1", mode: "A", session_no: 2, day: "2026-11-17", status: "completed", active_ms: 300_000 },
    { id: "m3", student_id: "s2", mode: "B", session_no: 1, day: "2026-11-16", status: "completed", active_ms: 800_000 },
  ];
  const turns: Raw["turns"] = [
    { session_id: "m1", activity: "speed", time_limit_ms: 5000, rl_ms: 2400, rl_status: "ok", in_limit: true, hint_level: 0 },
    { session_id: "m1", activity: "speed", time_limit_ms: 5000, rl_ms: 3000, rl_status: "ok", in_limit: true, hint_level: 2 },
    { session_id: "m3", activity: "read_aloud", time_limit_ms: null, rl_ms: null, rl_status: "not_measured", in_limit: null, hint_level: 0 },
  ];
  const flcasHead = ["Dấu thời gian", "Mã học sinh của em", ...Array.from({ length: 33 }, (_, i) => `${i + 1}. câu ${i + 1}`)];
  return {
    participants,
    consent: [{ student_id: "s1", parent_consent_on: "2026-11-11", student_consent_on: "2026-11-11", withdrawn_on: null, withdraw_data: null }],
    attempts,
    responses,
    scores,
    sessions,
    turns,
    sheets: {
      F2: {
        headers: flcasHead,
        rows: [
          ["2026-11-12T01:00:00Z", "HS001", ...Array(33).fill(3)],
          ["2026-11-13T01:00:00Z", "hs001", ...Array(33).fill(5)], // nộp lại: giữ lần đầu, báo trùng
          ["2026-11-12T01:00:00Z", "Lan 8A1", ...Array(33).fill(3)], // gõ tên thay mã: báo, không dùng
        ],
      },
    },
    postTestOpen: false,
  };
}

describe("trang thống kê: xem mù không lộ nhóm", () => {
  it("mức blind: không có nhóm A/B ở bất kỳ đâu", () => {
    const d = buildDashboard(raw(), { showArms: false, arm: "A" });
    const text = JSON.stringify(d);
    expect(d.people.every((p) => p.arm === null)).toBe(true);
    expect(d.counts.arms).toBeNull();
    expect(d.speaking.pre.A).toBeUndefined();
    expect(d.practice.curve).toBeNull();
    expect(d.perception).toBeNull();
    expect(d.practice.bySession[0]).toEqual({ no: 1, all: 2 });
    expect(text).not.toMatch(/"arm":"[AB]"|"A":\{|Chưa chia nhóm/);
    // Lọc theo nhóm bị bỏ qua khi xem mù.
    expect(d.people).toHaveLength(5);
  });

  it("mức key: có nhóm, tách số liệu theo nhóm, lọc được", () => {
    const d = buildDashboard(raw(), { showArms: true, arm: "A" });
    expect(d.counts.arms).toEqual({ A: 2, B: 1, none: 1 });
    expect(d.people.map((p) => p.code)).toEqual(["HS001", "HS003"]);
    expect(d.speaking.pre.A!.rl.n).toBe(1);
    expect(d.practice.curve![0].byLimit["5000"]).toBe(2.7);
  });
});

describe("trang thống kê: tính đúng", () => {
  const d = buildDashboard(raw(), { showArms: true });
  const p = (c: string) => d.people.find((x) => x.code === c)!;

  it("RL học sinh = trung vị các câu (câu mẫu không tính, không trả lời = 10 giây)", () => {
    expect(p("HS001").pre.rlMedianMs).toBe(2000);
    expect(p("HS001").pre.items).toBe(3);
    expect(p("HS001").pre.rlNoResponse).toBe(1);
    expect(p("HS002").pre.rlMedianMs).toBe(4000);
    expect(p("HS002").pre.rlPending).toBe(1);
  });

  it("điểm 0–2: lệch mà chưa thống nhất thì chưa có ĐTB; có điểm thống nhất thì dùng", () => {
    expect(p("HS001").pre.conflicts).toBe(1);
    expect(p("HS001").pre.dtb).toBeNull();
    expect(p("HS002").pre.dtb).toBe(2);
    expect(p("HS002").pre.acc).toBe(100);
    expect(d.speaking.kappa.n).toBe(3);
    expect(d.speaking.conflicts).toBe(1);
  });

  it("thử đề không vào số liệu, nhưng vẫn được đếm riêng", () => {
    expect(d.counts.participants).toBe(4);
    expect(d.counts.pilots).toBe(1);
    expect(d.speaking.responses).toBe(5);
    expect(d.speaking.pre.all.rl.n).toBe(2);
  });

  it("buổi luyện: đếm buổi ≥ 10 phút, phút luyện", () => {
    expect(p("HS001").sessions).toMatchObject({ completed: 2, tenMin: 1, minutes: 17 });
  });

  it("Google Sheets: giữ lần nộp đầu, báo trùng và mã sai, không bỏ người thiếu dữ liệu", () => {
    expect(p("HS001").flcasPre!.mean).toBe(3);
    const titles = d.quality.map((q) => q.title).join(" | ");
    expect(titles).toMatch(/F2: mã nộp nhiều lần/);
    expect(titles).toMatch(/F2: 1 dòng không có mã học sinh hợp lệ/);
    expect(titles).toMatch(/Chưa có FLCAS lần 1 \(F2\) \(3\)/);
    expect(titles).toMatch(/chưa đo được RL/);
    expect(titles).toMatch(/lệch nhau/);
    expect(titles).toMatch(/phiếu đồng ý.*\(3\)/);
    expect(d.people).toHaveLength(5);
  });

  it("lọc thời gian chỉ đếm dữ liệu trong khoảng", () => {
    const f = buildDashboard(raw(), { showArms: true, from: "2026-11-17", to: "2026-11-30" });
    expect(f.counts.sessionsRecorded).toBe(1);
    expect(f.people.find((x) => x.code === "HS001")!.pre.status).toBe("none");
  });

  it("ngày theo giờ Việt Nam", () => {
    expect(vnDay("2026-11-16T18:00:00Z")).toBe("2026-11-17");
  });
});
