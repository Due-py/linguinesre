/**
 * Báo cáo của một module (Assessment Layer): kiến thức qua các bài kiểm tra, và nói độc lập đầu module so với cuối module.
 * Mỗi tiêu chí đứng riêng (thời gian bắt đầu nói, số từ, lý do, đầy đủ ý, lỗi ngữ pháp, đúng câu hỏi, độ rõ); KHÔNG có điểm
 * tổng. Chỉ so sánh khi có đủ cả hai lần đo. Quy tắc thuần để test được.
 */
import type { VerifiedAssessment } from "./assessCore";
import { median, type QuizArea, type QuizSet, type Step } from "./plan";
import type { ModuleContent } from "./schema";

export type ReportAttempt = {
  day: number;
  t: Step["t"];
  ref: string;
  attemptNo: number;
  set: QuizSet | null;
  area: QuizArea | null;
  correct: boolean | null;
  /** Bước thuộc bài kiểm tra (không gợi ý). */
  test: boolean;
  measures: { words: number; thinkMs: number | null; clarity: number | null; wpm?: number | null; longPauses?: number } | null;
  check: { reason?: "yes" | "no" | "not_required"; requirements?: boolean[] } | null;
  ai: VerifiedAssessment | null;
};

export type Ratio = { correct: number; total: number };
export type KnowledgeResult = Ratio & { byArea: Partial<Record<QuizArea, Ratio>> };

export type SpeakSummary = {
  answers: number;
  medianThinkMs: number | null;
  meanWords: number | null;
  reason: { given: number; needed: number };
  /** Chỉ tính câu AI đã nhận xét được. */
  completeness: { brief: number; adequate: number; developed: number; assessed: number };
  grammar: { issues: number; assessed: number };
  onTopic: { yes: number; assessed: number };
  meanClarity: number | null;
};

export function knowledgeOf(attempts: ReportAttempt[], set: QuizSet): KnowledgeResult | null {
  const xs = attempts.filter((a) => a.t === "quiz" && a.set === set && a.attemptNo === 1);
  if (xs.length === 0) return null;
  const byArea: Partial<Record<QuizArea, Ratio>> = {};
  for (const a of xs) {
    if (!a.area) continue;
    const r = (byArea[a.area] ??= { correct: 0, total: 0 });
    r.total++;
    if (a.correct) r.correct++;
  }
  return { correct: xs.filter((a) => a.correct).length, total: xs.length, byArea };
}

export function summarizeSpeak(xs: ReportAttempt[]): SpeakSummary | null {
  if (xs.length === 0) return null;
  const words = xs.map((a) => a.measures?.words).filter((n): n is number => typeof n === "number");
  const clarity = xs.map((a) => a.measures?.clarity).filter((n): n is number => typeof n === "number");
  const s: SpeakSummary = {
    answers: xs.length,
    medianThinkMs: median(xs.map((a) => a.measures?.thinkMs).filter((n): n is number => typeof n === "number")),
    meanWords: words.length ? Math.round((words.reduce((p, n) => p + n, 0) / words.length) * 10) / 10 : null,
    reason: { given: 0, needed: 0 },
    completeness: { brief: 0, adequate: 0, developed: 0, assessed: 0 },
    grammar: { issues: 0, assessed: 0 },
    onTopic: { yes: 0, assessed: 0 },
    meanClarity: clarity.length ? Math.round((clarity.reduce((p, n) => p + n, 0) / clarity.length) * 100) / 100 : null,
  };
  for (const a of xs) {
    if (a.check?.reason && a.check.reason !== "not_required") {
      s.reason.needed++;
      if (a.check.reason === "yes") s.reason.given++;
    }
    const ai = a.ai;
    if (!ai) continue;
    if (ai.completeness.status === "assessed" && ai.completeness.level) {
      s.completeness.assessed++;
      s.completeness[ai.completeness.level]++;
    }
    if (ai.grammar.status === "assessed") {
      s.grammar.assessed++;
      s.grammar.issues += ai.grammar.issues.length;
    }
    if (ai.relevance.status === "assessed" && ai.relevance.on_topic !== null) {
      s.onTopic.assessed++;
      if (ai.relevance.on_topic) s.onTopic.yes++;
    }
  }
  return s;
}

export type ModuleReport = {
  knowledge: Record<"entry" | "check1" | "check2" | "final", KnowledgeResult | null>;
  speaking: { entry: SpeakSummary | null; final: SpeakSummary | null };
  /** Câu đã luyện (ngày 6–10, lượt đầu) so với câu mới hoàn toàn (ngày 13): phân biệt nhớ bài và tự vận dụng. */
  transfer: { practiced: SpeakSummary | null; fresh: SpeakSummary | null };
  roleplays: { ref: string; titleVi: string; level: string; met: number; total: number }[];
};

export function moduleReport(m: ModuleContent, attempts: ReportAttempt[]): ModuleReport {
  const entryIds = new Set(m.independent.filter((q) => q.set === "entry").map((q) => q.id));
  const finalIds = new Set(m.independent.filter((q) => q.set === "final").map((q) => q.id));
  const firstSpeak = attempts.filter((a) => a.t === "speak" && a.attemptNo === 1);
  const roleplays = m.roleplays
    .map((r) => {
      const last = attempts.filter((a) => a.t === "roleplay" && a.ref === r.id && a.check?.requirements).at(-1);
      const req = last?.check?.requirements ?? null;
      return req ? { ref: r.id, titleVi: r.titleVi, level: r.level, met: req.filter(Boolean).length, total: req.length } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  return {
    knowledge: {
      entry: knowledgeOf(attempts, "entry"),
      check1: knowledgeOf(attempts, "check1"),
      check2: knowledgeOf(attempts, "check2"),
      final: knowledgeOf(attempts, "final"),
    },
    speaking: {
      entry: summarizeSpeak(firstSpeak.filter((a) => entryIds.has(a.ref))),
      final: summarizeSpeak(firstSpeak.filter((a) => finalIds.has(a.ref))),
    },
    transfer: {
      practiced: summarizeSpeak(firstSpeak.filter((a) => !a.test && a.day >= 6 && a.day <= 10)),
      fresh: summarizeSpeak(firstSpeak.filter((a) => a.day === 13)),
    },
    roleplays,
  };
}
