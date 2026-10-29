// Tiện ích dùng chung cho các script chạy trên máy (không chạy trên web).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { unitSchema } from "../src/lib/content/schema.ts";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));

export function loadEnv() {
  const text = readFileSync(join(ROOT, ".env.local"), "utf8");
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
}

export function serviceHeaders(env, extra = {}) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra };
}

/** Đọc và kiểm tra mọi file content/grade-*\/unit-*.json. Trả { file, unit, hash } hoặc { file, errors }. */
export function loadContentFiles() {
  const dir = join(ROOT, "content");
  const out = [];
  for (const g of readdirSync(dir).filter((d) => /^grade-\d+$/.test(d)).sort()) {
    for (const f of readdirSync(join(dir, g)).filter((x) => /^unit-\d{2}\.json$/.test(x)).sort()) {
      const file = `content/${g}/${f}`;
      const raw = readFileSync(join(dir, g, f), "utf8");
      let json;
      try {
        json = JSON.parse(raw);
      } catch (e) {
        out.push({ file, errors: [`JSON lỗi: ${e.message}`] });
        continue;
      }
      const parsed = unitSchema.safeParse(json);
      if (!parsed.success) {
        out.push({ file, errors: parsed.error.issues.map((i) => `${i.path.join(".") || "(gốc)"}: ${i.message}`) });
        continue;
      }
      const u = parsed.data;
      const expected = `content/grade-${u.grade}/unit-${String(u.unit).padStart(2, "0")}.json`;
      if (expected !== file) {
        out.push({ file, errors: [`Tên file phải là ${expected} theo grade/unit bên trong`] });
        continue;
      }
      out.push({ file, unit: u, hash: createHash("sha256").update(JSON.stringify(u)).digest("hex") });
    }
  }
  return out;
}
