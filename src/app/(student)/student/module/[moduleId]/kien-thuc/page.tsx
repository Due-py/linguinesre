import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import KnowledgeBank from "@/components/module/KnowledgeBank";
import { requireRole } from "@/lib/auth";
import { requirePracticeAccess } from "@/lib/research/server";
import { getModule, itemReviews } from "@/lib/module/server";
import { itemStatus, moduleItems } from "@/lib/module/items";

export const metadata: Metadata = { title: "Kho kiến thức" };
export const dynamic = "force-dynamic";

export default async function KnowledgePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const profile = await requireRole("student");
  await requirePracticeAccess(profile.id);
  const { moduleId } = await params;
  const m = await getModule(moduleId);
  if (!m || m.grade !== profile.grade) notFound();
  // Mục thầy cô đã duyệt đúng nội dung hiện tại thì có dấu "Thầy cô đã duyệt".
  const { reviews } = await itemReviews(m.id);
  const approved = new Set(moduleItems(m.content).filter((x) => itemStatus(x, reviews.get(x.ref)) === "approved").map((x) => x.ref));
  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student" nav={STUDENT_NAV} current="/student/practice">
      <div className="grid gap-8">
        <div className="grid gap-2">
          <Link href={`/student/module/${m.id}`} className="inline-flex min-h-11 w-fit items-center text-sm font-bold text-muted hover:text-ink">
            ← Về module
          </Link>
          <h1 className="text-4xl font-extrabold tracking-tight">Kho kiến thức</h1>
          <p className="max-w-prose text-muted">
            Unit {m.unitNo}: <span lang="en">{m.title}</span>. Nguồn: {m.content.edition}, {m.content.pages}. Mục ghi “Nhóm soạn” là phần nhóm tự viết thêm theo chủ đề (có AI hỗ trợ soạn); mục có dấu “Thầy cô đã duyệt” đã được giáo viên đọc và duyệt.
          </p>
        </div>
        <KnowledgeBank moduleId={m.id} m={m.content} approved={approved} />
      </div>
    </AppShell>
  );
}
