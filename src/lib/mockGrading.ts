/**
 * Chấm bài thi thử nói ở trang giáo viên. File thuần (không gọi cơ sở dữ liệu) để kiểm thử được.
 * Điểm từng câu = điểm thầy cô nếu đã chấm, không thì điểm AI gợi ý (xem mockAiGrade.ts).
 * Thang chấm mỗi câu: 2 = đúng ý, thành câu, câu "Why" có lý do · 1 = đúng ý nhưng ngắn / thiếu lý do · 0 = không trả lời,
 * không nghe rõ, lạc đề hoặc đọc lại câu hỏi. KHÔNG cộng điểm tổng (nguyên tắc sản phẩm): chỉ đếm số câu đạt 2.
 */

export const MOCK_QIDS = Array.from({ length: 10 }, (_, i) => `q${String(i + 1).padStart(2, "0")}`);
export const SCORE_GUIDE: Record<0 | 1 | 2, string> = {
  2: "Đúng ý, thành câu (từ 5 từ), câu “Why” có lý do",
  1: "Đúng ý nhưng ngắn / chưa thành câu, hoặc thiếu lý do",
  0: "Không trả lời, không nghe rõ, lạc đề hoặc đọc lại câu hỏi",
};

export type MockStatus = "not_sent" | "not_started" | "in_progress" | "submitted" | "graded";
export const STATUS_LABEL: Record<MockStatus, string> = {
  not_sent: "Không được giao",
  not_started: "Chưa mở bài",
  in_progress: "Đang làm",
  submitted: "Đã nộp, chờ chấm",
  graded: "Đã chấm xong",
};

export type StudentMock = {
  status: MockStatus;
  answered: number;
  /** Các câu em đã nói (có bản ghi). */
  said: string[];
  /** Điểm cuối từng câu: điểm thầy cô nếu có, không thì điểm AI. */
  scores: Record<string, number>;
  /** Nguồn điểm từng câu. */
  source: Record<string, "teacher" | "ai">;
  graded: number;
  /** Số câu thầy cô đã tự chấm (đè điểm AI). */
  byTeacher: number;
  full: number;
  submittedAt: string | null;
};

export function studentMock(input: {
  invited: boolean;
  completedAt: string | null;
  answeredQids: string[];
  grades: { question_id: string; score: number }[];
  aiGrades?: { question_id: string; score: number }[];
  reviewDone: boolean;
}): StudentMock {
  const said = MOCK_QIDS.filter((q) => input.answeredQids.includes(q));
  const answered = said.length;
  const scores: Record<string, number> = {};
  const source: Record<string, "teacher" | "ai"> = {};
  for (const g of input.aiGrades ?? [])
    if (MOCK_QIDS.includes(g.question_id)) {
      scores[g.question_id] = g.score;
      source[g.question_id] = "ai";
    }
  for (const g of input.grades)
    if (MOCK_QIDS.includes(g.question_id)) {
      scores[g.question_id] = g.score;
      source[g.question_id] = "teacher";
    }
  const byTeacher = Object.values(source).filter((v) => v === "teacher").length;
  const graded = Object.keys(scores).length;
  const full = Object.values(scores).filter((s) => s === 2).length;
  const status: MockStatus = !input.invited
    ? "not_sent"
    : input.reviewDone
      ? "graded"
      : input.completedAt
        ? "submitted"
        : answered > 0
          ? "in_progress"
          : "not_started";
  return { status, answered, said, scores, source, graded, byTeacher, full, submittedAt: input.completedAt };
}

/** Theo từng câu, cả lớp: bao nhiêu bạn được 2, 1, 0 (chỉ tính câu đã chấm). */
export function questionSpread(students: StudentMock[]): { qid: string; two: number; one: number; zero: number }[] {
  return MOCK_QIDS.map((qid) => {
    const s = students.map((x) => x.scores[qid]).filter((v): v is number => v !== undefined);
    return { qid, two: s.filter((v) => v === 2).length, one: s.filter((v) => v === 1).length, zero: s.filter((v) => v === 0).length };
  });
}

export function statusCounts(students: StudentMock[]): Record<MockStatus, number> {
  const c: Record<MockStatus, number> = { not_sent: 0, not_started: 0, in_progress: 0, submitted: 0, graded: 0 };
  for (const s of students) c[s.status]++;
  return c;
}

export const qLabel = (qid: string) => `C${Number(qid.slice(1))}`;
