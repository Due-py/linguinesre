// Tiện ích dùng chung cho các script nghiên cứu (chạy trên máy của người giữ dữ liệu, KHÔNG chạy trên web).
import { randomInt } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, ROOT } from "./lib.mjs";
import { codeEmail, normalizeCode } from "../src/lib/research/code.ts";

export const env = loadEnv();
export const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
export const RESEARCH_DIR = join(ROOT, "files", "research");

/** Đọc CSV đơn giản (dấu phẩy hoặc chấm phẩy, dòng đầu là tên cột). */
export function readCsv(path) {
  const lines = readFileSync(path, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const sep = lines[0].includes(";") ? ";" : ",";
  const head = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((l) => Object.fromEntries(l.split(sep).map((v, i) => [head[i], v.trim()])));
}

/** Ghi CSV có BOM để Excel mở đúng tiếng Việt. Trả đường dẫn file. */
export function writeCsv(name, rows) {
  mkdirSync(RESEARCH_DIR, { recursive: true });
  const cols = Object.keys(rows[0] ?? { trong: "" });
  const esc = (v) => (v === null || v === undefined ? "" : /[",\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const text = "﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n");
  const path = join(RESEARCH_DIR, name);
  writeFileSync(path, text, "utf8");
  return path;
}

export const newPin = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
export const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");

/**
 * Tạo một học sinh tham gia: tài khoản (mã + PIN), hồ sơ (tên hiển thị = mã, không có họ tên), dòng research_participants.
 * Trả PIN. Ném lỗi nếu mã đã tồn tại.
 */
export async function createParticipant({ code, grade, formOrder, pilot = false }) {
  const c = normalizeCode(code);
  if (!c) throw new Error(`Mã "${code}" không đúng dạng (VD: HS008)`);
  if (!["AB", "BA"].includes(formOrder)) throw new Error(`${c}: thứ tự đề phải là AB hoặc BA`);
  const pin = newPin();
  const { data: created, error } = await admin.auth.admin.createUser({ email: codeEmail(c), password: pin, email_confirm: true });
  if (error) throw new Error(`${c}: ${error.message}`);
  const id = created.user.id;
  try {
    // Đăng nhập bằng chính tài khoản đó để chạy complete_onboarding (hàm chỉ ghi hồ sơ của người gọi).
    const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { error: sErr } = await anon.auth.signInWithPassword({ email: codeEmail(c), password: pin });
    if (sErr) throw new Error(sErr.message);
    const { error: oErr } = await anon.rpc("complete_onboarding", { p_role: "student", p_display_name: c, p_grade: Number(grade), p_goal: null });
    if (oErr) throw new Error(`hồ sơ: ${oErr.message}`);
    const { error: pErr } = await admin
      .from("research_participants")
      .insert({ student_id: id, code: c, grade: Number(grade), form_order: formOrder, pilot });
    if (pErr) throw new Error(`người tham gia: ${pErr.message}`);
  } catch (e) {
    await admin.auth.admin.deleteUser(id);
    throw new Error(`${c}: ${e.message}`);
  }
  return { code: c, pin, id };
}

/** Xóa hẳn một người tham gia thử (tài khoản, hồ sơ, bài làm, file ghi âm). Chỉ dùng cho tài khoản thử. */
export async function deleteParticipant(code) {
  const { data } = await admin.from("research_participants").select("student_id").eq("code", code).maybeSingle();
  const id = data?.student_id;
  for (const bucket of ["test-recordings", "mode-recordings"]) {
    const { data: list } = await admin.storage.from(bucket).list(code, { limit: 100 });
    for (const folder of list ?? []) {
      const { data: files } = await admin.storage.from(bucket).list(`${code}/${folder.name}`, { limit: 200 });
      const paths = (files ?? []).map((f) => `${code}/${folder.name}/${f.name}`);
      if (paths.length) await admin.storage.from(bucket).remove(paths);
    }
  }
  if (id) await admin.auth.admin.deleteUser(id);
  else {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const u = users?.users.find((x) => x.email === codeEmail(code));
    if (u) await admin.auth.admin.deleteUser(u.id);
  }
}
