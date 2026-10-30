/**
 * Số liệu luyện tự do cho trang lớp của giáo viên (quy tắc thuần, có test). Không xếp hạng, không điểm tổng:
 * mỗi học sinh chỉ có số của chính mình; mỗi Unit chỉ đếm số bạn đã luyện.
 * Không import gì ngoài lib/reaction để test dùng lại được.
 */
import { sessionMedianThink, type ThinkAnswer } from "./reaction";

export type ClassSession = { studentId: string; unitId: string; status: string; completedAt: string | null; answers: ThinkAnswer[] };
export type StudentPractice = { doneThisWeek: number; lastMedianMs: number | null; lastMeasuredAt: string | null };

const VN_OFFSET_MS = 7 * 3600_000;
/** Thứ Hai đầu tuần (giờ Việt Nam) chứa thời điểm d, dạng "2026-11-09". */
export function vnWeekStart(d: Date): string {
  const local = new Date(d.getTime() + VN_OFFSET_MS);
  const dow = (local.getUTCDay() + 6) % 7;
  return new Date(local.getTime() - dow * 86_400_000).toISOString().slice(0, 10);
}

/** Mỗi học sinh: số buổi hoàn thành trong tuần này, và trung vị thời gian bắt đầu nói của buổi gần nhất có số đo. */
export function studentPractice(sessions: ClassSession[], now: Date): Map<string, StudentPractice> {
  const week = vnWeekStart(now);
  const out = new Map<string, StudentPractice>();
  const done = sessions.filter((s) => s.status === "completed" && s.completedAt).sort((a, b) => (a.completedAt! < b.completedAt! ? -1 : 1));
  for (const s of done) {
    const p = out.get(s.studentId) ?? { doneThisWeek: 0, lastMedianMs: null, lastMeasuredAt: null };
    if (vnWeekStart(new Date(s.completedAt!)) === week) p.doneThisWeek++;
    const m = sessionMedianThink(s.answers).medianMs;
    if (m !== null) {
      p.lastMedianMs = m;
      p.lastMeasuredAt = s.completedAt;
    }
    out.set(s.studentId, p);
  }
  return out;
}

/** Mỗi Unit: số học sinh khác nhau đã hoàn thành ít nhất một buổi. */
export function unitCoverage(sessions: ClassSession[]): Map<string, number> {
  const seen = new Map<string, Set<string>>();
  for (const s of sessions) {
    if (s.status !== "completed") continue;
    const set = seen.get(s.unitId) ?? new Set<string>();
    set.add(s.studentId);
    seen.set(s.unitId, set);
  }
  return new Map([...seen].map(([u, set]) => [u, set.size]));
}
