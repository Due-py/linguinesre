import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Download, EyeOff, Info, Lock } from "lucide-react";
import { Chip, Eyebrow, Highlight, Stat } from "@/components/ui";
import { BarChart, fmt, Legend, LineChart, type Series } from "@/components/research/Charts";
import type { Dashboard, GroupSplit, PersonRow, Stat as S } from "@/lib/research/analysis";
import { FLCAS_SPEAKING } from "@/lib/research/flcas";

/**
 * Trang thống kê nghiên cứu. Chỉ hiển thị số liệu thật từ CSDL và Google Sheets; chưa có dữ liệu thì hiện trạng thái bắt đầu.
 * Không có nút xóa hay "loại" dữ liệu. Không tô đẹp kết quả: luôn hiện n, độ lệch chuẩn, và dữ liệu còn thiếu.
 */

export const TABS = [
  { id: "tong-quan", label: "Tổng quan" },
  { id: "noi", label: "Nói" },
  { id: "lo-au", label: "Lo âu" },
  { id: "luyen-tap", label: "Luyện tập" },
  { id: "khao-sat", label: "Khảo sát" },
  { id: "du-lieu", label: "Dữ liệu" },
  { id: "chat-luong", label: "Chất lượng dữ liệu" },
] as const;
export type TabId = (typeof TABS)[number]["id"];

export type Filters = { arm: "A" | "B" | null; from: string | null; to: string | null };
export type SheetStatus = { configured: boolean; state: Record<string, string>; errors: string[] };

const qs = (tab: string, f: Filters, extra: Record<string, string> = {}) => {
  const p = new URLSearchParams({ tab, ...(f.arm ? { arm: f.arm } : {}), ...(f.from ? { from: f.from } : {}), ...(f.to ? { to: f.to } : {}), ...extra });
  return `?${p}`;
};

const exportHref = (kind: string, f: Filters) =>
  `/research/export?${new URLSearchParams({ kind, ...(f.arm ? { arm: f.arm } : {}), ...(f.from ? { from: f.from } : {}), ...(f.to ? { to: f.to } : {}) })}`;

const pct = (v: number | null) => (v === null ? "—" : `${fmt(v, 1)}%`);
const sec = (ms: number | null) => (ms === null ? "—" : fmt(ms / 1000));

function Card({ title, children, note }: { title: ReactNode; children: ReactNode; note?: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
      {note && <p className="text-sm text-muted">{note}</p>}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-sunken px-4 py-3 text-muted">{children}</p>;
}

function Table({ head, rows, caption }: { head: ReactNode[]; rows: ReactNode[][]; caption?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-max text-left text-sm tabular-nums">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-sunken text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ms = (s: S, d = 2) => (s.n === 0 ? "—" : `${fmt(s.mean, d)} ± ${fmt(s.sd, d)}`);

/** Các nhóm để vẽ: chỉ "Cả mẫu" khi xem mù; "Chế độ A", "Chế độ B" khi được xem nhóm. */
function groups<T>(g: GroupSplit<T>): { name: string; v: T }[] {
  return g.A && g.B ? [{ name: "Chế độ A", v: g.A }, { name: "Chế độ B", v: g.B }] : [{ name: "Cả mẫu", v: g.all }];
}

function prePost<T>(pre: GroupSplit<T>, post: GroupSplit<T>, pick: (t: T) => S): Series[] {
  const a = groups(pre);
  const b = groups(post);
  return a.map((g, i) => ({ name: g.name, values: [pick(g.v).mean, pick(b[i].v).mean], err: [pick(g.v).sd, pick(b[i].v).sd] }));
}

export default function ResearchDashboard({
  d,
  tab,
  filters,
  level,
  unblinded,
  sheets,
}: {
  d: Dashboard;
  tab: TabId;
  filters: Filters;
  level: "blind" | "key";
  unblinded: boolean;
  sheets: SheetStatus;
}) {
  return (
    <div className="grid gap-6">
      <header className="grid gap-3">
        <Eyebrow>Nghiên cứu LINGUA-REFLEX · chỉ nhóm nghiên cứu</Eyebrow>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Dữ liệu <Highlight>nghiên cứu</Highlight>
        </h1>
        <div className="flex flex-wrap gap-2">
          {d.showArms ? (
            <Chip tone="yellow" icon={<Lock className="size-4" aria-hidden />}>
              {level === "key" ? "Mức giữ danh sách: đang thấy nhóm A/B. Không cho người chấm mù xem màn hình này." : "Đã mở so sánh A/B (chấm mù đã xong)"}
            </Chip>
          ) : (
            <Chip tone="grey" icon={<EyeOff className="size-4" aria-hidden />}>
              Xem mù: không hiện nhóm A/B {unblinded ? "" : "(mở sau khi chấm mù xong)"}
            </Chip>
          )}
          {(filters.from || filters.to) && <Chip tone="blue">Đang lọc thời gian: {filters.from ?? "…"} → {filters.to ?? "…"}</Chip>}
        </div>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-3xl bg-tint p-4" aria-label="Bộ lọc">
        <input type="hidden" name="tab" value={tab} />
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Từ ngày</span>
          <input type="date" name="from" defaultValue={filters.from ?? ""} className="min-h-11 rounded-xl border border-line-strong bg-surface px-3" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Đến ngày</span>
          <input type="date" name="to" defaultValue={filters.to ?? ""} className="min-h-11 rounded-xl border border-line-strong bg-surface px-3" />
        </label>
        {d.showArms && (
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Nhóm (bảng Dữ liệu)</span>
            <select name="arm" defaultValue={filters.arm ?? ""} className="min-h-11 rounded-xl border border-line-strong bg-surface px-3">
              <option value="">Cả hai nhóm</option>
              <option value="A">Chế độ A</option>
              <option value="B">Chế độ B</option>
            </select>
          </label>
        )}
        <button type="submit" className="press min-h-11 rounded-full bg-brand px-5 font-medium text-on-brand">
          Lọc
        </button>
        <Link href={`?tab=${tab}`} className="min-h-11 content-center rounded-full px-4 font-medium text-brand hover:bg-brand-soft">
          Bỏ lọc
        </Link>
      </form>

      <nav aria-label="Các phần" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={qs(t.id, filters)}
            aria-current={t.id === tab ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${t.id === tab ? "bg-brand-tonal text-brand-strong" : "text-muted hover:bg-sunken hover:text-ink"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "tong-quan" && <Overview d={d} sheets={sheets} />}
      {tab === "noi" && <Speaking d={d} />}
      {tab === "lo-au" && <Anxiety d={d} />}
      {tab === "luyen-tap" && <Practice d={d} />}
      {tab === "khao-sat" && <Surveys d={d} />}
      {tab === "du-lieu" && <Data d={d} filters={filters} />}
      {tab === "chat-luong" && <Quality d={d} sheets={sheets} />}
    </div>
  );
}

function Overview({ d, sheets }: { d: Dashboard; sheets: SheetStatus }) {
  const c = d.counts;
  if (c.participants === 0)
    return <Empty>Chưa có học sinh tham gia nghiên cứu. Tạo tài khoản bằng npm run research:students (xem research-system/HUONG-DAN.md).</Empty>;
  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Học sinh tham gia" value={c.participants} note={`Không tính ${c.pilots} bạn thử đề${c.withdrawn ? `; ${c.withdrawn} bạn đã rút (vẫn giữ trong bảng)` : ""}`} />
        <Stat label="Chế độ A / Chế độ B" value={c.arms ? `${c.arms.A} / ${c.arms.B}` : null} empty="Ẩn khi xem mù" note={c.arms?.none ? `${c.arms.none} bạn chưa chia nhóm` : undefined} />
        <Stat label="Kiểm tra nói đã xong" value={`${c.preDone} / ${c.postDone}`} note="đầu vào / đầu ra" />
        <Stat label="Hoàn thành thực nghiệm" value={c.completionRate === null ? null : pct(c.completionRate)} note="đã làm xong bài đầu ra" />
        <Stat label="Buổi luyện đã ghi" value={c.sessionsRecorded} note={`${c.sessionsCompleted} buổi hoàn thành`} />
        <Stat label="Luyện ≥ 10 buổi (≥ 10 phút)" value={c.tenOrMore} note="ngưỡng phân tích phụ (Quy trình mục 4.1)" />
      </div>
      <Card title="Kết nối Google Forms">
        {!sheets.configured ? (
          <Empty>Chưa kết nối. Đặt RESEARCH_SHEETS_URL và RESEARCH_SHEETS_SECRET trên máy chủ (HUONG-DAN.md, bước 4).</Empty>
        ) : (
          <Table
            head={["Form", "Trạng thái"]}
            rows={Object.entries(sheets.state).map(([k, v]) => [k, v === "ok" ? "Đã kết nối" : v === "not_created" ? "Chưa tạo form (chạy taoTatCa)" : v === "error" ? "Lỗi khi đọc" : "Chưa kết nối"])}
          />
        )}
        {sheets.errors.length > 0 && <p className="text-sm text-danger">{sheets.errors.join(" · ")}</p>}
      </Card>
    </div>
  );
}

function Speaking({ d }: { d: Dashboard }) {
  const sp = d.speaking;
  const g = groups(sp.pre).map((x, i) => ({ name: x.name, pre: x.v, post: groups(sp.post)[i].v }));
  const hasAny = g.some((x) => x.pre.rl.n > 0);
  return (
    <div className="grid gap-6">
      <Card
        title="Thời gian phản xạ (RL) – trước và sau"
        note="Mỗi học sinh: trung vị RL của 15 câu (câu không trả lời = 10 giây). Biểu đồ: trung bình các học sinh ± độ lệch chuẩn. Đây là số mô tả; phép so sánh chính (ANCOVA) làm theo kế hoạch phân tích đã khóa."
      >
        {!hasAny ? (
          <Empty>Chưa có bài kiểm tra nói nào hoàn thành.</Empty>
        ) : (
          <>
            <Legend names={g.map((x) => x.name)} />
            <LineChart x={["Đầu vào", "Đầu ra"]} series={prePost(sp.pre, sp.post, (t) => t.rl)} unit="giây" label="RL trung bình trước và sau thực nghiệm" />
            <Table
              caption="RL theo nhóm"
              head={["Nhóm", "n đầu vào", "RL đầu vào (TB ± SD)", "Trung vị", "n đầu ra", "RL đầu ra (TB ± SD)", "Trung vị"]}
              rows={g.map((x) => [x.name, x.pre.rl.n, ms(x.pre.rl), fmt(x.pre.rl.median), x.post.rl.n, ms(x.post.rl), fmt(x.post.rl.median)])}
            />
          </>
        )}
      </Card>
      <Card
        title="Độ chính xác và hoàn chỉnh (0–2)"
        note={`ĐTB = trung bình điểm 0–2 của các câu; ACC = % câu đạt 2. Chỉ tính bài đã chấm đủ mọi câu. Đã chấm ${sp.scored}/${sp.responses} câu trả lời.`}
      >
        {sp.scored === 0 ? (
          <Empty>Chưa có điểm chấm mù. Chấm vào tháng 12, cùng lúc bài đầu vào và đầu ra (Quy trình mục 3.6).</Empty>
        ) : (
          <>
            <Legend names={g.map((x) => x.name)} />
            <LineChart x={["Đầu vào", "Đầu ra"]} series={prePost(sp.pre, sp.post, (t) => t.dtb)} unit="ĐTB (0–2)" label="ĐTB trước và sau" />
            <Table
              head={["Nhóm", "ĐTB đầu vào", "ĐTB đầu ra", "ACC đầu vào", "ACC đầu ra"]}
              rows={g.map((x) => [x.name, ms(x.pre.dtb), ms(x.post.dtb), x.pre.acc.n ? pct(x.pre.acc.mean) : "—", x.post.acc.n ? pct(x.post.acc.mean) : "—"])}
            />
          </>
        )}
        <p className="text-sm">
          Chấm đôi (20%): {sp.kappa.n ? `${sp.kappa.n} câu, trùng ${pct((sp.kappa.agree ?? 0) * 100)}, Cohen's kappa = ${fmt(sp.kappa.kappa, 3)}` : "chưa có"}
          {sp.kappa.kappa !== null && (sp.kappa.kappa >= 0.6 ? " (đạt ≥ 0,6)" : " (dưới 0,6: thống nhất lại bảng chấm, chấm lại 20%)")}
          {sp.conflicts > 0 && ` · ${sp.conflicts} câu lệch điểm chưa thống nhất`}
        </p>
      </Card>
      <Card title="Kiến thức trên giấy và tốc độ nói (CH1)" note="Ngưỡng khóa trước (Quy trình mục 4.2): mini-test ≥ 16/20 và RL đầu vào > 3 giây.">
        {!d.knowledge.connected ? (
          <Empty>Chưa kết nối form mini-test (F3).</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Mini-test (TB ± SD, /20)" value={d.knowledge.mini.n ? ms(d.knowledge.mini, 1) : null} note={`n = ${d.knowledge.mini.n}`} />
            <Stat
              label="Giỏi trên giấy nhưng nói chậm"
              value={d.knowledge.paperSlow.eligible ? `${d.knowledge.paperSlow.count} / ${d.knowledge.paperSlow.eligible}` : null}
              note="trên số học sinh có cả mini-test và RL đầu vào"
            />
          </div>
        )}
      </Card>
    </div>
  );
}

function Anxiety({ d }: { d: Dashboard }) {
  const a = d.anxiety;
  if (!a.connected.pre && !a.connected.post) return <Empty>Chưa kết nối form FLCAS (F2, F6).</Empty>;
  const g = groups(a.pre).map((x, i) => ({ name: x.name, pre: x.v, post: groups(a.post)[i].v }));
  const has = g.some((x) => x.pre.speaking.n > 0 || x.post.speaking.n > 0);
  return (
    <div className="grid gap-6">
      <Card
        title="FLCAS – các câu về Nói (chỉ số chính)"
        note={`Thang 1–5, điểm cao = lo âu cao, đã tính ngược các câu thoải mái. Câu về Nói: ${FLCAS_SPEAKING.join(", ")} (nhóm phải chốt trong kế hoạch phân tích). ${a.pairs} học sinh có cả hai lần.`}
      >
        {!has ? (
          <Empty>Chưa có câu trả lời FLCAS.</Empty>
        ) : (
          <>
            <Legend names={g.map((x) => x.name)} />
            <LineChart x={["Lần 1 (trước)", "Lần 2 (sau)"]} series={prePost(a.pre, a.post, (t) => t.speaking)} unit="điểm 1–5" label="FLCAS câu về Nói, trước và sau" />
            <Table
              head={["Nhóm", "n lần 1", "Nói: lần 1", "n lần 2", "Nói: lần 2", "Cả thang: lần 1", "Cả thang: lần 2"]}
              rows={g.map((x) => [x.name, x.pre.speaking.n, ms(x.pre.speaking), x.post.speaking.n, ms(x.post.speaking), ms(x.pre.total), ms(x.post.total)])}
            />
          </>
        )}
      </Card>
      <Card title="Độ tin cậy (Cronbach's alpha, lần 1)" note="≥ 0,7 là chấp nhận được (Quy trình mục 3.3). Chỉ tính người trả lời đủ 33 câu.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Cả thang (33 câu)" value={a.alphaPre === null ? null : fmt(a.alphaPre, 3)} />
          <Stat label="Các câu về Nói" value={a.alphaPreSpeaking === null ? null : fmt(a.alphaPreSpeaking, 3)} />
        </div>
      </Card>
    </div>
  );
}

function Practice({ d }: { d: Dashboard }) {
  const bs = d.practice.bySession;
  const any = bs.some((b) => b.all > 0);
  const series: Series[] = d.showArms ? [{ name: "Chế độ A", values: bs.map((b) => b.A ?? 0) }, { name: "Chế độ B", values: bs.map((b) => b.B ?? 0) }] : [{ name: "Cả mẫu", values: bs.map((b) => b.all) }];
  const curve = d.practice.curve;
  const w = d.weekly;
  return (
    <div className="grid gap-6">
      <Card title="Số học sinh hoàn thành mỗi buổi" note="Buổi số 1–15 của từng học sinh (không phải ngày).">
        {!any ? (
          <Empty>Chưa có buổi luyện nào hoàn thành.</Empty>
        ) : (
          <>
            <Legend names={series.map((s) => s.name)} />
            <BarChart x={bs.map((b) => String(b.no))} series={series} unit="học sinh" label="Số học sinh hoàn thành theo buổi số" />
            <Table head={["Buổi", ...series.map((s) => s.name)]} rows={bs.map((b, i) => [b.no, ...series.map((s) => s.values[i] ?? 0)])} />
          </>
        )}
      </Card>
      {curve && (
        <Card title="Chế độ A: RL qua các buổi theo mức giới hạn (CH3)" note="Trung vị RL các lượt Speed Q&A đo được, theo buổi số. Mô tả xu hướng, không dùng để kết luận cơ chế nào gây ra hiệu quả.">
          {curve.every((c) => c.turns === 0) ? (
            <Empty>Chưa có lượt luyện chế độ A.</Empty>
          ) : (
            <>
              <Legend names={["Giới hạn 5 giây", "Giới hạn 3 giây", "Giới hạn 1,5 giây"]} />
              <LineChart
                x={curve.map((c) => String(c.no))}
                series={[
                  { name: "5 giây", values: curve.map((c) => c.byLimit["5000"]) },
                  { name: "3 giây", values: curve.map((c) => c.byLimit["3000"]) },
                  { name: "1,5 giây", values: curve.map((c) => c.byLimit["1500"]) },
                ]}
                unit="giây"
                label="RL trung vị theo buổi, chế độ A"
              />
              <Table
                head={["Buổi", "Số lượt", "RL 5 s", "RL 3 s", "RL 1,5 s", "Kịp giờ", "Mức gợi ý TB (0–4)"]}
                rows={curve.map((c) => [c.no, c.turns, fmt(c.byLimit["5000"]), fmt(c.byLimit["3000"]), fmt(c.byLimit["1500"]), pct(c.inLimitPct), fmt(c.hintMean)])}
              />
            </>
          )}
        </Card>
      )}
      <Card title="Khảo sát hằng tuần (F5)" note="Đếm trên mọi lần nộp. Luyện thêm ở nơi khác là bình thường; số này giúp hiểu đúng kết quả.">
        {!w.connected ? (
          <Empty>Chưa kết nối form F5.</Empty>
        ) : w.responses === 0 ? (
          <Empty>Chưa có câu trả lời.</Empty>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Lượt trả lời" value={w.responses} />
              <Stat label="Có luyện nói ở nơi khác" value={w.elsewhere} />
              <Stat label="Dùng thử chế độ của bạn khác" value={w.contamination} />
              <Stat label="Có bỏ lỡ buổi" value={w.missed} />
            </div>
            {w.tech.length > 0 && <Table caption="Vấn đề kỹ thuật" head={["Ngày", "Mã", "Vấn đề"]} rows={w.tech.map((t) => [t.at ?? "—", t.code, t.text])} />}
          </>
        )}
      </Card>
    </div>
  );
}

function Surveys({ d }: { d: Dashboard }) {
  const c = d.ch1;
  const grades = Object.keys(c.byGrade).map(Number).sort((a, b) => a - b);
  return (
    <div className="grid gap-6">
      <Card title="Khảo sát thực trạng (CH1, ẩn danh)" note="% đồng ý = chọn 4 hoặc 5. Mỗi câu báo cáo riêng, không cộng thành một điểm.">
        {!c.connected ? (
          <Empty>Chưa kết nối form F1.</Empty>
        ) : c.n === 0 ? (
          <Empty>Chưa có câu trả lời.</Empty>
        ) : (
          <>
            <p className="text-sm">
              {c.n} câu trả lời · {grades.map((g) => `lớp ${g}: ${c.byGrade[g]}`).join(" · ")}
            </p>
            <Table head={["Câu", "n", "% đồng ý", ...grades.map((g) => `Lớp ${g}`)]} rows={c.items.map((i) => [i.title, i.n, pct(i.agreePct), ...grades.map((g) => pct(i.byGrade[g] ?? null))])} />
          </>
        )}
      </Card>
      <Card title="Phiếu cảm nhận sau thực nghiệm (F7)" note="Mỗi chế độ chỉ được hỏi về cách luyện của mình, nên không so sánh trực tiếp hai nhánh.">
        {!d.perception ? (
          <Empty>{d.showArms ? "Chưa kết nối form F7 hoặc chưa có câu trả lời." : "Ẩn khi xem mù (mỗi nhánh câu hỏi thuộc một chế độ)."}</Empty>
        ) : (
          <>
            <Table head={["Chế độ A (n = " + d.perception.n.A + ")", "TB 1–5", "n"]} rows={d.perception.A.map((i) => [i.title, fmt(i.mean), i.n])} />
            <Table head={["Chế độ B (n = " + d.perception.n.B + ")", "TB 1–5", "n"]} rows={d.perception.B.map((i) => [i.title, fmt(i.mean), i.n])} />
          </>
        )}
      </Card>
    </div>
  );
}

const consentLabel = (p: PersonRow) => (p.consent === "full" ? "Đủ" : p.consent === "partial" ? "Thiếu một" : "Chưa có");

function Data({ d, filters }: { d: Dashboard; filters: Filters }) {
  const rows = d.people.filter((p) => !p.pilot);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-3">
        {[
          { kind: "hoc-sinh", label: "Tải CSV: mỗi học sinh một dòng" },
          { kind: "kiem-tra", label: "Tải CSV: từng câu kiểm tra nói" },
        ].map((k) => (
          <a key={k.kind} href={exportHref(k.kind, filters)} className="press inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-5 font-medium text-brand hover:bg-brand-soft">
            <Download className="size-4" aria-hidden />
            {k.label}
          </a>
        ))}
      </div>
      <p className="text-sm text-muted">
        {d.showArms ? "File CSV có cột nhóm A/B: không gửi cho người chấm mù." : "File CSV không có cột nhóm A/B."} Không có họ tên, email hay file ghi âm.
      </p>
      {rows.length === 0 ? (
        <Empty>Chưa có học sinh nào{filters.arm ? ` ở chế độ ${filters.arm}` : ""}.</Empty>
      ) : (
        <Table
          caption="Dữ liệu theo mã học sinh"
          head={["Mã", "Lớp", ...(d.showArms ? ["Nhóm"] : []), "Thứ tự đề", "RL vào (s)", "RL ra (s)", "ĐTB vào", "ĐTB ra", "FLCAS Nói 1", "FLCAS Nói 2", "Mini", "Buổi ≥10′", "Phút luyện", "Đồng ý", "Ghi chú"]}
          rows={rows.map((p) => [
            p.code,
            p.grade,
            ...(d.showArms ? [p.arm ?? "—"] : []),
            p.formOrder,
            sec(p.pre.rlMedianMs),
            sec(p.post.rlMedianMs),
            fmt(p.pre.dtb),
            fmt(p.post.dtb),
            fmt(p.flcasPre?.speakingMean),
            fmt(p.flcasPost?.speakingMean),
            p.mini ?? "—",
            p.sessions.tenMin,
            p.sessions.minutes,
            consentLabel(p),
            p.withdrawn ? `Rút ${p.withdrawn}` : "",
          ])}
        />
      )}
    </div>
  );
}

function Quality({ d, sheets }: { d: Dashboard; sheets: SheetStatus }) {
  const issues = [...d.quality, ...sheets.errors.map((e) => ({ severity: "warn" as const, title: `Không đọc được Google Sheets: ${e}`, detail: undefined, codes: undefined }))];
  return (
    <div className="grid gap-4">
      <p className="text-muted">Trang này chỉ báo vấn đề. Không có dữ liệu nào bị xóa hay loại khỏi phân tích ở đây; quyết định loại dữ liệu theo kế hoạch phân tích đã khóa và ghi vào nhật ký.</p>
      {issues.length === 0 ? (
        <Empty>Không phát hiện vấn đề nào.</Empty>
      ) : (
        <ul className="grid gap-3">
          {issues.map((i, k) => (
            <li key={k} className="grid gap-1 rounded-2xl border border-line bg-surface p-4">
              <p className="flex items-center gap-2 font-medium">
                {i.severity === "warn" ? <AlertTriangle className="size-4 text-warn" aria-hidden /> : <Info className="size-4 text-muted" aria-hidden />}
                <span>{i.severity === "warn" ? "Cần xử lý: " : "Lưu ý: "}{i.title}</span>
              </p>
              {i.detail && <p className="text-sm text-muted">{i.detail}</p>}
              {i.codes && <p className="break-words text-sm tabular-nums">{i.codes.join(", ")}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
