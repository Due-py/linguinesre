import type { FeedbackView } from "@/app/(student)/student/practice/actions";
import type { Measures } from "@/lib/feedback/measures";

/**
 * Tổng kết buổi luyện bằng QUY TẮC CỐ ĐỊNH (không qua AI). Mỗi câu chỉ tính lần trả lời cuối cùng.
 * Không có điểm tổng; mục tiêu buổi sau luôn kèm căn cứ (số đo nào dẫn tới mục tiêu đó).
 */

export type ReportAttempt = {
  answerId: string;
  attemptNo: number;
  transcript: string;
  hintLevel: number;
  audioUrl: string | null;
  /** Đo trực tiếp + AI nhận xét (status "failed" và ai = null khi chưa có nhận xét). */
  view: FeedbackView;
};
export type ReportQuestion = { id: string; text: string; attempts: ReportAttempt[] };

export const latestAttempt = (q: ReportQuestion): ReportAttempt | null =>
  q.attempts.reduce<ReportAttempt | null>((best, a) => (!best || a.attemptNo > best.attemptNo ? a : best), null);

export type Goal = { key: "reason" | "longer" | "keywords" | "keep"; title: string; detail: string; basis: string };

/** Dưới số từ này thì coi là câu trả lời ngắn. */
export const SHORT_ANSWER_WORDS = 8;

/** Chọn MỘT mục tiêu cho buổi sau theo thứ tự ưu tiên cố định. Không có câu trả lời nào thì trả null. */
export function pickGoal(measures: Measures[]): Goal | null {
  const n = measures.length;
  if (n === 0) return null;

  const needReason = measures.filter((m) => m.reason !== "not_required");
  const noReason = needReason.filter((m) => m.reason === "no").length;
  if (needReason.length > 0 && noReason * 2 >= needReason.length) {
    return {
      key: "reason",
      title: "Thêm lý do cho câu trả lời",
      detail: "Sau ý chính, nói tiếp một lý do với “because…” hoặc “so…”.",
      basis: `${noReason}/${needReason.length} câu hỏi cần lý do chưa có từ nối lý do.`,
    };
  }
  const short = measures.filter((m) => m.words < SHORT_ANSWER_WORDS).length;
  if (short * 2 >= n) {
    return {
      key: "longer",
      title: "Nói dài hơn một chút",
      detail: "Thêm một chi tiết: khi nào, với ai, hoặc ở đâu.",
      basis: `${short}/${n} câu trả lời có dưới ${SHORT_ANSWER_WORDS} từ.`,
    };
  }
  const kwTotal = measures.reduce((s, m) => s + m.keywords.total, 0);
  const kwUsed = measures.reduce((s, m) => s + m.keywords.used.length, 0);
  if (kwTotal > 0 && kwUsed * 3 < kwTotal) {
    return {
      key: "keywords",
      title: "Dùng thêm từ của Unit",
      detail: "Đọc lại từ vựng ở phần khởi động và thử đưa vào câu trả lời.",
      basis: `Bạn dùng ${kwUsed}/${kwTotal} từ gợi ý của các câu hỏi.`,
    };
  }
  return {
    key: "keep",
    title: "Giữ nhịp này",
    detail: "Thử một Unit mới, hoặc trả lời mà chưa cần mở gợi ý.",
    basis: "Câu trả lời có lý do, đủ dài và có dùng từ của Unit.",
  };
}

export type SessionStats = {
  answered: number;
  total: number;
  /** Số câu có mở gợi ý (lần cuối). Chỉ để ghi nhận, không bị trừ gì. */
  withHints: number;
  retries: number;
  /** Trung bình thời gian suy nghĩ của các câu đo được (ước lượng của trình duyệt). */
  avgThinkMs: number | null;
  issues: { questionText: string; quote: string; fix: string; explanation: string }[];
  /** Có nhận xét nào là dữ liệu mô phỏng (MOCK_AI=1) không: giao diện phải ghi rõ. */
  mock: boolean;
  goal: Goal | null;
};

export function sessionStats(questions: ReportQuestion[]): SessionStats {
  const last = questions.map((q) => ({ q, a: latestAttempt(q) })).filter((x): x is { q: ReportQuestion; a: ReportAttempt } => !!x.a);
  const thinks = last.map((x) => x.a.view.measures.thinkMs).filter((v): v is number => v !== null);
  return {
    answered: last.length,
    total: questions.length,
    withHints: last.filter((x) => x.a.hintLevel > 0).length,
    retries: questions.reduce((s, q) => s + Math.max(0, q.attempts.length - 1), 0),
    avgThinkMs: thinks.length ? Math.round(thinks.reduce((s, v) => s + v, 0) / thinks.length) : null,
    issues: last.flatMap((x) =>
      (x.a.view.ai?.grammar.issues ?? []).map((i) => ({ questionText: x.q.text, quote: i.quote, fix: i.fix, explanation: i.explanation_vi })),
    ),
    mock: last.some((x) => x.a.view.mock),
    goal: pickGoal(last.map((x) => x.a.view.measures)),
  };
}

/** Số buổi hoàn thành tối thiểu trước khi dashboard nêu "điểm cần cải thiện" (ít hơn thì dữ liệu chưa đủ để kết luận). */
export const FOCUS_MIN_SESSIONS = 3;
