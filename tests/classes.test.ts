import { describe, expect, it } from "vitest";
import { JOIN_CODE_ALPHABET, makeJoinCode, normalizeJoinCode } from "@/lib/classes";

describe("mã lớp", () => {
  it("bảng chữ không có ký tự dễ nhầm I, O, 0, 1", () => {
    expect(JOIN_CODE_ALPHABET).not.toMatch(/[IO01]/);
  });
  it("mã sinh ra dài 6, đúng bảng chữ và qua chuẩn hóa", () => {
    for (let i = 0; i < 300; i++) {
      const c = makeJoinCode();
      expect(c).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      expect(normalizeJoinCode(c)).toBe(c);
    }
  });
  it("chấp nhận chữ thường, khoảng trắng và dấu gạch", () => {
    expect(normalizeJoinCode(" ab c-d23 ")).toBe("ABCD23");
  });
  it("từ chối ký tự dễ nhầm và sai độ dài", () => {
    expect(normalizeJoinCode("ABCDE0")).toBeNull();
    expect(normalizeJoinCode("ABCDEI")).toBeNull();
    expect(normalizeJoinCode("ABC")).toBeNull();
    expect(normalizeJoinCode("ABCDEFG")).toBeNull();
    expect(normalizeJoinCode("")).toBeNull();
  });
});
