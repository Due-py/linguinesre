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
  /** Speed Q&A: bắt đầu nói kịp mục tiêu riêng không (null: không có mục tiêu hoặc không đo được). */
  inTarget?: boolean | null;
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

/**
 * Kiểm tra cuối mỗi giai đoạn (Knowledge Checkpoints). "Đạt" đo bằng số liệu thật, tách khỏi việc làm xong bài:
 * làm hết bài mà chưa đạt thì vẫn ghi "chưa đạt". pending: chưa làm bài kiểm tra đó.
 */
export type Checkpoint = { phase: number; day: number; titleVi: string; status: "met" | "not_met" | "pending"; detailVi: string; ruleVi: string };

/** Ngưỡng "đạt" của từng giai đoạn. Đặt ở một chỗ để thầy cô và nhóm dễ xem, dễ sửa. */
export const CHECKPOINT_RULES = {
  knowledge: 0.7, // Phase 1: đúng từ 70% câu kiến thức ngày 3
  guided: 0.7, // Phase 2: đúng từ 70% câu kiến thức ngày 7, và câu nói không gợi ý đủ ý ở đa số câu AI nhận xét được
  speed: 0.6, // Phase 3: kịp mục tiêu thời gian ở từ 60% câu kiểm tra ngày 10
} as const;

export type DelayedPair = { ref: string; before: { day: number; thinkMs: number | null; words: number | null }; after: { thinkMs: number | null; words: number | null } };

export type ModuleReport = {
  knowledge: Record<"entry" | "check1" | "check2" | "final", KnowledgeResult | null>;
  checkpoints: Checkpoint[];
  /** Câu hỏi nhắc lại: câu luyện có gợi ý ở ngày 4–8, hỏi lại không gợi ý ở ngày 13. */
  delayed: { pairs: DelayedPair[]; before: SpeakSummary | null; after: SpeakSummary | null };
  speaking: { entry: SpeakSummary | null; final: SpeakSummary | null };
  /** Câu đã luyện (ngày 6–10, lượt đầu) so với câu mới hoàn toàn (ngày 13, không tính câu nhắc lại): phân biệt nhớ bài và tự vận dụng. */
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
  const knowledge = {
    entry: knowledgeOf(attempts, "entry"),
    check1: knowledgeOf(attempts, "check1"),
    check2: knowledgeOf(attempts, "check2"),
    final: knowledgeOf(attempts, "final"),
  };
  // Câu nhắc lại: cùng câu, lượt đầu ở ngày 4–8 (có gợi ý) và ở ngày 13 (không gợi ý).
  const earlier = firstSpeak.filter((a) => !a.test && a.day >= 4 && a.day <= 8);
  const day13 = firstSpeak.filter((a) => a.day === 13);
  const pairs: DelayedPair[] = [];
  for (const b of day13) {
    const a = earlier.find((x) => x.ref === b.ref);
    if (a) pairs.push({ ref: b.ref, before: { day: a.day, thinkMs: a.measures?.thinkMs ?? null, words: a.measures?.words ?? null }, after: { thinkMs: b.measures?.thinkMs ?? null, words: b.measures?.words ?? null } });
  }
  const delayedRefs = new Set(pairs.map((x) => x.ref));
  return {
    knowledge,
    checkpoints: checkpoints(attempts, knowledge, roleplays),
    delayed: {
      pairs,
      before: summarizeSpeak(earlier.filter((a) => delayedRefs.has(a.ref))),
      after: summarizeSpeak(day13.filter((a) => delayedRefs.has(a.ref))),
    },
    speaking: {
      entry: summarizeSpeak(firstSpeak.filter((a) => entryIds.has(a.ref))),
      final: summarizeSpeak(firstSpeak.filter((a) => finalIds.has(a.ref))),
    },
    transfer: {
      practiced: summarizeSpeak(firstSpeak.filter((a) => !a.test && a.day >= 6 && a.day <= 10)),
      fresh: summarizeSpeak(day13.filter((a) => !delayedRefs.has(a.ref))),
    },
    roleplays,
  };
}

const pct = (r: Ratio) => Math.round((r.correct / r.total) * 100);

/** Kết quả kiểm tra cuối 4 giai đoạn đầu (giai đoạn 5 là cả báo cáo cuối module). Quy tắc thuần, test được. */
export function checkpoints(attempts: ReportAttempt[], k: ModuleReport["knowledge"], roleplays: ModuleReport["roleplays"]): Checkpoint[] {
  const out: Checkpoint[] = [];
  const R = CHECKPOINT_RULES;

  const c1 = k.check1;
  out.push({
    phase: 1,
    day: 3,
    titleVi: "Nền tảng: kiến thức",
    ruleVi: `Đúng từ ${R.knowledge * 100}% câu kiến thức.`,
    status: !c1 ? "pending" : c1.correct / c1.total >= R.knowledge ? "met" : "not_met",
    detailVi: c1 ? `Đúng ${c1.correct}/${c1.total} câu (${pct(c1)}%).` : "Chưa làm bài kiểm tra ngày 3.",
  });

  const c2 = k.check2;
  const day7 = summarizeSpeak(attempts.filter((a) => a.t === "speak" && a.attemptNo === 1 && a.test && a.day === 7));
  const enough = day7 && day7.completeness.assessed > 0 ? (day7.completeness.adequate + day7.completeness.developed) / day7.completeness.assessed : null;
  out.push({
    phase: 2,
    day: 7,
    titleVi: "Nói có hướng dẫn: tự nói không gợi ý",
    ruleVi: `Đúng từ ${R.guided * 100}% câu kiến thức, và đa số câu nói không gợi ý đủ ý (theo AI nhận xét).`,
    status: !c2 ? "pending" : c2.correct / c2.total >= R.guided && (enough === null || enough >= 0.5) ? "met" : "not_met",
    detailVi: c2
      ? `Kiến thức đúng ${c2.correct}/${c2.total} câu.` + (day7 && day7.completeness.assessed ? ` Câu nói đủ ý: ${day7.completeness.adequate + day7.completeness.developed}/${day7.completeness.assessed}.` : " Câu nói chưa có nhận xét của AI.")
      : "Chưa làm bài kiểm tra ngày 7.",
  });

  const day10 = attempts.filter((a) => a.t === "speak" && a.attemptNo === 1 && a.test && a.day === 10);
  const timed = day10.filter((a) => a.inTarget !== null && a.inTarget !== undefined);
  const hit = timed.filter((a) => a.inTarget).length;
  const guided = median(attempts.filter((a) => a.t === "speak" && a.attemptNo === 1 && a.day === 6).map((a) => a.measures?.thinkMs).filter((n): n is number => typeof n === "number"));
  const now = median(day10.map((a) => a.measures?.thinkMs).filter((n): n is number => typeof n === "number"));
  const sec = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} giây`;
  out.push({
    phase: 3,
    day: 10,
    titleVi: "Phản xạ: câu chưa luyện, không gợi ý",
    ruleVi: `Kịp mục tiêu thời gian riêng ở từ ${R.speed * 100}% câu kiểm tra.`,
    status: day10.length === 0 ? "pending" : timed.length > 0 && hit / timed.length >= R.speed ? "met" : "not_met",
    detailVi:
      day10.length === 0
        ? "Chưa làm bài kiểm tra ngày 10."
        : `Kịp mục tiêu ${hit}/${timed.length} câu.` + (now !== null && guided !== null ? ` Thời gian bắt đầu nói: ${sec(now)} (ngày 6 có gợi ý: ${sec(guided)}).` : ""),
  });

  const day12 = summarizeSpeak(attempts.filter((a) => a.t === "speak" && a.attemptNo === 1 && a.test && a.day === 12));
  const rp = roleplays.filter((r) => r.level === "basic" || r.level === "advanced");
  const rpFull = rp.filter((r) => r.met === r.total).length;
  out.push({
    phase: 4,
    day: 12,
    titleVi: "Giao tiếp thật: roleplay và nói tình huống",
    ruleVi: "Đạt hết yêu cầu ở ít nhất một nửa số tình huống roleplay, và câu nói tình huống đúng câu hỏi.",
    status:
      !day12 && rp.length === 0
        ? "pending"
        : rp.length > 0 && rpFull * 2 >= rp.length && (!day12 || day12.onTopic.assessed === 0 || day12.onTopic.yes === day12.onTopic.assessed)
          ? "met"
          : "not_met",
    detailVi:
      (rp.length ? `Roleplay đạt hết yêu cầu: ${rpFull}/${rp.length} tình huống.` : "Chưa có roleplay.") +
      (day12 ? (day12.onTopic.assessed ? ` Câu tình huống ${day12.onTopic.yes === day12.onTopic.assessed ? "đúng" : "chưa đúng"} câu hỏi.` : " Câu tình huống chưa có nhận xét của AI.") : " Chưa làm câu tình huống ngày 12."),
  });
  return out;
}
