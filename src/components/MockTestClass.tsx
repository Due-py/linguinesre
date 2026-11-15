import Link from "next/link";
import { ClipboardCheck, Download, Filter } from "lucide-react";
import { Chip, Progress, SectionHead, Stat, type Tone } from "@/components/ui";
import { loadClassMock } from "@/lib/mockGradingServer";
import { MOCK_QIDS, qLabel, questionSpread, SCORE_GUIDE, STATUS_LABEL, statusCounts, type MockStatus } from "@/lib/mockGrading";

const STATUS_TONE: Record<MockStatus, Tone> = { not_sent: "grey", not_started: "grey", in_progress: "yellow", submitted: "blue", graded: "green" };
const CELL: Record<number, string> = { 2: "bg-success-soft text-success-strong", 1: "bg-warn-soft text-warn", 0: "bg-danger-soft text-danger" };

/**
 * Bài thi thử nói của lớp (trang giáo viên). Số liệu thật từ bài học sinh làm và điểm giáo viên chấm; không điểm tổng,
 * không xếp hạng. Máy đo (số từ, thành câu, lý do) và điểm giáo viên tách riêng: phần máy đo nằm ở trang chấm từng em.
 */
export default async function MockTestClass({ classId, students, onlyToGrade }: { classId: string; students: { id: string; name: string }[]; onlyToGrade: boolean }) {
  if (students.length === 0) return null;
  const { missing, byStudent } = await loadClassMock(students.map((s) => s.id));
  const head = (
    <SectionHead
      id="thi-thu"
      title="Bài thi thử nói"
      action={
        !missing && (
          <a href={`/teacher/classes/${classId}/thi-thu/export`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium hover:bg-tint">
            <Download className="size-4" aria-hidden />
            Tải bảng điểm (Excel)
          </a>
        )
      }
    />
  );
  if (missing)
    return (
      <section aria-labelledby="thi-thu" className="grid gap-4">
        {head}
        <p className="max-w-prose rounded-3xl bg-warn-soft px-5 py-4">Phần chấm bài thi thử chưa bật: cần chạy migration 0018 (supabase/migrations/0018_mock_test_grading.sql) trong SQL Editor của Supabase.</p>
      </section>
    );

  const all = students.map((s) => ({ ...s, m: byStudent.get(s.id)! }));
  const invited = all.filter((s) => s.m.status !== "not_sent");
  const counts = statusCounts(all.map((s) => s.m));
  const spread = questionSpread(invited.map((s) => s.m));
  const anyGraded = spread.some((q) => q.two + q.one + q.zero > 0);
  const shown = onlyToGrade ? invited.filter((s) => s.m.status === "submitted") : invited;

  return (
    <section aria-labelledby="thi-thu" className="grid gap-6">
      {head}
      {invited.length === 0 ? (
        <p className="max-w-prose rounded-3xl bg-tint px-5 py-4 text-muted">Chưa học sinh nào trong lớp được giao bài thi thử.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Được giao bài" value={`${invited.length}/${students.length}`} />
            <Stat label="Đã nộp" value={`${counts.submitted + counts.graded}/${invited.length}`} note={`${counts.in_progress} bạn đang làm, ${counts.not_started} bạn chưa mở`} />
            <Stat label="Chờ chấm" value={String(counts.submitted)} />
            <Stat label="Đã chấm xong" value={`${counts.graded}/${invited.length}`} />
          </div>
          <Progress value={counts.submitted + counts.graded} max={invited.length} label={`${counts.submitted + counts.graded} trên ${invited.length} bạn đã nộp bài`} />

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                Mỗi ô là một câu: <span className="font-medium text-success-strong">2</span> · <span className="font-medium text-warn">1</span> ·{" "}
                <span className="font-medium text-danger">0</span> là điểm thầy cô chấm; <span className="font-medium">?</span> là em đã nói, chưa chấm; – là chưa nói.
              </p>
              <Link
                href={onlyToGrade ? `/teacher/classes/${classId}#thi-thu` : `/teacher/classes/${classId}?thithu=cho-cham#thi-thu`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium hover:bg-tint"
              >
                <Filter className="size-4" aria-hidden />
                {onlyToGrade ? "Xem tất cả" : "Chỉ xem bài chờ chấm"}
              </Link>
            </div>
            {shown.length === 0 ? (
              <p className="rounded-3xl bg-tint px-5 py-4 text-muted">Không có bài nào đang chờ chấm.</p>
            ) : (
              <ul className="grid gap-2">
                {shown.map((s) => (
                  <li key={s.id} className="grid gap-3 rounded-3xl border border-line p-4 lg:grid-cols-[14rem_1fr_auto] lg:items-center">
                    <div className="grid gap-1">
                      <span className="font-medium">{s.name}</span>
                      <Chip tone={STATUS_TONE[s.m.status]}>{STATUS_LABEL[s.m.status]}</Chip>
                    </div>
                    <ol className="flex flex-wrap gap-1.5" aria-label={`Từng câu của ${s.name}`}>
                      {MOCK_QIDS.map((q) => {
                        const sc = s.m.scores[q];
                        const said = sc === undefined && s.m.said.includes(q);
                        return (
                          <li
                            key={q}
                            title={`${qLabel(q)}: ${sc !== undefined ? `${sc} điểm` : said ? "chưa chấm" : "chưa có"}`}
                            className={`grid size-9 place-items-center rounded-xl text-sm font-semibold tabular-nums ${sc !== undefined ? CELL[sc] : "bg-sunken text-muted"}`}
                          >
                            <span className="sr-only">{qLabel(q)}: </span>
                            {sc !== undefined ? sc : said ? "?" : "–"}
                          </li>
                        );
                      })}
                    </ol>
                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <span className="text-sm text-muted tabular-nums">
                        Đã nói {s.m.answered}/10 · Đạt 2 điểm: {s.m.full}/10
                      </span>
                      <Link href={`/teacher/classes/${classId}/thi-thu/${s.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 text-sm font-medium text-on-brand hover:bg-brand-strong">
                        <ClipboardCheck className="size-4" aria-hidden />
                        {s.m.status === "graded" ? "Xem lại" : "Chấm bài"}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-3 rounded-3xl border border-line p-6">
            <h3 className="text-lg font-semibold">Cả lớp theo từng câu</h3>
            {!anyGraded ? (
              <p className="text-muted">Chưa chấm câu nào. Khi chấm, bảng này cho thấy câu nào nhiều bạn còn yếu để ôn lại cả lớp.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {spread.map((q) => (
                  <li key={q.qid} className="flex items-center justify-between gap-3 rounded-2xl bg-tint px-4 py-2 text-sm">
                    <span className="font-medium">{qLabel(q.qid)}</span>
                    <span className="flex gap-1.5 tabular-nums">
                      <Chip tone="green">2 điểm: {q.two}</Chip>
                      <Chip tone="yellow">1: {q.one}</Chip>
                      <Chip tone="red">0: {q.zero}</Chip>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <details className="text-sm text-muted">
              <summary className="cursor-pointer font-medium text-ink">Thang chấm mỗi câu</summary>
              <ul className="mt-2 grid gap-1">
                {([2, 1, 0] as const).map((k) => (
                  <li key={k}>
                    <span className="font-medium text-ink">{k} điểm:</span> {SCORE_GUIDE[k]}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </>
      )}
    </section>
  );
}
