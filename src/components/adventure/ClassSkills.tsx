import { Download, LifeBuoy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { daysAgo } from "@/lib/classStats";
import { toSkillAttempt } from "@/lib/adventure/server";
import { BAND_VI, skillResults, type Band, type SkillAttempt } from "@/lib/adventure/skills";
import { SKILLS, SKILL_VI } from "@/lib/adventure/world";

const TONE: Record<Band, string> = { none: "bg-sunken text-muted", emerging: "bg-warn-soft text-warn", developing: "bg-success-soft text-success-strong", secure: "bg-brand-soft text-brand-strong" };
const ATTEMPT_COLS = "student_id, module_id, day, kind, turn, attempt_no, area, correct, hint_level, think_ms, measures, check_result, error_tags, created_at";

/**
 * Giáo viên xem kỹ năng nói của cả lớp (TIẾN TRÌNH HỌC, tính từ số đo thật như trang Kỹ năng của học sinh), ai cần hỗ trợ và vì sao,
 * mức tham gia (nhiệm vụ, mini-game). Không hiện XP hay cấp phiêu lưu: đó là phần trò chơi, không phải năng lực.
 * RLS: chỉ học sinh trong lớp của giáo viên này.
 */
export default async function ClassSkills({ classId, students }: { classId: string; students: { id: string; name: string }[] }) {
  const ids = students.map((s) => s.id);
  if (ids.length === 0) return null;
  const supabase = await createClient();
  const [{ data: attempts }, { data: lessons }, rounds] = await Promise.all([
    supabase.from("module_attempts").select(ATTEMPT_COLS).in("student_id", ids),
    supabase.from("module_lessons").select("student_id, status, completed_at, started_at").in("student_id", ids),
    supabase.from("game_rounds").select("student_id, finished_at").in("student_id", ids),
  ]);
  const byStudent = new Map<string, SkillAttempt[]>();
  for (const a of (attempts ?? []) as (Parameters<typeof toSkillAttempt>[0] & { student_id: string })[]) {
    byStudent.set(a.student_id, [...(byStudent.get(a.student_id) ?? []), toSkillAttempt(a)]);
  }
  const weekAgo = daysAgo(7);
  const rows = students.map((s) => {
    const skills = skillResults(byStudent.get(s.id) ?? []);
    const mine = (lessons ?? []).filter((l) => l.student_id === s.id);
    const quests = mine.filter((l) => l.status === "completed").length;
    const games = (rounds.data ?? []).filter((r) => r.student_id === s.id && r.finished_at).length;
    const last = [...mine.map((l) => l.completed_at ?? l.started_at), ...(byStudent.get(s.id) ?? []).map((a) => a.at)].filter(Boolean).sort().at(-1) ?? null;
    const reasons: string[] = [];
    for (const k of skills) if (k.band === "emerging") reasons.push(`${SKILL_VI[k.skill]}: ${k.evidence[0]}`);
    if (mine.length === 0) reasons.push("Chưa bắt đầu nhiệm vụ nào.");
    else if (!last || Date.parse(last) < weekAgo) reasons.push("Chưa luyện trong 7 ngày qua.");
    return { ...s, skills, quests, games, reasons };
  });
  const support = rows.filter((r) => r.reasons.length > 0);

  return (
    <section aria-labelledby="skills" className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="skills" className="text-3xl font-semibold tracking-tight">
            Kỹ năng nói của lớp
          </h2>
          <p className="max-w-prose text-muted">
            Tính từ số đo thật qua nhiều bài (cần đủ dữ liệu ở ít nhất 2 bài). Không dùng XP hay cấp phiêu lưu: hoàn thành nhiệm vụ không làm kỹ năng tăng.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["lessons", "attempts", "games"] as const).map((k) => (
            <a key={k} href={`/teacher/classes/${classId}/export?kind=${k}`} className="press inline-flex min-h-11 items-center gap-2 rounded-full bg-sunken px-4 text-sm font-medium hover:bg-line">
              <Download className="size-4" aria-hidden />
              {k === "lessons" ? "CSV từng bài" : k === "attempts" ? "CSV từng lượt" : "CSV mini-game"}
            </a>
          ))}
        </div>
      </div>

      {support.length > 0 && (
        <div className="grid gap-3 rounded-3xl bg-warn-soft p-5">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-warn">
            <LifeBuoy className="size-5" aria-hidden />
            Có thể cần hỗ trợ ({support.length})
          </h3>
          <ul className="grid gap-2">
            {support.map((r) => (
              <li key={r.id}>
                <span className="font-semibold">{r.name}</span>
                <span className="text-warn">: {r.reasons.join(" ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-3xl border border-line">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <caption className="sr-only">Mức kỹ năng của từng học sinh</caption>
          <thead className="bg-tint text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Học sinh
              </th>
              <th scope="col" className="px-2 py-3 font-medium">
                Nhiệm vụ
              </th>
              <th scope="col" className="px-2 py-3 font-medium">
                Mini-game
              </th>
              {SKILLS.map((k) => (
                <th key={k} scope="col" className="px-2 py-3 font-medium">
                  {SKILL_VI[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row" className="px-4 py-3 font-semibold">
                  {r.name}
                </th>
                <td className="px-2 py-3 tabular-nums">{r.quests}</td>
                <td className="px-2 py-3 tabular-nums">{r.games}</td>
                {r.skills.map((k) => (
                  <td key={k.skill} className="px-2 py-3">
                    <span title={k.evidence.join(" ")} className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[k.band]}`}>
                      {BAND_VI[k.band]}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted">Di chuột vào một mức để xem bằng chứng. Dữ liệu bài kiểm tra nghiên cứu không nằm ở đây và không bị ảnh hưởng.</p>
    </section>
  );
}
