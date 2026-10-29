import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/AppShell";
import { CreateClassForm } from "@/components/ClassForms";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Tạo lớp" };
export const dynamic = "force-dynamic";

export default async function NewClassPage() {
  const profile = await requireRole("teacher");
  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Giáo viên" homeHref="/teacher">
      <div className="grid gap-8">
        <Link href="/teacher" className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden />
          Về danh sách lớp
        </Link>
        <h1 className="text-4xl font-extrabold tracking-tight">Tạo lớp mới</h1>
        <CreateClassForm />
      </div>
    </AppShell>
  );
}
