import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SessionRunner from "@/components/SessionRunner";
import { requireRole } from "@/lib/auth";
import { requirePracticeAccess } from "@/lib/research/server";
import { loadSession } from "@/lib/practice";

export const metadata: Metadata = { title: "Buổi luyện nói" };
export const dynamic = "force-dynamic";

/** Màn hình luyện nói. Mở lại giữa chừng thì tiếp tục từ câu đầu tiên chưa trả lời. */
export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole("student");
  await requirePracticeAccess(profile.id);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const session = await loadSession(id, profile.id);
  if (!session || session.questions.length === 0) notFound();
  return <SessionRunner sessionId={session.id} unitTitle={session.unitTitle} questions={session.questions} />;
}
