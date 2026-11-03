import { BookCheck, CircleCheck, CircleDashed, MessageSquareText, Ruler, UsersRound } from "lucide-react";
import type { SpeechMeasures } from "@/lib/module/measure";
import type { VerifiedAssessment } from "@/lib/module/assessCore";
import type { KnowledgeResult, ModuleReport, SpeakSummary } from "@/lib/module/report";
import { ERROR_TAGS, type ErrorTag } from "@/lib/module/schema";

/**
 * Khối hiển thị của module, dùng chung cho màn hình học (client) và trang tổng quan (server). Không dùng hook.
 * "Đo trực tiếp" (quy tắc) luôn tách khỏi "AI nhận xét". Không có điểm tổng.
 */

export const secs = (ms: number | null | undefined) => (ms === null || ms === undefined ? "chưa đo được" : `${(ms / 1000).toFixed(1).replace(".", ",")} giây`);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const LEVEL: Record<string, string> = { brief: "Ngắn, mới có một ý", adequate: "Có ý chính rõ ràng", developed: "Có ý chính kèm lý do hoặc chi tiết" };

export function SourceBadge({ src }: { src: { kind: "sgk" | "team"; page: number | null } }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted">
      {src.kind === "sgk" ? `SGK tr. ${src.page}` : "Nhóm soạn"}
    </span>
  );
}

function Row({ label, value, detail }: { label: string; value: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[12rem_1fr] sm:gap-3">
      <dt className="text-sm font-bold text-muted">{label}</dt>
      <dd className="grid gap-0.5">
        <span className="font-semibold">{value}</span>
        {detail && <span className="text-sm text-muted">{detail}</span>}
      </dd>
    </div>
  );
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
  return (
    <section className="grid gap-2 rounded-2xl border border-line bg-surface px-5 py-4">
      <h3 className="flex items-center gap-2 text-lg font-extrabold">
        <Ruler className="size-5" aria-hidden />
        Đo trực tiếp
      </h3>
      <p className="text-sm text-muted">Máy tính bằng quy tắc từ bản ghi, không do AI. Thời gian tính từ lúc đọc xong câu hỏi.</p>
      <dl className="grid divide-y divide-line">
        <Row
          label="Bắt đầu nói sau"
          value={
            targetMs ? (
              <span className="inline-flex items-center gap-1.5">
                {inTarget ? <CircleCheck className="size-4 text-brand-strong" aria-hidden /> : <CircleDashed className="size-4" aria-hidden />}
                {secs(m.thinkMs)} {inTarget === null ? "" : inTarget ? `(kịp mục tiêu ${secs(targetMs)})` : `(mục tiêu ${secs(targetMs)})`}
              </span>
            ) : (
              secs(m.thinkMs)
            )
          }
        />
        <Row label="Số từ" value={String(m.words)} />
        <Row
          label="Độ trôi chảy"
          value={m.wpm === null ? "chưa đủ lời để đo" : `${m.wpm} từ/phút`}
          detail={m.longPauses > 0 ? `${m.longPauses} chỗ ngừng từ 1,5 giây trở lên` : "Không có chỗ ngừng dài"}
        />
        <Row
          label="Máy nghe rõ"
          value={m.clarity === null ? "chưa đo được" : pct(m.clarity)}
          detail="Tỷ lệ từ máy nghe chắc chắn. Đây không phải điểm phát âm: micro và tiếng ồn cũng ảnh hưởng."
        />
        {keywords && keywords.length > 0 && (
          <Row label="Từ gợi ý đã dùng" value={`${keywordsUsed?.length ?? 0}/${keywords.length}`} detail={keywordsUsed?.length ? <span lang="en">{keywordsUsed.join(", ")}</span> : undefined} />
        )}
        {reason && reason !== "not_required" && (
          <Row
            label="Nêu lý do"
            value={reason === "yes" ? "Có từ nối lý do" : "Chưa có"}
            detail={reason === "no" ? "Câu hỏi này cần lý do. Thử thêm “because…” hoặc “so…”." : undefined}
          />
        )}
      </dl>
    </section>
  );
}

const NOT_ENOUGH = "Chưa đủ thông tin để nhận xét phần này.";

export function AssessPanel({ a, mock }: { a: VerifiedAssessment; mock?: boolean }) {
  return (
    <section className="grid gap-3 rounded-2xl bg-brand-soft px-5 py-4">
      <h3 className="flex items-center gap-2 text-lg font-extrabold">
        <MessageSquareText className="size-5" aria-hidden />
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
        <h3 className="flex items-center gap-2 text-lg font-extrabold">
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
              <dd className="font-extrabold tabular-nums">{ratio(v)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted">Bài đầu và cuối module cùng cấu trúc nhưng khác câu hỏi.</p>
      </section>
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
      {r.roleplays.length > 0 && (
        <section className="grid gap-2">
          <h3 className="flex items-center gap-2 text-lg font-extrabold">
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
