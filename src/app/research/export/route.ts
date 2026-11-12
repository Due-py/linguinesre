import { NextResponse, type NextRequest } from "next/server";
import { buildDashboard, vnDay, type PersonRow } from "@/lib/research/analysis";
import { getResearchAccess, loadResearchData, parseArm, parseDay } from "@/lib/research/dashboardServer";

export const dynamic = "force-dynamic";

/**
 * Xuất CSV cho nhóm nghiên cứu. Cùng quyền với trang /research: không thuộc nhóm → 404 (không tiết lộ đường dẫn có tồn tại).
 * Cột nhóm A/B CHỈ có khi người tải được xem nhóm (mức key, hoặc đã bật unblinded). Không có họ tên, email, file ghi âm.
 *  - hoc-sinh: mỗi học sinh một dòng (Quy trình mục 4.1).
 *  - kiem-tra: từng câu kiểm tra nói: RL, trạng thái đo, điểm 0–2 cuối cùng.
 */

const cell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (header: string[], rows: unknown[][]) => "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
const n2 = (v: number | null | undefined, d = 3) => (v === null || v === undefined || !Number.isFinite(v) ? "" : Number(v.toFixed(d)));

export async function GET(request: NextRequest) {
  const access = await getResearchAccess();
  if (!access) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  const sp = request.nextUrl.searchParams;
  const kind = sp.get("kind") ?? "hoc-sinh";
  if (!["hoc-sinh", "kiem-tra"].includes(kind)) return NextResponse.json({ error: "Loại file không hợp lệ." }, { status: 400 });
  const filters = { arm: access.showArms ? parseArm(sp.get("arm")) : null, from: parseDay(sp.get("from")), to: parseDay(sp.get("to")) };
  const { raw } = await loadResearchData();
  const arms = access.showArms;
  const stamp = new Date().toISOString().slice(0, 10);
  let body: string;

  if (kind === "hoc-sinh") {
    const d = buildDashboard(raw, { showArms: arms, ...filters });
    const head = [
      "ma_hoc_sinh", "khoi", ...(arms ? ["che_do"] : []), "thu_tu_de", "thu_de",
      "rl_vao_giay", "rl_ra_giay", "dtb_vao", "dtb_ra", "acc_vao", "acc_ra", "so_cau_chua_do_rl",
      "flcas_noi_1", "flcas_noi_2", "flcas_ca_thang_1", "flcas_ca_thang_2", "flcas_thieu_cau_1", "flcas_thieu_cau_2",
      "mini_test", "buoi_hoan_thanh", "buoi_tu_10_phut", "phut_luyen", "lan_tra_loi_hang_tuan", "dong_y", "rut_lui",
    ];
    const row = (p: PersonRow) => [
      p.code, p.grade, ...(arms ? [p.arm ?? ""] : []), p.formOrder, p.pilot ? 1 : 0,
      p.pre.rlMedianMs === null ? "" : n2(p.pre.rlMedianMs / 1000, 2), p.post.rlMedianMs === null ? "" : n2(p.post.rlMedianMs / 1000, 2),
      n2(p.pre.dtb), n2(p.post.dtb), n2(p.pre.acc, 1), n2(p.post.acc, 1), p.pre.rlPending + p.post.rlPending,
      n2(p.flcasPre?.speakingMean), n2(p.flcasPost?.speakingMean), n2(p.flcasPre?.mean), n2(p.flcasPost?.mean),
      p.flcasPre?.missing.length ?? "", p.flcasPost?.missing.length ?? "",
      p.mini ?? "", p.sessions.completed, p.sessions.tenMin, p.sessions.minutes, p.weekly, p.consent, p.withdrawn ?? "",
    ];
    body = csv(head, d.people.map(row));
  } else {
    const person = new Map(raw.participants.map((p) => [p.student_id, p]));
    const attempt = new Map(raw.attempts.map((a) => [a.id, a]));
    const scores = new Map<string, Record<number, number>>();
    for (const s of raw.scores) scores.set(s.response_id, { ...scores.get(s.response_id), [s.rater]: s.score });
    const rows: unknown[][] = [];
    for (const r of raw.responses) {
      const a = attempt.get(r.attempt_id);
      const p = a ? person.get(a.student_id) : undefined;
      if (!a || !p) continue;
      if (filters.arm && p.arm !== filters.arm) continue;
      const day = vnDay(a.started_at);
      if ((filters.from && (!day || day < filters.from)) || (filters.to && (!day || day > filters.to))) continue;
      const s = scores.get(r.id) ?? {};
      rows.push([
        p.code, p.grade, ...(arms ? [p.arm ?? ""] : []), p.pilot ? 1 : 0, a.phase === "pre" ? "dau_vao" : "dau_ra", a.form,
        r.form === "W" ? 1 : 0, r.rl_ms === null ? "" : n2(r.rl_ms / 1000, 2), r.rl_status, s[1] ?? "", s[2] ?? "", s[0] ?? "", day ?? "",
      ]);
    }
    body = csv(["ma_hoc_sinh", "khoi", ...(arms ? ["che_do"] : []), "thu_de", "lan", "de", "cau_mau", "rl_giay", "trang_thai_rl", "diem_nguoi_1", "diem_nguoi_2", "diem_thong_nhat", "ngay"], rows);
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nghien-cuu-${kind}${arms ? "-co-nhom" : ""}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
