import { randomInt } from "node:crypto";

/** Bỏ I, O, 0, 1 để học sinh không nhầm khi gõ. Khớp ràng buộc check của classes.join_code trong 0001_core.sql. */
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 6;

export function makeJoinCode(): string {
  let out = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) out += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  return out;
}

/** Chuẩn hóa mã học sinh gõ vào (chữ thường, khoảng trắng, dấu gạch). Trả null nếu không đúng dạng. */
export function normalizeJoinCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  return new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`).test(code) ? code : null;
}
