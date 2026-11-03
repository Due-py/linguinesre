import { BookCheck, CircleCheck, CircleDashed, CircleMinus, Flag, History, MessageSquareText, Ruler, UsersRound } from "lucide-react";
import type { SpeechMeasures } from "@/lib/module/measure";
import type { VerifiedAssessment } from "@/lib/module/assessCore";
import type { Checkpoint, KnowledgeResult, ModuleReport, SpeakSummary } from "@/lib/module/report";
import { ERROR_TAGS, type ErrorTag } from "@/lib/module/schema";

/**
 * Khối hiển thị của module, dùng chung cho màn hình học (client) và trang tổng quan (server). Không dùng hook.
 * "Đo trực tiếp" (quy tắc) luôn tách khỏi "AI nhận xét". Không có điểm tổng.
 */

export const secs = (ms: number | null | undefined) => (ms === null || ms === undefined ? "chưa đo được" : `${(ms / 1000).toFixed(1).replace(".", ",")} giây`);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const LEVEL: Record<string, string> = { brief: "Ngắn, mới có một ý", adequate: "Có ý chính rõ ràng", developed: "Có ý chính kèm lý do hoặc chi tiết" };

/** Nguồn của một mục (SGK có trang, hoặc nhóm soạn), kèm dấu "Thầy cô đã duyệt" khi mục đó đã được duyệt đúng nội dung hiện tại. */
export function SourceBadge({ src, approved }: { src: { kind: "sgk" | "team"; page: number | null }; approved?: boolean }) {
  return (
    <>
      <span className="inline-flex w-fit items-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted">
        {src.kind === "sgk" ? `SGK tr. ${src.page}` : "Nhóm soạn"}
      </span>
      {approved && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success-strong">
          <CircleCheck className="size-3.5" aria-hidden />
          Thầy cô đã duyệt
        </span>
      )}
    </>
  );
}

function Row({ label, value, detail }: { label: string; value: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[12rem_1fr] sm:gap-3">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className="grid gap-0.5">
        <span className="font-medium">{value}</span>
        {detail && <span className="text-sm text-muted">{detail}</span>}
      </dd>
    </div>
  );
}

/** Một ô số đo: tên tiêu chí, giá trị, ghi chú ngắn. ok: true = đạt (xanh lá), false = nên luyện (vàng), null = trung tính. */
function Metric({ label, value, note, ok = null }: { label: string; value: React.ReactNode; note?: React.ReactNode; ok?: boolean | null }) {
  return (
    <div className={`grid content-start gap-1 rounded-2xl px-4 py-3 ${ok === true ? "bg-success-soft" : ok === false ? "bg-warn-soft" : "bg-tint"}`}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="grid gap-0.5">
        <span className={`text-lg font-medium ${ok === true ? "text-success-strong" : ok === false ? "text-warn" : ""}`}>{value}</span>
        {note && <span className="text-sm text-muted">{note}</span>}
      </dd>
    </div>
  );
}

/**
 * Tóm tắt có thể làm theo ngay, tính bằng quy tắc từ số đo thật (không AI, không điểm tổng): tối đa 2 điều em làm tốt và
 * 1 điều nên luyện tiếp. Ưu tiên điều quan trọng nhất cho phản xạ nói: bắt đầu kịp, nói đủ ý có lý do, dùng từ của bài.
 */
export function measuredSummary(
  m: SpeechMeasures,
  o: { keywords?: string[]; keywordsUsed?: string[]; reason?: "yes" | "no" | "not_required"; inTarget?: boolean | null },
): { good: string[]; next: string | null } {
  const good: string[] = [];
  const todo: string[] = [];
  if (o.inTarget === true) good.push("Bắt đầu nói kịp mục tiêu thời gian.");
  if (o.inTarget === false) todo.push("Bắt đầu nói sớm hơn: nghe xong câu hỏi là mở lời ngay, ý chưa hoàn chỉnh cũng được.");
  if (o.reason === "yes") good.push("Có nêu lý do cho câu trả lời.");
  if (o.reason === "no") todo.push("Thêm một lý do với “because…” hoặc “so…”.");
  const kw = o.keywords?.length ?? 0;
  const used = o.keywordsUsed?.length ?? 0;
  if (kw > 0 && used >= Math.ceil(kw / 2)) good.push(`Dùng được ${used} từ của bài.`);
  if (kw > 0 && used === 0) todo.push("Thử dùng ít nhất một từ của bài trong câu trả lời.");
  if (m.words >= 12) good.push("Câu trả lời đủ dài, có nhiều ý.");
  if (m.words > 0 && m.words < 6) todo.push("Nói thành câu đầy đủ hơn: thêm chủ ngữ, động từ và một chi tiết.");
  if (m.longPauses >= 2) todo.push("Bớt ngừng dài giữa câu: nghĩ trước ý chính, rồi nói liền một mạch.");
  return { good: good.slice(0, 2), next: todo[0] ?? null };
}

export function MeasuredPanel({
  m,
  keywords,
  keywordsUsed,
  reason,
  targetMs,
  inTarget,
}: {
  m: SpeechMeasures;
  keywords?: string[];
  keywordsUsed?: string[];
  reason?: "yes" | "no" | "not_required";
  targetMs?: number | null;
  inTarget?: boolean | null;
}) {
  const sum = measuredSummary(m, { keywords, keywordsUsed, reason, inTarget });
  return (
    <section className="sheet-up grid gap-4 rounded-[2rem] border border-line px-5 py-5 sm:px-6">
      <div className="grid gap-1">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Ruler className="size-5 text-brand" aria-hidden />
          Đo trực tiếp
        </h3>
        <p className="text-sm text-muted">Máy tính bằng quy tắc từ bản ghi, không do AI. Thời gian tính từ lúc đọc xong câu hỏi.</p>
      </div>
      {(sum.good.length > 0 || sum.next) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {sum.good.length > 0 && (
            <div className="grid content-start gap-1 rounded-2xl bg-success-soft px-4 py-3">
              <p className="flex items-center gap-1.5 font-medium text-success-strong">
                <CircleCheck className="size-4" aria-hidden />
                Em làm tốt
              </p>
              <ul className="grid gap-0.5 text-sm">
                {sum.good.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          )}
          {sum.next && (
            <div className="grid content-start gap-1 rounded-2xl bg-gold-soft px-4 py-3">
              <p className="flex items-center gap-1.5 font-medium text-warn">
                <Flag className="size-4" aria-hidden />
                Nên luyện tiếp
              </p>
              <p className="text-sm">{sum.next}</p>
            </div>
          )}
        </div>
      )}
      <dl className="grid gap-2 sm:grid-cols-2">
        <Metric
          label="Bắt đầu nói sau"
          value={secs(m.thinkMs)}
          ok={targetMs && inTarget !== null && inTarget !== undefined ? inTarget : null}
          note={targetMs ? (inTarget === null ? undefined : inTarget ? `Kịp mục tiêu ${secs(targetMs)}` : `Mục tiêu ${secs(targetMs)}`) : undefined}
        />
        <Metric label="Số từ" value={String(m.words)} />
        <Metric
          label="Độ trôi chảy"
          value={m.wpm === null ? "chưa đủ lời để đo" : `${m.wpm} từ/phút`}
          note={m.longPauses > 0 ? `${m.longPauses} chỗ ngừng từ 1,5 giây trở lên` : "Không có chỗ ngừng dài"}
        />
        <Metric
          label="Máy nghe rõ"
          value={m.clarity === null ? "chưa đo được" : pct(m.clarity)}
          note="Không phải điểm phát âm: micro và tiếng ồn cũng ảnh hưởng."
        />
        {keywords && keywords.length > 0 && (
          <Metric
            label="Từ gợi ý đã dùng"
            value={`${keywordsUsed?.length ?? 0}/${keywords.length}`}
            note={keywordsUsed?.length ? <span lang="en">{keywordsUsed.join(", ")}</span> : undefined}
          />
        )}
        {reason && reason !== "not_required" && (
          <Metric
            label="Nêu lý do"
            value={reason === "yes" ? "Có từ nối lý do" : "Chưa có"}
            ok={reason === "yes"}
            note={reason === "no" ? "Câu hỏi này cần lý do. Thử thêm “because…” hoặc “so…”." : undefined}
          />
        )}
      </dl>
    </section>
  );
}

const NOT_ENOUGH = "Chưa đủ thông tin để nhận xét phần này.";

export function AssessPanel({ a, mock }: { a: VerifiedAssessment; mock?: boolean }) {
  return (
    <section className="sheet-up grid gap-3 rounded-[2rem] bg-brand-soft px-5 py-5 sm:px-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <MessageSquareText className="size-5 text-brand" aria-hidden />
        AI nhận xét
      </h3>
      <p className="text-sm text-muted">AI đọc chữ ghi lời nên không chấm phát âm. Mỗi phần nhận xét riêng, không có điểm tổng.</p>
      {mock && <p className="w-fit rounded-full bg-warn-soft px-3 py-1 text-sm font-bold text-warn">Dữ liệu mô phỏng, không phải nhận xét thật</p>}
      <dl className="grid divide-y divide-brand/15">
        <Row
          label="Đúng câu hỏi"
          value={a.relevance.status === "assessed" ? (a.relevance.on_topic ? "Có" : "Chưa đúng ý câu hỏi") : NOT_ENOUGH}
          detail={a.relevance.comment_vi || undefined}
        />
        <Row
          label="Ngữ pháp"
          value={a.grammar.status === "assessed" ? (a.grammar.issues.length === 0 ? "Không thấy lỗi" : `${a.grammar.issues.length} chỗ cần sửa`) : NOT_ENOUGH}
          detail={
            a.grammar.issues.length > 0 ? (
              <ul className="grid gap-2 pt-1">
                {a.grammar.issues.map((i, k) => (
                  <li key={k} className="grid gap-0.5">
                    <span>
                      <s lang="en">{i.quote}</s> → <strong lang="en" className="text-ink">{i.fix}</strong>
                    </span>
                    <span>
                      {i.explanation_vi} <span className="font-semibold">({ERROR_TAGS[i.tag as ErrorTag]})</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : undefined
          }
        />
        <Row label="Từ vựng" value={a.vocabulary.status === "assessed" ? a.vocabulary.comment_vi : NOT_ENOUGH} />
        <Row
          label="Đầy đủ ý"
          value={a.completeness.status === "assessed" && a.completeness.level ? LEVEL[a.completeness.level] : NOT_ENOUGH}
          detail={a.completeness.missing_vi || undefined}
        />
        {a.improved_sentence && <Row label="Câu gợi ý" value={<span lang="en">{a.improved_sentence}</span>} detail="Giữ ý của em, sửa cho tự nhiên hơn. Không cần nói y hệt." />}
      </dl>
    </section>
  );
}

// ---- Báo cáo module -----------------------------------------------------------------------------------------------

function ratio(k: KnowledgeResult | null) {
  return k ? `${k.correct}/${k.total} câu` : "chưa làm";
}

function speakRows(s: SpeakSummary | null) {
  if (!s) return null;
  return {
    think: secs(s.medianThinkMs),
    words: s.meanWords === null ? "–" : String(s.meanWords).replace(".", ","),
    reason: s.reason.needed ? `${s.reason.given}/${s.reason.needed} câu cần lý do` : "–",
    developed: s.completeness.assessed ? `${s.completeness.developed + s.completeness.adequate}/${s.completeness.assessed} câu` : "AI chưa nhận xét",
    grammar: s.grammar.assessed ? `${s.grammar.issues} lỗi / ${s.grammar.assessed} câu` : "AI chưa nhận xét",
    clarity: s.meanClarity === null ? "–" : pct(s.meanClarity),
  };
}

/** Bảng so sánh hai lần đo theo từng tiêu chí. Chỉ hiện khi đã có lần đầu. */
function Compare({ caption, a, b, aLabel, bLabel }: { caption: string; a: SpeakSummary | null; b: SpeakSummary | null; aLabel: string; bLabel: string }) {
  const ra = speakRows(a);
  const rb = speakRows(b);
  if (!ra) return null;
  const rows: [string, keyof NonNullable<typeof ra>][] = [
    ["Thời gian bắt đầu nói (trung vị)", "think"],
    ["Số từ mỗi câu (trung bình)", "words"],
    ["Có nêu lý do", "reason"],
    ["Ý rõ ràng hoặc đầy đủ (AI)", "developed"],
    ["Lỗi ngữ pháp (AI, đã kiểm chứng)", "grammar"],
    ["Máy nghe rõ", "clarity"],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-left text-sm">
        <caption className="pb-2 text-left font-bold">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-muted">
            <th className="w-[44%] py-2 pr-3 font-semibold">Tiêu chí</th>
            <th className="py-2 pr-3 font-semibold">{aLabel}</th>
            <th className="py-2 font-semibold">{bLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(([label, k]) => (
            <tr key={k}>
              <td className="py-2 pr-3">{label}</td>
              <td className="py-2 pr-3 font-semibold tabular-nums">{ra[k]}</td>
              <td className="py-2 font-semibold tabular-nums">{rb ? rb[k] : "chưa làm"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportView({ r }: { r: ModuleReport }) {
  const k = r.knowledge;
  const any = k.entry || r.speaking.entry;
  if (!any)
    return <p className="rounded-2xl bg-sunken px-5 py-4 text-muted">Chưa có kết quả. Làm bài ngày 1 (bài đầu module) để có mốc so sánh.</p>;
  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <BookCheck className="size-5" aria-hidden />
          Kiến thức
        </h3>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
          {(
            [
              ["Đầu module", k.entry],
              ["Ngày 3", k.check1],
              ["Ngày 7", k.check2],
              ["Cuối module", k.final],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="grid gap-0.5 bg-surface px-4 py-3">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="font-semibold tabular-nums">{ratio(v)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted">Bài đầu và cuối module cùng cấu trúc nhưng khác câu hỏi.</p>
      </section>
      <CheckpointList items={r.checkpoints} />
      <section className="grid gap-2">
        <Compare caption="Nói độc lập, không gợi ý: đầu module và cuối module" a={r.speaking.entry} b={r.speaking.final} aLabel="Ngày 1" bLabel="Ngày 13" />
        <p className="text-sm text-muted">Hai bộ câu hỏi khác nhau nhưng cùng dạng và độ khó, để thấy em tự nói được hơn chứ không chỉ nhớ câu cũ.</p>
      </section>
      {r.transfer.practiced && (
        <section className="grid gap-2">
          <Compare caption="Câu đã luyện và câu hoàn toàn mới" a={r.transfer.practiced} b={r.transfer.fresh} aLabel="Câu đã luyện (ngày 6–10)" bLabel="Câu mới (ngày 13)" />
          <p className="text-sm text-muted">Nếu câu mới kém hơn hẳn câu đã luyện, có thể em đang nhớ câu trả lời hơn là tự vận dụng.</p>
        </section>
      )}
      {r.delayed.pairs.length > 0 && (
        <section className="grid gap-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <History className="size-5" aria-hidden />
            Câu hỏi nhắc lại sau một tuần
          </h3>
          <Compare caption="Cùng câu hỏi: lần luyện có gợi ý và lần hỏi lại không gợi ý" a={r.delayed.before} b={r.delayed.after} aLabel="Lần luyện (ngày 4–8)" bLabel="Hỏi lại (ngày 13)" />
          <p className="text-sm text-muted">Hỏi lại không gợi ý mà vẫn nói được là em đã nhớ và tự vận dụng, không chỉ làm được khi có gợi ý.</p>
        </section>
      )}
      {r.roleplays.length > 0 && (
        <section className="grid gap-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <UsersRound className="size-5" aria-hidden />
            Micro-Roleplay
          </h3>
          <ul className="divide-y divide-line border-y border-line">
            {r.roleplays.map((x) => (
              <li key={x.ref} className="flex justify-between gap-3 py-2.5">
                <span>{x.titleVi}</span>
                <span className="font-semibold tabular-nums">
                  Đạt {x.met}/{x.total} yêu cầu
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const CHECK: Record<Checkpoint["status"], { label: string; icon: React.ReactNode; tone: string }> = {
  met: { label: "Đạt", icon: <CircleCheck className="size-5 shrink-0" aria-hidden />, tone: "bg-brand-soft text-brand-strong" },
  not_met: { label: "Chưa đạt", icon: <CircleDashed className="size-5 shrink-0" aria-hidden />, tone: "bg-warn-soft text-warn" },
  pending: { label: "Chưa làm", icon: <CircleMinus className="size-5 shrink-0" aria-hidden />, tone: "bg-sunken text-muted" },
};

/** Kiểm tra cuối từng giai đoạn: Đạt / Chưa đạt / Chưa làm, kèm số liệu và quy tắc "đạt" (luôn có chữ, không chỉ màu). */
export function CheckpointList({ items }: { items: Checkpoint[] }) {
  return (
    <section className="grid gap-2">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <Flag className="size-5" aria-hidden />
        Kiểm tra cuối từng giai đoạn
      </h3>
      <ul className="grid gap-2">
        {items.map((c) => (
          <li key={c.phase} className="grid gap-1 rounded-2xl border-2 border-line px-4 py-3">
            <p className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">
                Giai đoạn {c.phase} · ngày {c.day}: {c.titleVi}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold ${CHECK[c.status].tone}`}>
                {CHECK[c.status].icon}
                {CHECK[c.status].label}
              </span>
            </p>
            <p>{c.detailVi}</p>
            <p className="text-sm text-muted">Cách tính đạt: {c.ruleVi}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">Làm xong bài chưa có nghĩa là đã đạt. “Đạt” chỉ tính từ các câu kiểm tra không gợi ý.</p>
    </section>
  );
}
