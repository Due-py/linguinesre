import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import DeleteAccountForm from "@/components/DeleteAccountForm";
import JoinClassForm from "@/components/JoinClassForm";
import { createClient } from "@/lib/supabase/server";
import { getProfile, homePathFor } from "@/lib/auth";
import { getParticipant } from "@/lib/research/server";

export const metadata: Metadata = { title: "Tài khoản" };
export const dynamic = "force-dynamic";

/** Tài khoản: thông tin đang lưu và xóa toàn bộ dữ liệu (M7). Dùng chung cho học sinh và giáo viên. */
export default async function AccountPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.onboarded) redirect("/onboarding");
  const participant = profile.role === "student" ? await getParticipant(profile.id) : null;
  const home = homePathFor(profile.role);
  // RLS: học sinh chỉ thấy lớp mình đã vào.
  const classes =
    profile.role === "student" ? ((await (await createClient()).from("classes").select("id, name").eq("status", "active").order("created_at")).data ?? []) : [];

  return (
    <AppShell name={participant?.code ?? profile.displayName ?? ""} roleLabel={profile.role === "teacher" ? "Giáo viên" : "Học sinh"} homeHref={home}>
      <div className="grid max-w-prose gap-10">
        <section className="grid gap-3">
          <h1 className="text-4xl font-extrabold tracking-tight">Tài khoản</h1>
          <dl className="divide-y divide-line border-y border-line">
            <Row label={participant ? "Mã học sinh" : "Tên hiển thị"} value={participant?.code ?? profile.displayName ?? ""} />
            <Row label="Vai trò" value={profile.role === "teacher" ? "Giáo viên" : "Học sinh"} />
            {profile.grade && <Row label="Khối lớp" value={`Lớp ${profile.grade}`} />}
          </dl>
          <p className="text-muted">
            Web lưu gì, gửi cho dịch vụ nào và ai được xem: đọc{" "}
            <Link href="/quyen-rieng-tu" className="font-semibold text-brand-strong underline underline-offset-4">
              Quyền riêng tư
            </Link>
            .
          </p>
        </section>

        {profile.role === "student" && (
          <section id="lop" aria-labelledby="class" className="grid scroll-mt-24 gap-4">
            <h2 id="class" className="text-2xl font-extrabold tracking-tight">
              Lớp của bạn
            </h2>
            {classes.length > 0 ? (
              <ul className="divide-y divide-line border-y border-line">
                {classes.map((c) => (
                  <li key={c.id} className="py-3 text-lg font-semibold">
                    {c.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">Bạn chưa vào lớp nào. Vào lớp thì thầy cô xem được các buổi luyện tự do của bạn.</p>
            )}
            <JoinClassForm />
          </section>
        )}

        <section aria-labelledby="delete" className="grid gap-4 rounded-2xl border border-danger/30 bg-surface p-6">
          <h2 id="delete" className="text-2xl font-extrabold tracking-tight">
            Xóa tài khoản
          </h2>
          <p>
            Xóa ngay và <strong>không lấy lại được</strong>: tài khoản, mọi file ghi âm, chữ ghi lời, nhận xét, lịch sử luyện tập
            {participant ? ", bài kiểm tra và các buổi luyện của nghiên cứu" : ""}
            {profile.role === "teacher" ? ", và các lớp bạn đã tạo (học sinh vẫn giữ tài khoản và bài luyện của mình)" : ""}.
          </p>
          {participant && (
            <p className="rounded-xl bg-warn-soft px-4 py-3 font-semibold text-warn">
              Bạn đang tham gia nghiên cứu. Bạn có quyền rút lui bất cứ lúc nào. Nếu xóa, hãy báo nhóm nghiên cứu để họ xóa cả bản
              dữ liệu đã xuất ra trước đó (nếu có).
            </p>
          )}
          <DeleteAccountForm />
        </section>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
