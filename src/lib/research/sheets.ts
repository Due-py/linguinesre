import "server-only";
import type { SheetData } from "./sheetData";

/**
 * Đọc câu trả lời Google Forms qua cổng Apps Script (research-system/google-apps-script/Main.gs, hàm doGet).
 * RESEARCH_SHEETS_URL và RESEARCH_SHEETS_SECRET chỉ ở máy chủ (Vercel / .env.local), không bao giờ gửi xuống trình duyệt.
 */
export type SheetResult = { state: "ok"; data: SheetData } | { state: "not_configured" | "not_created" | "error"; message?: string };

export const sheetsConfigured = () => !!process.env.RESEARCH_SHEETS_URL && !!process.env.RESEARCH_SHEETS_SECRET;

export async function fetchSheet(form: string): Promise<SheetResult> {
  const base = process.env.RESEARCH_SHEETS_URL;
  const secret = process.env.RESEARCH_SHEETS_SECRET;
  if (!base || !secret) return { state: "not_configured" };
  try {
    const url = `${base}?form=${encodeURIComponent(form)}&secret=${encodeURIComponent(secret)}`;
    const res = await fetch(url, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return { state: "error", message: `HTTP ${res.status}` };
    const json = (await res.json()) as { ok: boolean; error?: string; created?: boolean; headers?: unknown[]; rows?: unknown[][] };
    if (!json.ok) return { state: "error", message: json.error === "unauthorized" ? "Mã bí mật không khớp" : json.error };
    if (!json.created) return { state: "not_created" };
    return { state: "ok", data: { headers: (json.headers ?? []).map(String), rows: json.rows ?? [] } };
  } catch (e) {
    return { state: "error", message: e instanceof Error ? e.message.slice(0, 120) : "lỗi mạng" };
  }
}
