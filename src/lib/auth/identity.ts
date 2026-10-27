// Pure rules for the class-code login (no Supabase, no Next.js), so they can
// be unit-tested. Students sign in with class code + nickname + 6-digit PIN;
// Supabase Auth still needs an email, so we derive a hidden one.

import { createHash } from "node:crypto";
import { PIN_LENGTH } from "./pin";

export { PIN_LENGTH };
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

/** Hidden email domain. RFC 2606 reserved: never a real mailbox, and no mail is ever sent. */
const EMAIL_DOMAIN = "students.example.com";

/** "  8a1 - xk7 " -> "8A1-XK7" */
export function normalizeClassCode(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, "");
}

export function isValidClassCode(code: string): boolean {
  return /^[A-Z0-9-]{4,16}$/.test(code);
}

/** Trimmed, single-spaced, NFC so typed Vietnamese compares equal. */
export function cleanNickname(raw: string): string {
  return raw.normalize("NFC").trim().replace(/\s+/g, " ");
}

/** Returns a Vietnamese error message, or null if the nickname is fine. */
export function nicknameError(nickname: string): string | null {
  const length = [...nickname].length;
  if (length < 2 || length > 20) return "Biệt danh cần từ 2 đến 20 ký tự.";
  if (!/^[\p{L}\p{N} _-]+$/u.test(nickname)) return "Biệt danh chỉ gồm chữ, số, dấu cách, _ hoặc -.";
  return null;
}

/** Case-insensitive key used for uniqueness inside a class. */
export function nicknameKey(nickname: string): string {
  return cleanNickname(nickname).toLowerCase();
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

/** Deterministic, ASCII-only email for Supabase Auth. Never shown to students. */
export function hiddenEmail(classId: string, key: string): string {
  const digest = createHash("sha256").update(`${classId}:${key}`).digest("hex").slice(0, 32);
  return `s-${digest}@${EMAIL_DOMAIN}`;
}

export interface LoginAttemptState {
  failedCount: number;
  lockedUntil: Date | null;
}

export function isLocked(state: LoginAttemptState | null, now: Date): boolean {
  return state?.lockedUntil != null && state.lockedUntil > now;
}

/** Records one wrong PIN; the MAX_FAILED_LOGINS-th failure locks the account. */
export function applyFailedLogin(state: LoginAttemptState | null, now: Date): LoginAttemptState {
  // A finished lock starts a fresh count.
  const previous = state && !(state.lockedUntil && state.lockedUntil <= now) ? state.failedCount : 0;
  const failedCount = previous + 1;
  if (failedCount >= MAX_FAILED_LOGINS) {
    return { failedCount: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000) };
  }
  return { failedCount, lockedUntil: null };
}

export function minutesLeft(state: LoginAttemptState, now: Date): number {
  return Math.max(1, Math.ceil(((state.lockedUntil?.getTime() ?? 0) - now.getTime()) / 60_000));
}
