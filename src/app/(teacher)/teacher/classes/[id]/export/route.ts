import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PHASES } from "@/lib/module/plan";

export const dynamic = "force-dynamic";

/**
 * Xuất dữ liệu học THẬT của một lớp ra CSV để phân tích (Excel, R, SPSS...). Ba loại:
 *  - lessons: từng bài (ngày) của module: thời gian bắt đầu/xong, thời gian luyện thực tế ước tính, số lượt, gợi ý đã dùng,
 *    các thay đổi thích ứng của bài (vì sao bài được lập như vậy).
 *  - attempts: từng lượt làm, số đo thô: thời gian bắt đầu nói (ms), số từ, tốc độ, chỗ ngừng, độ rõ, lý do, đúng/sai, gợi ý.
 *  - games: từng lượt mini-game (tham gia, đúng bao nhiêu).
 * KHÔNG có XP, cấp hay thành tích (trò chơi tách riêng) và KHÔNG có bài kiểm tra nghiên cứu (xuất riêng từ bảng nghiên cứu).
 * RLS quyết định: giáo viên chỉ đọc được học sinh trong lớp mình.
 */

const csvCell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (header: string[], rows: unknown[][]) => "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
const phaseOfDay = (d: number) => PHASES.find((p) => (p.days as readonly number[]).includes(d))?.no ?? null;

/** Thời gian luyện ước tính của một bài: cộng khoảng cách giữa các lượt liên tiếp, bỏ khoảng nghỉ trên 5 phút. */
function activeMinutes(times: string[]): number | null {
  const t = times.map((x) => Date.parse(x)).sort((a, b) => a - b);
  if (t.length < 2) return null;
  let ms = 0;
  for (let i = 1; i < t.length; i++) {
    const gap = t[i] - t[i - 1];
    if (gap <= 5 * 60_000) ms += gap;
  }
  return Math.round((ms / 60_000) * 10) / 10;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kind = request.nextUrl.searchParams.get("kind") ?? "lessons";
  if (!/^[0-9a-f-]{36}$/.test(id) || !["lessons", "attempts", "games"].includes(kind)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "teacher") return NextResponse.json({ error: "Chỉ giáo viên." }, { status: 403 });
  // RLS: lớp của giáo viên khác không trả về dòng nào.
  const { data: cls } = await supabase.from("classes").select("id, name").eq("id", id).maybeSingle();
  if (!cls) return NextResponse.json({ error: "Không tìm thấy lớp." }, { status: 404 });
  const { data: members } = await supabase.from("class_members").select("student_id, profiles(display_name)").eq("class_id", id);
  const names = new Map(((members ?? []) as unknown as { student_id: string; profiles: { display_name: string | null } | null }[]).map((m) => [m.student_id, m.profiles?.display_name ?? ""]));
  const ids = [...names.keys()];
  const file = `${cls.name.replace(/[^\p{L}\p{N}]+/gu, "-")}-${kind}.csv`;
  const send = (body: string) =>
    new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file)}`, "Cache-Control": "no-store" } });

  if (ids.length === 0) return send(csv(["note"], [["Lớp chưa có học sinh."]]));
  const { data: mods } = await supabase.from("modules").select("id, unit_no, title");
  const unit = new Map((mods ?? []).map((m) => [m.id, m]));

  if (kind === "games") {
    const { data } = await supabase.from("game_rounds").select("student_id, module_id, game, total, correct, answers, started_at, finished_at").in("student_id", ids).order("started_at");
    return send(
      csv(
        ["student_id", "student_name", "unit_no", "module_title", "game", "started_at", "finished_at", "items", "answered", "correct"],
        (data ?? []).map((r) => [r.student_id, names.get(r.student_id), unit.get(r.module_id)?.unit_no, unit.get(r.module_id)?.title, r.game, r.started_at, r.finished_at, r.total, Array.isArray(r.answers) ? r.answers.length : 0, r.correct]),
      ),
    );
  }

  const { data: attempts } = await supabase
    .from("module_attempts")
    .select("lesson_id, student_id, module_id, day, step, turn, attempt_no, kind, item_ref, quiz_set, area, correct, hint_level, think_ms, time_target_ms, in_target, measures, check_result, error_tags, ai_status, created_at")
    .in("student_id", ids)
    .order("created_at");
  const rows = attempts ?? [];

  if (kind === "attempts") {
    return send(
      csv(
        [
          "student_id", "student_name", "unit_no", "module_title", "day", "phase", "step", "turn", "attempt_no", "kind", "item_ref", "quiz_set", "area",
          "is_test", "skipped", "correct", "hint_level", "think_ms", "time_target_ms", "in_target", "words", "speak_ms", "wpm", "long_pauses", "clarity", "unclear",
          "reason", "keywords_used", "error_tags", "ai_status", "created_at",
        ],
        rows.map((a) => {
          const m = (a.measures ?? {}) as Record<string, unknown>;
          const c = (a.check_result ?? {}) as Record<string, unknown>;
          return [
            a.student_id, names.get(a.student_id), unit.get(a.module_id)?.unit_no, unit.get(a.module_id)?.title, a.day, phaseOfDay(a.day), a.step, a.turn, a.attempt_no, a.kind, a.item_ref, a.quiz_set, a.area,
            c.test === true, c.skipped === true, a.correct, a.hint_level, a.think_ms, a.time_target_ms, a.in_target, m.words, m.speakMs, m.wpm, m.longPauses, m.clarity, m.unclear,
            c.reason, Array.isArray(c.keywordsUsed) ? (c.keywordsUsed as string[]).join("; ") : "", (a.error_tags ?? []).join("; "), a.ai_status, a.created_at,
          ];
        }),
      ),
    );
  }

  const { data: lessons } = await supabase.from("module_lessons").select("id, student_id, module_id, day, status, started_at, completed_at, plan").in("student_id", ids).order("started_at");
  return send(
    csv(
      ["student_id", "student_name", "unit_no", "module_title", "day", "phase", "status", "started_at", "completed_at", "active_minutes_est", "attempts", "speaking_turns", "hints_opened", "max_hint_level", "test_items", "adaptive_notes"],
      (lessons ?? []).map((l) => {
        const mine = rows.filter((a) => a.lesson_id === l.id);
        const plan = (l.plan ?? {}) as { notesVi?: string[] };
        return [
          l.student_id, names.get(l.student_id), unit.get(l.module_id)?.unit_no, unit.get(l.module_id)?.title, l.day, phaseOfDay(l.day), l.status, l.started_at, l.completed_at,
          activeMinutes(mine.map((a) => a.created_at)), mine.length, mine.filter((a) => typeof (a.measures as { words?: number } | null)?.words === "number").length,
          mine.filter((a) => a.hint_level > 0).length, mine.reduce((x, a) => Math.max(x, a.hint_level), 0), mine.filter((a) => (a.check_result as { test?: boolean } | null)?.test === true).length,
          (plan.notesVi ?? []).join(" | "),
        ];
      }),
    ),
  );
}
