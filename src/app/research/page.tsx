import type { Metadata } from "next";
import AppShell, { TEACHER_NAV, type NavItem } from "@/components/AppShell";
import ResearchDashboard, { TABS, type TabId } from "@/components/research/ResearchDashboard";
import { buildDashboard } from "@/lib/research/analysis";
import { loadResearchData, parseArm, parseDay, requireResearch } from "@/lib/research/dashboardServer";

export const metadata: Metadata = { title: "Dữ liệu nghiên cứu", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Trang thống kê nghiên cứu. Chỉ tài khoản có trong research_staff mở được (kiểm tra ở máy chủ, bảng không có policy RLS).
 * Mức "blind" không bao giờ nhận dữ liệu nhóm A/B: analysis.ts bỏ cột đó trước khi trả về, nên trình duyệt không có nó.
 */
export default async function ResearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const access = await requireResearch();
  const sp = await searchParams;
  const tab: TabId = TABS.some((t) => t.id === sp.tab) ? (sp.tab as TabId) : "tong-quan";
  const filters = { arm: access.showArms ? parseArm(sp.arm) : null, from: parseDay(sp.from), to: parseDay(sp.to) };

  const loaded = await loadResearchData();
  const d = buildDashboard(loaded.raw, { showArms: access.showArms, ...filters });

  const nav: NavItem[] = [...(access.profile.role === "teacher" ? TEACHER_NAV : []), { href: "/research", label: "Nghiên cứu" }];
  return (
    <AppShell name={access.profile.displayName ?? ""} roleLabel={access.label ?? "Nhóm nghiên cứu"} homeHref="/research" nav={nav} current="/research">
      <ResearchDashboard
        d={d}
        tab={tab}
        filters={filters}
        level={access.level}
        unblinded={access.unblinded}
        sheets={{ configured: loaded.sheetsConfigured, state: loaded.sheetState, errors: loaded.sheetErrors }}
      />
    </AppShell>
  );
}
