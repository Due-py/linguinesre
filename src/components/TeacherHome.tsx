import Link from "next/link";
import { ArrowRight, ClipboardCheck, Plus, Users } from "lucide-react";
import ButtonLink from "@/components/ButtonLink";
import CopyCode from "@/components/CopyCode";
import { Chip, Eyebrow, Highlight, SectionHead, Stat } from "@/components/ui";

export type ClassRow = { id: string; name: string; grade: number | null; joinCode: string; status: "active" | "archived"; students: number };
/** Số liệu thật trong 7 ngày gần nhất của học sinh thuộc các lớp đang dạy. null = chưa tính được (chưa có học sinh). */
export type TeacherWeek = { activeStudents: number; lessonsDone: number; sessionsDone: number } | null;

const studentsLabel = (n: number) => (n === 0 ? "Chưa có học sinh" : `${n} học sinh`);
const gradeLabel = (g: number | null) => (g ? `Lớp ${g}` : "Nhiều khối");

/**
 * Tổng quan của giáo viên: lớp đang dạy và hoạt động 7 ngày gần nhất (dữ liệu thật, không xếp hạng học sinh),
 * rồi danh sách lớp dạng thẻ, mỗi lớp có mã để chia sẻ và đường vào trang chi tiết.
 */
export default function TeacherHome({ name, classes, week = null }: { name: string; classes: ClassRow[]; week?: TeacherWeek }) {
  const active = classes.filter((c) => c.status === "active");
  const archived = classes.filter((c) => c.status === "archived");
  const students = active.reduce((n, c) => n + c.students, 0);

  return (
    <div className="grid gap-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="rise-in grid gap-3">
          <p className="text-lg text-muted">Chào {name},</p>
          <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Lớp <Highlight>của bạn</Highlight>
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/teacher/modules" variant="tonal">
            <ClipboardCheck className="size-5" aria-hidden />
            Duyệt nội dung
          </ButtonLink>
          <ButtonLink href="/teacher/classes/new">
            <Plus className="size-5" aria-hidden />
            Tạo lớp
          </ButtonLink>
        </div>
      </div>

      {active.length > 0 && (
        <section aria-labelledby="overview" className="grid gap-3">
          <h2 id="overview" className="sr-only">
            Tổng quan
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Lớp đang dạy" value={String(active.length)} />
            <Stat label="Học sinh" value={String(students)} note={students === 0 ? "Chia sẻ mã lớp để học sinh vào lớp" : undefined} />
            <Stat label="Học sinh có học trong 7 ngày" value={week ? `${week.activeStudents}/${students}` : null} empty="Chưa có" />
            <Stat
              label="Bài đã xong trong 7 ngày"
              value={week ? String(week.lessonsDone + week.sessionsDone) : null}
              note={week ? `${week.lessonsDone} ngày học module, ${week.sessionsDone} buổi luyện tự do` : undefined}
            />
          </div>
        </section>
      )}

      {active.length === 0 ? (
        <section className="grid max-w-xl gap-4 rounded-[2rem] bg-brand-soft p-8">
          <Eyebrow className="text-brand-strong">Bắt đầu</Eyebrow>
          <h2 className="text-3xl font-semibold tracking-tight">Tạo lớp đầu tiên của bạn</h2>
          <p className="text-muted">Mỗi lớp có một mã gồm 6 ký tự. Bạn đưa mã cho học sinh, các bạn nhập mã ở trang Tài khoản để vào lớp.</p>
          <ButtonLink href="/teacher/classes/new" className="w-fit">
            <Plus className="size-5" aria-hidden />
            Tạo lớp
          </ButtonLink>
        </section>
      ) : (
        <section aria-labelledby="classes" className="grid gap-4">
          <SectionHead id="classes" title="Các lớp" />
          <ul className="grid gap-4 md:grid-cols-2">
            {active.map((c, i) => (
              <li key={c.id} className="pop-in grid content-start gap-5 rounded-[2rem] border border-line p-6" style={{ ["--i" as string]: i }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <Eyebrow>{gradeLabel(c.grade)}</Eyebrow>
                    <Link href={`/teacher/classes/${c.id}`} className="w-fit text-2xl font-semibold tracking-tight underline-offset-4 hover:underline">
                      {c.name}
                    </Link>
                  </div>
                  <Chip tone={c.students ? "blue" : "grey"} icon={<Users className="size-4" aria-hidden />}>
                    {studentsLabel(c.students)}
                  </Chip>
                </div>
                <div className="grid gap-1.5">
                  <span className="text-sm font-medium text-muted">Mã lớp</span>
                  <CopyCode code={c.joinCode} />
                </div>
                <Link href={`/teacher/classes/${c.id}`} className="inline-flex min-h-11 w-fit items-center gap-1 font-medium text-brand hover:underline">
                  Xem tiến độ lớp
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {archived.length > 0 && (
        <details className="group">
          <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-muted hover:text-ink">Lớp đã lưu trữ ({archived.length})</summary>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {archived.map((c) => (
              <li key={c.id}>
                <Link href={`/teacher/classes/${c.id}`} className="flex min-h-12 items-center justify-between gap-4 py-3 text-muted hover:text-ink">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-sm">{studentsLabel(c.students)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
