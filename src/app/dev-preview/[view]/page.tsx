import { notFound } from "next/navigation";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import { CreateClassForm } from "@/components/ClassForms";
import OnboardingForm from "@/components/OnboardingForm";
import Logo from "@/components/Logo";
import StudentHome from "@/components/StudentHome";
import TeacherHome from "@/components/TeacherHome";
import FeedbackPreview, { ReportPreview } from "./FeedbackPreview";

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
  { id: "s2", studentId: "x", unitId: "u2", unitTitle: "Life in the Countryside", unitNo: 2, status: "in_progress" as const, answered: 2, total: 5, startedAt: "2026-10-27T08:00:00Z", completedAt: null },
  { id: "s1", studentId: "x", unitId: "u1", unitTitle: "Leisure Time", unitNo: 1, status: "completed" as const, answered: 5, total: 5, startedAt: "2026-10-25T08:00:00Z", completedAt: "2026-10-25T08:14:00Z" },
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
            today={{ kind: "start", href: "#", unitTitle: "Leisure Time" }}
            roadmap={roadmap.map((u, i) => ({ ...u, state: i === 0 ? "next" : "todo" }))}
            recent={[]}
            focus={{ completed: 0, goal: null }}
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
            today={{ kind: "continue", href: "#", unitTitle: "Life in the Countryside", answered: 2, total: 5 }}
            roadmap={roadmap.map((u, i) => ({ ...u, state: i === 0 ? "done" : i === 1 ? "in_progress" : "todo" }))}
            recent={recent}
            focus={{
              completed: 3,
              goal: {
                key: "reason",
                title: "Thêm lý do cho câu trả lời",
                detail: "Sau ý chính, nói tiếp một lý do với “because…” hoặc “so…”.",
                basis: "4/6 câu hỏi cần lý do chưa có từ nối lý do.",
              },
            }}
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
    default:
      notFound();
  }
}
