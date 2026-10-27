import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { logout } from "@/app/(auth)/actions";
import { SiteHeader } from "@/components/site-header";
import { UNITS } from "@/content/units";
import { isSupabaseConfigured, NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Góc học · LinguaReflex", robots: { index: false } };

export default function StudentHomePage() {
  return (
    <>
      <SiteHeader>
        <form action={logout}>
          <button className="rounded-full px-4 py-2 hover:bg-surface">Đăng xuất</button>
        </form>
      </SiteHeader>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-16 pt-6">
        {isSupabaseConfigured() ? (
          <Suspense fallback={<p className="text-muted">Đang tải…</p>}>
            <StudentHome />
          </Suspense>
        ) : (
          <p className="rounded-3xl bg-level-2 p-5">{NOT_CONFIGURED_MESSAGE}</p>
        )}
      </main>
    </>
  );
}

/** Reads the session, so it streams in behind the Suspense boundary. */
async function StudentHome() {
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/dang-nhap");

  // Row-level security only returns this student's own row and class.
  const { data: student } = await supabase
    .from("students")
    .select("nickname, baseline_done_at, classes(name)")
    .eq("id", claims.claims.sub)
    .maybeSingle();
  if (!student) redirect("/dang-nhap");

  const klass = student.classes as unknown as { name: string } | null;

  return (
    <>
      <section className="flex flex-col gap-2">
        <p className="text-muted">{klass?.name}</p>
        <h1 className="text-4xl font-extrabold">Chào {student.nickname}!</h1>
      </section>

      {!student.baseline_done_at && (
        <section className="flex flex-col gap-2 rounded-3xl bg-level-0 p-6">
          <p className="text-sm font-semibold text-muted">Bước đầu tiên</p>
          <h2 className="text-2xl font-extrabold">Test thử 2–3 phút</h2>
          <p>Thử micro và trả lời vài câu hỏi ngắn, để LinguaReflex biết bạn bắt đầu từ đâu.</p>
          <p className="text-sm text-muted">Sắp có — đang được xây dựng (Giai đoạn 2).</p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-extrabold">Chọn Unit</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {UNITS.map((unit) => (
            <li key={unit.id} className="rounded-3xl bg-surface p-5">
              <p className="text-sm font-semibold text-muted">
                Lớp {unit.grade} · Unit {unit.unit}
              </p>
              <p className="text-xl font-bold">{unit.title}</p>
              <p className="text-muted">{unit.titleVi}</p>
              <p className="mt-3 text-sm text-muted">
                {unit.status === "teacher-approved" ? "Sẵn sàng luyện tập" : "Đang được thầy cô duyệt — sắp mở"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
