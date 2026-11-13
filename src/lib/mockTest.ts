/**
 * Bài thi thử nói (một lần, mỗi khối một đề). File thuần: đọc đề và chấm nội dung một câu trả lời bằng quy tắc (không AI).
 * Khác dạng bài kiểm tra nghiên cứu: không đo thời gian bắt đầu nói, không tiếng bíp.
 */
import g6 from "../../content/mock-tests/grade-6.json";
import g7 from "../../content/mock-tests/grade-7.json";
import g8 from "../../content/mock-tests/grade-8.json";
import g9 from "../../content/mock-tests/grade-9.json";
import g10 from "../../content/mock-tests/grade-10.json";
import g11 from "../../content/mock-tests/grade-11.json";
import g12 from "../../content/mock-tests/grade-12.json";
import { givesReason, isEcho } from "./module/copyCheck";

export type MockQuestion = { id: string; kind: "personal" | "reason" | "situation"; unit: number; text: string; expectsReason: boolean };
export type MockTest = { grade: number; title: string; topics: string; note: string; questions: MockQuestion[] };

const TESTS: Record<number, MockTest> = { 6: g6, 7: g7, 8: g8, 9: g9, 10: g10, 11: g11, 12: g12 } as Record<number, MockTest>;

export const mockTestFor = (grade: number | null | undefined): MockTest | null => (grade ? (TESTS[grade] ?? null) : null);
export const allMockTests = (): MockTest[] => Object.values(TESTS);

export type MockChecks = {
  /** Số từ em nói (không tính uh/um). */
  words: number;
  /** Thành câu: từ 5 từ trở lên. */
  sentence: boolean;
  /** Có nêu lý do (chỉ với câu hỏi cần lý do). null = câu này không cần. */
  reason: boolean | null;
  /** Đọc lại câu hỏi thay vì trả lời. */
  echo: boolean;
  /** Đạt: thành câu, không đọc lại câu hỏi, có lý do khi cần. */
  ok: boolean;
};

const FILLER = /^(uh+|um+|er+|erm|ah+|hmm+|mm+)$/i;

export function checkMockAnswer(transcript: string, q: MockQuestion): MockChecks {
  const words = (transcript.toLowerCase().match(/[a-z']+/g) ?? []).filter((w) => !FILLER.test(w)).length;
  const echo = isEcho(transcript, q.text);
  const sentence = words >= 5 && !echo;
  const reason = q.expectsReason ? !echo && givesReason(transcript) : null;
  return { words, sentence, reason, echo, ok: sentence && reason !== false };
}
