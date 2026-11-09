import type { Metadata } from "next";
import Link from "next/link";
import { AudioWaveform, BookA, Gauge, Mic, MessageSquareText, Spline } from "lucide-react";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import { Highlight } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { requirePracticeAccess } from "@/lib/research/server";
import { learningData } from "@/lib/adventure/server";
import { BAND_VI, skillResults, type Band } from "@/lib/adventure/skills";
import { SKILL_VI, type SkillKey } from "@/lib/adventure/world";

export const metadata: Metadata = { title: "Kỹ năng nói" };
export const dynamic = "force-dynamic";

const ICON: Record<SkillKey, typeof Mic> = { vocabulary: BookA, grammar: Spline, fluency: AudioWaveform, pronunciation: Mic, speed: Gauge, completeness: MessageSquareText };
const STEPS: Band[] = ["emerging", "developing", "secure"];
const TONE: Record<Band, string> = { none: "bg-sunken text-muted", emerging: "bg-warn-soft text-warn", developing: "bg-success-soft text-success-strong", secure: "bg-brand-soft text-brand-strong" };

/**
 * TIẾN TRÌNH HỌC: sáu kỹ năng nói tính từ số đo thật của nhiều lượt làm. Trang này không đọc XP hay thành tích:
 * làm xong nhiệm vụ không làm kỹ năng tăng. Không có phần trăm "trình độ", chỉ mức theo quy tắc ghi rõ và bằng chứng.
 */
export default async function SkillsPage() {
  const profile = await requireRole("student");
  await requirePracticeAccess(profile.id);
  const { attempts } = await learningData(profile.id);
  const skills = skillResults(attempts);

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student" nav={STUDENT_NAV} current="/student/ky-nang">
      <div className="grid gap-10">
        <div className="grid gap-3">
          <h1 className="text-balance text-5xl font-semibold tracking-tight">
            Kỹ năng <Highlight>nói</Highlight>
          </h1>
          <p className="max-w-prose text-lg text-muted">
            Tính từ số đo thật khi em nói và làm bài, qua nhiều bài khác nhau. Cấp phiêu lưu và XP không làm kỹ năng tăng: chỉ khi em nói tốt hơn thì mức ở đây mới đổi.
          </p>
        </div>

        <ul className="grid gap-4 md:grid-cols-2">
          {skills.map((s, i) => {
            const Icon = ICON[s.skill];
            const level = STEPS.indexOf(s.band);
            return (
              <li key={s.skill} className="pop-in grid content-start gap-4 rounded-[2rem] bg-tint p-6" style={{ ["--i" as string]: i }}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
                    <span aria-hidden className="grid size-11 place-items-center rounded-2xl bg-surface text-brand shadow-card">
                      <Icon className="size-6" />
                    </span>
                    {SKILL_VI[s.skill]}
                  </h2>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${TONE[s.band]}`}>{BAND_VI[s.band]}</span>
                </div>
                {s.band !== "none" && (
                  <ol aria-label="Ba mức" className="grid grid-cols-3 gap-1.5">
                    {STEPS.map((b, k) => (
                      <li key={b} className="grid gap-1">
                        <span aria-hidden className={`h-2 rounded-full ${k <= level ? "bg-brand" : "bg-line"}`} />
                        <span className={`text-xs ${k === level ? "font-semibold text-ink" : "text-muted"}`}>{BAND_VI[b]}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <ul className="grid gap-1">
                  {s.evidence.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
                <details className="text-sm text-muted">
                  <summary className="min-h-11 cursor-pointer content-center font-medium">Cách xếp mức</summary>
                  <p className="pb-1">{s.ruleVi}</p>
                  <p>
                    Dựa trên {s.activities} lượt ở {s.lessons} bài. Cần đủ dữ liệu ở ít nhất 2 bài mới xếp mức. Các mốc do nhóm đặt cho học sinh lớp 8, không phải chuẩn quốc tế.
                  </p>
                </details>
              </li>
            );
          })}
        </ul>

        <p className="max-w-prose text-sm text-muted">
          Muốn xem từng Unit (bài đầu và cuối module, thời gian bắt đầu nói theo ngày, lỗi hay gặp)? Mở{" "}
          <Link href="/student/phieu-luu" className="font-semibold text-brand-strong hover:underline">
            bản đồ
          </Link>{" "}
          rồi chọn một nhiệm vụ đã xong.
        </p>
      </div>
    </AppShell>
  );
}
