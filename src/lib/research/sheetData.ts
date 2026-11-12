/**
 * Đọc dữ liệu Google Sheets (câu trả lời Google Forms) do cổng Apps Script trả về. File thuần để test.
 * Không xóa hay "sửa" dòng nào: bản trùng, mã sai đều được giữ lại và báo ở mục Chất lượng dữ liệu.
 */
import { normalizeCode } from "./code";

export type SheetData = { headers: string[]; rows: unknown[][] };

export type CodedRow = { code: string; at: string | null; row: unknown[] };
export type CodedSheet = {
  /** Lần nộp ĐẦU TIÊN của mỗi mã (quy tắc cố định: không chọn lần nộp "đẹp" hơn). */
  first: Map<string, CodedRow>;
  /** Mã nộp nhiều hơn một lần → số lần nộp. */
  duplicates: Map<string, number>;
  /** Dòng có mã không đúng dạng (VD gõ tên thay vì mã): giữ nguyên chữ để nhóm tự sửa trong Sheets. */
  invalid: string[];
  total: number;
};

export const codeColumn = (headers: string[]) => headers.findIndex((h) => /^mã học sinh/i.test(String(h).trim()));

export function byCode(data: SheetData): CodedSheet {
  const col = codeColumn(data.headers);
  const first = new Map<string, CodedRow>();
  const count = new Map<string, number>();
  const invalid: string[] = [];
  const rows = [...data.rows].sort((a, b) => String(a[0] ?? "").localeCompare(String(b[0] ?? "")));
  for (const row of rows) {
    const raw = col >= 0 ? String(row[col] ?? "") : "";
    const code = normalizeCode(raw);
    if (!code) {
      invalid.push(raw.slice(0, 40));
      continue;
    }
    count.set(code, (count.get(code) ?? 0) + 1);
    if (!first.has(code)) first.set(code, { code, at: row[0] ? String(row[0]) : null, row });
  }
  const duplicates = new Map([...count].filter(([, n]) => n > 1));
  return { first, duplicates, invalid, total: data.rows.length };
}

/** Điểm bài trắc nghiệm Google Forms: cột "Score" / "Điểm" / "Tổng điểm", dạng "15 / 20" hoặc số. */
export function quizScore(headers: string[], row: unknown[]): number | null {
  const i = headers.findIndex((h) => /^(score|điểm|tổng điểm|total score)$/i.test(String(h).trim()));
  if (i < 0) return null;
  const v = row[i];
  if (typeof v === "number") return v;
  const m = /^\s*(\d+(?:[.,]\d+)?)/.exec(String(v ?? ""));
  return m ? Number(m[1].replace(",", ".")) : null;
}

/** Giá trị một câu theo tiền tố tiêu đề (VD "W1."). */
export function answer(headers: string[], row: unknown[], prefix: string): string | null {
  const i = headers.findIndex((h) => String(h).trim().startsWith(prefix + "."));
  if (i < 0) return null;
  const v = row[i];
  return v === null || v === undefined || v === "" ? null : String(v);
}
