import { describe, expect, it } from "vitest";
import {
  LOCK_MINUTES,
  MAX_FAILED_LOGINS,
  applyFailedLogin,
  cleanNickname,
  hiddenEmail,
  isLocked,
  isValidClassCode,
  isValidPin,
  minutesLeft,
  nicknameError,
  nicknameKey,
  normalizeClassCode,
  type LoginAttemptState,
} from "./identity";

describe("class code", () => {
  it("is normalised to upper case without spaces", () => {
    expect(normalizeClassCode("  8a1 - xk7 ")).toBe("8A1-XK7");
  });

  it("accepts 4-16 letters, digits and dashes", () => {
    expect(isValidClassCode("8A1-XK7")).toBe(true);
    expect(isValidClassCode("8A1")).toBe(false);
    expect(isValidClassCode("8A1_XK7")).toBe(false);
  });
});

describe("nickname", () => {
  it("is cleaned and compared case-insensitively", () => {
    expect(cleanNickname("  Mèo   Con ")).toBe("Mèo Con");
    expect(nicknameKey("Mèo Con")).toBe(nicknameKey("mèo con"));
  });

  it("treats composed and decomposed Vietnamese as the same", () => {
    const composed = "Hà";
    const decomposed = "Hà";
    expect(nicknameKey(decomposed)).toBe(nicknameKey(composed));
  });

  it("allows Vietnamese letters, digits, spaces, _ and -", () => {
    expect(nicknameError("Mèo Con_2-b")).toBeNull();
  });

  it("rejects too short, too long or odd characters", () => {
    expect(nicknameError("A")).not.toBeNull();
    expect(nicknameError("a".repeat(21))).not.toBeNull();
    expect(nicknameError("<script>")).not.toBeNull();
    expect(nicknameError("me@mail.com")).not.toBeNull();
  });
});

describe("PIN", () => {
  it("must be exactly 6 digits", () => {
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin("12345")).toBe(false);
    expect(isValidPin("12345a")).toBe(false);
    expect(isValidPin("1234567")).toBe(false);
  });
});

describe("hiddenEmail", () => {
  it("is stable, ASCII-only and differs per class", () => {
    const a = hiddenEmail("class-1", "mèo con");
    expect(a).toBe(hiddenEmail("class-1", "mèo con"));
    expect(a).toMatch(/^s-[0-9a-f]{32}@students\.example\.com$/);
    expect(a).not.toBe(hiddenEmail("class-2", "mèo con"));
  });
});

describe("failed login lock", () => {
  const now = new Date("2026-11-01T10:00:00Z");

  it(`locks for ${LOCK_MINUTES} minutes on the ${MAX_FAILED_LOGINS}th wrong PIN`, () => {
    let state: LoginAttemptState | null = null;
    for (let i = 1; i < MAX_FAILED_LOGINS; i++) {
      state = applyFailedLogin(state, now);
      expect(isLocked(state, now)).toBe(false);
    }
    state = applyFailedLogin(state, now);
    expect(isLocked(state, now)).toBe(true);
    expect(minutesLeft(state, now)).toBe(LOCK_MINUTES);
    expect(isLocked(state, new Date(now.getTime() + LOCK_MINUTES * 60_000 + 1))).toBe(false);
  });

  it("starts counting again after a lock has expired", () => {
    const expired: LoginAttemptState = { failedCount: 0, lockedUntil: new Date(now.getTime() - 1000) };
    expect(applyFailedLogin(expired, now)).toEqual({ failedCount: 1, lockedUntil: null });
  });

  it("treats no record as unlocked", () => {
    expect(isLocked(null, now)).toBe(false);
  });
});
