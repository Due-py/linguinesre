"use client";

import type { FeedbackView } from "@/app/(student)/student/practice/actions";
import FeedbackPanel, { AttemptCompare } from "@/components/FeedbackPanel";
import SessionReport from "@/components/SessionReport";

/** CHỈ DÙNG KHI PHÁT TRIỂN: dữ liệu mẫu để xem bố cục phần phản hồi. Gắn mock = true nên luôn hiện nhãn mô phỏng. */
const first: FeedbackView = {
  attemptNo: 1,
  status: "ok",
  mock: true,
  measures: { thinkMs: 3400, speakMs: 5200, words: 14, keywords: { total: 3, used: ["hang out"] }, reason: "no" },
  ai: {
    content: { status: "assessed", comment_vi: "Em đã nói về việc thích chơi bóng đá, đúng chủ đề thời gian rảnh." },
    grammar: {
      status: "assessed",
      issues: [
        { quote: "like play football", fix: "like playing football", explanation_vi: "Sau “like”, em dùng động từ thêm -ing." },
        { quote: "my brother go to the park", fix: "my brother went to the park", explanation_vi: "“Yesterday” cần động từ quá khứ là “went”." },
      ],
    },
    vocabulary: { status: "assessed", comment_vi: "Em dùng từ “football” và “park” phù hợp, dễ hiểu." },
    completeness: { status: "assessed", level: "adequate", comment_vi: "Em có một ý chính rõ ràng." },
    improved_sentence: "I like playing football, and yesterday my brother went to the park with me.",
    dropped_issues: 0,
  },
};
const second: FeedbackView = {
  ...first,
  attemptNo: 2,
  measures: { ...first.measures, words: 19, keywords: { total: 3, used: ["hang out", "do puzzles"] }, reason: "yes" },
  ai: { ...first.ai!, grammar: { status: "assessed", issues: [] }, completeness: { status: "assessed", level: "developed", comment_vi: "Có ý chính và lý do." } },
};
const failed: FeedbackView = { ...first, attemptNo: 1, status: "failed", ai: null };

/** Trang tổng kết với dữ liệu mẫu: câu 1 nói 2 lần, câu 2 chưa có nhận xét, câu 3 chưa trả lời. */
export function ReportPreview() {
  const attempt = (n: number, view: FeedbackView, transcript: string, hintLevel = 0) => ({
    answerId: `a${n}${view.attemptNo}`,
    attemptNo: view.attemptNo,
    transcript,
    hintLevel,
    audioUrl: null,
    view,
  });
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <SessionReport
        mode="student"
        back={{ href: "#", label: "Về lịch sử luyện tập" }}
        report={{
          id: "00000000-0000-0000-0000-000000000000",
          studentId: "x",
          unitId: "u1",
          unitTitle: "Leisure Time",
          unitNo: 1,
          status: "in_progress",
          answered: 2,
          total: 3,
          startedAt: "2026-10-27T08:00:00Z",
          completedAt: null,
          questions: [
            {
              id: "q1",
              text: "What do you usually do in your free time?",
              attempts: [
                attempt(1, first, "I like play football and yesterday my brother go to the park with me.", 2),
                attempt(1, second, "I like playing football because it is fun, and I often hang out with friends."),
              ],
            },
            { id: "q2", text: "Who do you often spend your free time with?", attempts: [attempt(2, failed, "My friend.")] },
            { id: "q3", text: "Which leisure activity do you like most? Why?", attempts: [] },
          ],
        }}
      />
    </main>
  );
}

export default function FeedbackPreview() {
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-extrabold">Xem mẫu: phản hồi một câu trả lời</h1>
      <FeedbackPanel view={first} loading={false} error={null} onRetry={() => {}} />
      <h2 className="text-xl font-extrabold">Lần 2 và so sánh</h2>
      <FeedbackPanel view={second} loading={false} error={null} onRetry={() => {}} />
      <AttemptCompare before={first} after={second} />
      <h2 className="text-xl font-extrabold">Khi AI lỗi</h2>
      <FeedbackPanel view={failed} loading={false} error={null} onRetry={() => {}} />
      <h2 className="text-xl font-extrabold">Đang tải</h2>
      <FeedbackPanel view={null} loading error={null} onRetry={() => {}} />
    </main>
  );
}
