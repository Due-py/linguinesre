import { notFound } from "next/navigation";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import { CreateClassForm } from "@/components/ClassForms";
import OnboardingForm from "@/components/OnboardingForm";
import Logo from "@/components/Logo";
import StudentHome from "@/components/StudentHome";
import TeacherHome from "@/components/TeacherHome";
import ResearchHome from "@/components/ResearchHome";
import ModeHome from "@/components/ModeHome";
import TestRunner from "@/components/TestRunner";
import ModulePath from "@/components/module/ModulePath";
import HeardWords from "@/components/module/HeardWords";
import { AssessPanel, MeasuredPanel } from "@/components/module/Panels";
import { mockAssessment, verifyAssessment } from "@/lib/module/assessCore";
import FeedbackPreview, { ReportPreview } from "./FeedbackPreview";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import LessonRunner from "@/components/module/LessonRunner";
import { ReportView } from "@/components/module/Panels";
import { moduleSchema } from "@/lib/module/schema";
import { buildLesson } from "@/lib/module/plan";
import { moduleReport } from "@/lib/module/report";

/**
 * CHỈ DÙNG KHI PHÁT TRIỂN: xem giao diện các trang cần đăng nhập bằng dữ liệu mẫu, khi chưa nối Supabase.
 * Trả 404 ở bản production. Dữ liệu ở đây là mẫu để xem bố cục, tuyệt đối không phải dữ liệu thật của sản phẩm.
 */
export const dynamic = "force-dynamic";

const classes = [
  { id: "1", name: "8A1", grade: 8, joinCode: "K7QM3X", status: "active" as const, students: 31 },
  { id: "2", name: "Câu lạc bộ nói tiếng Anh", grade: null, joinCode: "R4T9PW", status: "active" as const, students: 0 },
  { id: "3", name: "7B (năm trước)", grade: 7, joinCode: "ZZ2A8H", status: "archived" as const, students: 28 },
];

const roadmap = [
  { id: "u1", unitNo: 1, title: "Leisure Time", titleVi: "Thời gian rảnh" },
  { id: "u2", unitNo: 2, title: "Life in the Countryside", titleVi: "Cuộc sống ở nông thôn" },
  { id: "u3", unitNo: 3, title: "Teenagers", titleVi: "Tuổi mới lớn" },
];
const recent = [
  { id: "l4", href: "#", title: "Ngày 4: Từ vựng thành câu, xếp câu", sub: "Unit 7 · Environmental Protection", at: "2026-11-09T08:14:00Z" },
  { id: "l3", href: "#", title: "Ngày 3: Ngữ pháp, cụm câu hay và kiểm tra kiến thức", sub: "Unit 7 · Environmental Protection", at: "2026-11-07T08:14:00Z" },
];

export default async function Preview({ params }: { params: Promise<{ view: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view } = await params;

  switch (view) {
    case "student-new":
      return (
        <AppShell name="Minh Anh" roleLabel="Học sinh" homeHref="#" nav={STUDENT_NAV} current="/student">
          <StudentHome
            name="Minh Anh"
            grade={8}
            classes={[]}
            roadmap={roadmap.map((u, i) => ({ ...u, state: i === 0 ? "next" : "todo" }))}
            recent={[]}
            lessonsDone={0}
            reaction={[]}
          />
        </AppShell>
      );
    case "student-in-class":
      return (
        <AppShell name="Minh Anh" roleLabel="Học sinh" homeHref="#" nav={STUDENT_NAV} current="/student">
          <StudentHome
            name="Minh Anh"
            grade={8}
            classes={[{ id: "1", name: "8A1" }]}
            module={{ id: "preview", unitNo: 7, title: "Environmental Protection", titleVi: "Bảo vệ môi trường", nextDay: 5, started: true, inProgress: false, daysDone: 4 }}
            moduleErrors={[{ label: "Thiếu -s/-es sau chủ ngữ số ít (he, she, it)", count: 3 }, { label: "Dùng sai giới từ", count: 2 }]}
            roadmap={roadmap.map((u, i) => ({ ...u, state: i === 0 ? "done" : i === 1 ? "in_progress" : "todo", moduleId: "preview", daysDone: i === 0 ? 14 : i === 1 ? 4 : 0 }))}
            recent={recent}
            lessonsDone={4}
            reaction={[
              { sessionId: "p1", completedAt: "2026-11-02T10:00:00Z", unitTitle: "Leisure Time", medianMs: 3400, measured: 5 },
              { sessionId: "p2", completedAt: "2026-11-04T10:00:00Z", unitTitle: "Leisure Time", medianMs: 2900, measured: 4 },
              { sessionId: "p3", completedAt: "2026-11-06T10:00:00Z", unitTitle: "Life in the Countryside", medianMs: 3100, measured: 5 },
              { sessionId: "p4", completedAt: "2026-11-09T10:00:00Z", unitTitle: "Life in the Countryside", medianMs: 2200, measured: 5 },
            ]}
          />
        </AppShell>
      );
    case "teacher-empty":
      return (
        <AppShell name="Cô Vân" roleLabel="Giáo viên" homeHref="#">
          <TeacherHome name="Cô Vân" classes={[]} />
        </AppShell>
      );
    case "teacher-classes":
      return (
        <AppShell name="Cô Vân" roleLabel="Giáo viên" homeHref="#">
          <TeacherHome name="Cô Vân" classes={classes} />
        </AppShell>
      );
    case "teacher-new-class":
      return (
        <AppShell name="Cô Vân" roleLabel="Giáo viên" homeHref="#">
          <div className="grid gap-8">
            <h1 className="text-4xl font-extrabold tracking-tight">Tạo lớp mới</h1>
            <CreateClassForm />
          </div>
        </AppShell>
      );
    case "onboarding":
      return (
        <div className="min-h-dvh">
          <header className="mx-auto flex max-w-2xl items-center px-4 py-3 sm:px-6">
            <Logo />
          </header>
          <main className="mx-auto grid max-w-2xl gap-8 px-4 pb-16 pt-6 sm:px-6">
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">Cho chúng tôi biết đôi điều về bạn</h1>
            <OnboardingForm />
          </main>
        </div>
      );
    case "practice-feedback":
      return <FeedbackPreview />;
    case "session-report":
      return <ReportPreview />;
    case "module-lesson":
    case "module-report": {
      // Nội dung mẫu lớp 8 Unit 7; câu hỏi Unit và lịch sử là dữ liệu mẫu chỉ để xem bố cục. ?day= không dùng: xem ngày 6.
      const m = moduleSchema.parse(JSON.parse(readFileSync(join(process.cwd(), "content/modules/grade-8/unit-07.json"), "utf8")));
      if (view === "module-report") {
        const a = (day: number, ref: string, thinkMs: number, words: number) => ({
          day, t: "speak" as const, ref, attemptNo: 1, set: null, area: null, correct: null, test: true, measures: { words, thinkMs, clarity: 0.9 }, check: { reason: "yes" as const }, ai: null,
        });
        const r = moduleReport(m, [a(1, "i01", 6200, 5), a(1, "i02", 7400, 7), a(13, "i04", 3900, 14), a(13, "i05", 4100, 16)]);
        return (
          <AppShell name="Minh Anh" roleLabel="Học sinh" homeHref="#" nav={STUDENT_NAV} current="/student/phieu-luu">
            <ReportView r={r} />
          </AppShell>
        );
      }
      const qs = m.variations.map((v, i) => ({ id: `00000000-0000-0000-0000-00000000000${i}`, key: `q0${i + 1}`, text: v.questions[0], difficulty: (i % 3) + 1, keywords: v.keywords, expectsReason: v.expectsReason, hints: [{ level: 1 as const, title: "Hướng nghĩ", body: v.ideaVi, lang: "vi" as const }] }));
      const lesson = buildLesson({ day: 6, module: m, unitQuestions: qs, history: [], seed: "preview", now: Date.parse("2026-11-20T00:00:00Z") });
      return <LessonRunner lessonId="preview" moduleId="preview" day={6} titleVi={lesson.titleVi} notesVi={["Ví dụ ghi chú: bài hôm nay có nhiều câu khó hơn vì kết quả ngày 3 tốt."]} steps={lesson.steps} content={m} rows={[]} startAt={0} />;
    }
    case "module-feedback": {
      // Dữ liệu mẫu (không phải lời học sinh thật): phản hồi sau một câu nói trong module.
      const t = "I think we should recycle plastic bottles because it reduce waste";
      return (
        <AppShell name="Minh Anh" roleLabel="Học sinh" homeHref="#" nav={STUDENT_NAV} current="/student/phieu-luu">
          <div className="mx-auto grid max-w-2xl gap-5">
            <MeasuredPanel
              m={{ words: 11, thinkMs: 2400, speakMs: 4200, wpm: 157, longPauses: 1, clarity: 0.82, unclear: false, lowWords: ["recycle", "reduce"] }}
              keywords={["recycle", "plastic", "waste"]}
              keywordsUsed={["recycle", "plastic", "waste"]}
              reason="yes"
              targetMs={3000}
              inTarget={true}
            />
            <HeardWords transcript={t} lowWords={["recycle", "reduce"]} />
            <AssessPanel a={verifyAssessment(mockAssessment(t), t)} mock />
          </div>
        </AppShell>
      );
    }
    case "module-path":
      // Dữ liệu mẫu: đã xong ngày 1–4, ngày 5 tiếp theo.
      return (
        <AppShell name="Minh Anh" roleLabel="Học sinh" homeHref="#" nav={STUDENT_NAV} current="/student/phieu-luu">
          <ModulePath moduleId="preview" completed={[1, 2, 3, 4]} nextDay={5} open={false} />
        </AppShell>
      );
    // Trang nghiên cứu giữ giao diện cũ (theme-classic) tới hết nghiên cứu. Dùng để so ảnh trước/sau khi đổi giao diện chung.
    case "research-wait":
      return (
        <div className="theme-classic">
          <AppShell name="HS008" roleLabel="Học sinh" homeHref="#">
            <ResearchHome p={{ code: "HS008", grade: 8, formOrder: "AB", arm: "A", pilot: false }} state={{ pre: { id: "t1", phase: "pre", form: "A", status: "completed" }, post: null, due: null }} />
          </AppShell>
        </div>
      );
    case "mode-home":
      return (
        <div className="theme-classic">
          <AppShell name="HS008" roleLabel="Học sinh" homeHref="#">
            <ModeHome
              code="HS008"
              mode="A"
              sessions={[
                { id: "m1", mode: "A", session_no: 1, unit_no: 1, day: "2026-11-09", status: "completed", active_ms: 760000, started_at: "2026-11-09T08:00:00Z", completed_at: "2026-11-09T08:13:00Z" },
                { id: "m2", mode: "A", session_no: 2, unit_no: 1, day: "2026-11-10", status: "completed", active_ms: 420000, started_at: "2026-11-10T08:00:00Z", completed_at: "2026-11-10T08:07:00Z" },
              ]}
              today="2026-11-11"
              needsCheckin={true}
              tests={{ pre: { id: "t1", phase: "pre", form: "A", status: "completed" }, post: null, due: null }}
            />
          </AppShell>
        </div>
      );
    case "test-runner":
      return (
        <div className="theme-classic">
          <TestRunner attemptId="preview" phaseLabel="Bài kiểm tra nói lần 2" />
        </div>
      );
    default:
      notFound();
  }
}
