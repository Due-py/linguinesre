import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadClassMock } from "@/lib/mockGradingServer";
import { MOCK_QIDS, qLabel, STATUS_LABEL } from "@/lib/mockGrading";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Bảng điểm thi thử nói của một lớp (CSV có BOM, mở thẳng bằng Excel). Cột Tổng /20 chỉ có trong file này để thầy cô dùng
 * riêng; trang web không cộng điểm tổng. RLS: chỉ học sinh trong lớp của giáo viên đang đăng nhập.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "teacher") return NextResponse.json({ error: "Chỉ giáo viên." }, { status: 403 });
  const { data: cls } = await supabase.from("classes").select("id, name").eq("id", id).maybeSingle();
  if (!cls) return NextResponse.json({ error: "Không tìm thấy lớp." }, { status: 404 });
  const { data: members } = await supabase.from("class_members").select("student_id, profiles(display_name, grade)").eq("class_id", id);
  const list = ((members ?? []) as unknown as { student_id: string; profiles: { display_name: string | null; grade: number | null } | null }[])
    .map((m) => ({ id: m.student_id, name: m.profiles?.display_name ?? "", grade: m.profiles?.grade ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  const { missing, byStudent, reviews } = await loadClassMock(list.map((m) => m.id));
  if (missing) return NextResponse.json({ error: "Cần chạy migration 0018 trước." }, { status: 409 });

  const header = ["STT", "Họ tên", "Lớp", "Khối", "Trạng thái", "Câu đã nói (/10)", ...MOCK_QIDS.map(qLabel), "Số câu đã chấm", "Đạt 2 điểm (/10)", "Tổng (/20)", "Nhận xét"];
  const rows = list.map((m, i) => {
    const s = byStudent.get(m.id)!;
    const sc = MOCK_QIDS.map((q) => s.scores[q]);
    const total = s.graded ? sc.reduce<number>((n, v) => n + (v ?? 0), 0) : null;
    return [i + 1, m.name, cls.name, m.grade, STATUS_LABEL[s.status], s.answered, ...sc, s.graded, s.full, total, reviews.get(m.id)?.note ?? ""];
  });
  const body = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
  const file = `${cls.name.replace(/[^\p{L}\p{N}]+/gu, "-")}-thi-thu-noi.csv`;
  return new NextResponse(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file)}`, "Cache-Control": "no-store" },
  });
}
