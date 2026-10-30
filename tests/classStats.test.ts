import { describe, expect, it } from "vitest";
import { studentPractice, unitCoverage, vnWeekStart, type ClassSession } from "@/lib/classStats";

const ses = (studentId: string, unitId: string, completedAt: string | null, thinks: (number | null)[], status = "completed"): ClassSession => ({
  studentId,
  unitId,
  status,
  completedAt,
  answers: thinks.map((t, i) => ({ questionId: `q${i}`, attemptNo: 1, thinkMs: t })),
});

describe("số liệu lớp cho giáo viên", () => {
  const now = new Date("2026-11-12T03:00:00Z"); // thứ Năm 12/11, giờ VN

  it("tuần bắt đầu thứ Hai theo giờ Việt Nam", () => {
    expect(vnWeekStart(now)).toBe("2026-11-09");
    expect(vnWeekStart(new Date("2026-11-08T18:00:00Z"))).toBe("2026-11-09"); // 01:00 thứ Hai giờ VN
  });

  it("đếm buổi hoàn thành trong tuần này, bỏ buổi dở và buổi tuần trước", () => {
    const m = studentPractice(
      [
        ses("a", "u1", "2026-11-10T10:00:00Z", [2000]),
        ses("a", "u1", "2026-11-11T10:00:00Z", [3000]),
        ses("a", "u1", "2026-11-05T10:00:00Z", [9000]),
        ses("a", "u2", null, [1000], "in_progress"),
      ],
      now,
    );
    expect(m.get("a")?.doneThisWeek).toBe(2);
  });

  it("thời gian bắt đầu nói là của buổi gần nhất CÓ số đo", () => {
    const m = studentPractice([ses("a", "u1", "2026-11-10T10:00:00Z", [2000, 4000, 3000]), ses("a", "u1", "2026-11-11T10:00:00Z", [null])], now);
    expect(m.get("a")).toEqual({ doneThisWeek: 2, lastMedianMs: 3000, lastMeasuredAt: "2026-11-10T10:00:00Z" });
  });

  it("chưa luyện thì không có dòng; mỗi Unit đếm số bạn khác nhau đã hoàn thành", () => {
    const list = [ses("a", "u1", "2026-11-10T10:00:00Z", [1]), ses("a", "u1", "2026-11-11T10:00:00Z", [1]), ses("b", "u1", "2026-11-11T10:00:00Z", [1]), ses("c", "u2", null, [], "in_progress")];
    expect(studentPractice(list, now).has("c")).toBe(false);
    expect([...unitCoverage(list)]).toEqual([["u1", 2]]);
  });
});
