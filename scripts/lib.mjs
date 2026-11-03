// Tiện ích dùng chung cho các script chạy trên máy (không chạy trên web).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { unitSchema } from "../src/lib/content/schema.ts";
import { moduleSchema } from "../src/lib/module/schema.ts";

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

/**
 * Đọc và kiểm tra mọi file content/modules/grade-*\/unit-*.json (Learning Module). Ngoài lược đồ, còn kiểm tra: Unit
 * luyện tập cùng số phải có (câu hỏi luyện nói lấy từ đó) và câu kiểm tra độc lập không trùng câu luyện của Unit.
 * Trả { file, module, hash } hoặc { file, errors }.
 */
export function loadModuleFiles() {
  const dir = join(ROOT, "content", "modules");
  const units = new Map(loadContentFiles().filter((f) => f.unit).map((f) => [`${f.unit.grade}-${f.unit.unit}`, f.unit]));
  const norm = (s) => s.toLowerCase().replace(/[^a-z' ]/g, " ").replace(/\s+/g, " ").trim();
  const out = [];
  let grades = [];
  try {
    grades = readdirSync(dir).filter((d) => /^grade-\d+$/.test(d)).sort();
  } catch {
    return out;
  }
  for (const g of grades) {
    for (const f of readdirSync(join(dir, g)).filter((x) => /^unit-\d{2}\.json$/.test(x)).sort()) {
      const file = `content/modules/${g}/${f}`;
      let json;
      try {
        json = JSON.parse(readFileSync(join(dir, g, f), "utf8"));
      } catch (e) {
        out.push({ file, errors: [`JSON lỗi: ${e.message}`] });
        continue;
      }
      const parsed = moduleSchema.safeParse(json);
      if (!parsed.success) {
        out.push({ file, errors: parsed.error.issues.map((i) => `${i.path.join(".") || "(gốc)"}: ${i.message}`) });
        continue;
      }
      const m = parsed.data;
      const errors = [];
      const expected = `content/modules/grade-${m.grade}/unit-${String(m.unit).padStart(2, "0")}.json`;
      if (expected !== file) errors.push(`Tên file phải là ${expected} theo grade/unit bên trong`);
      const unit = units.get(`${m.grade}-${m.unit}`);
      if (!unit) errors.push(`Chưa có Unit luyện tập content/grade-${m.grade}/unit-${String(m.unit).padStart(2, "0")}.json`);
      else {
        const practiced = new Set(unit.questions.map((q) => norm(q.text)));
        for (const q of m.independent) if (practiced.has(norm(q.text))) errors.push(`${q.id}: câu kiểm tra trùng câu luyện của Unit`);
      }
      if (errors.length) out.push({ file, errors });
      else out.push({ file, module: m, hash: createHash("sha256").update(JSON.stringify(m)).digest("hex") });
    }
  }
  return out;
}
