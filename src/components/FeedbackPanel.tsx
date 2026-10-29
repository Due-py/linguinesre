import { useId } from "react";
import { ArrowRight, CircleAlert, CircleCheck, CircleDashed, LoaderCircle, MessageSquareText, RotateCcw, Ruler } from "lucide-react";
import type { FeedbackView } from "@/app/(student)/student/practice/actions";

const secs = (ms: number | null) => (ms === null ? "chưa đo được" : `${(ms / 1000).toFixed(1).replace(".", ",")} giây`);
const LEVEL: Record<string, string> = {
  brief: "Ngắn, mới có một ý",
  adequate: "Có ý chính rõ ràng",
  developed: "Có ý chính kèm lý do hoặc chi tiết",
};
const NOT_ENOUGH = "Chưa đủ thông tin để nhận xét phần này.";

type Level = 2 | 3;

/**
 * Phản hồi của một lần trả lời: "Đo trực tiếp" (quy tắc) tách hẳn khỏi "AI nhận xét". Không có điểm tổng.
 * onRetry bỏ trống thì không có nút lấy lại nhận xét (giáo viên chỉ xem). level: cấp tiêu đề của hai khối.
 */
export default function FeedbackPanel({
  view,
  loading,
  error,
  onRetry,
  level = 2,
}: {
  view: FeedbackView | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  level?: Level;
}) {
  if (loading) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-2xl bg-sunken px-5 py-4 font-bold">
        <LoaderCircle className="size-5 animate-spin" aria-hidden />
        Đang viết nhận xét cho câu trả lời…
      </p>
    );
  }
  if (!view) {
    return (
      <div className="grid gap-3">
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-warn-soft px-4 py-3 font-semibold text-warn">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {error ?? "Chưa lấy được nhận xét."}
        </p>
        {onRetry && <RetryButton onClick={onRetry} />}
      </div>
    );
  }
  return (
    <div className="grid gap-5">
      <Measured view={view} level={level} />
      <AiReview view={view} onRetry={onRetry} level={level} />
    </div>
  );
}

function Measured({ view, level }: { view: FeedbackView; level: Level }) {
  const m = view.measures;
  const id = useId();
  const H = level === 2 ? "h2" : "h3";
  return (
    <section aria-labelledby={id} className="grid gap-3 rounded-3xl border border-line bg-surface px-5 py-5">
      <div className="grid gap-0.5">
        <H id={id} className="flex items-center gap-2 text-xl font-extrabold">
          <Ruler className="size-5" aria-hidden />
          Đo trực tiếp
        </H>
        <p className="text-sm text-muted">Máy tính bằng quy tắc từ bài nói, không do AI. Thời gian là ước lượng của trình duyệt.</p>
      </div>
      <dl className="grid divide-y divide-line">
        <Row label="Thời gian suy nghĩ" value={secs(m.thinkMs)} />
        <Row label="Thời lượng nói" value={secs(m.speakMs)} />
        <Row label="Số từ" value={String(m.words)} />
        <Row
          label="Từ gợi ý đã dùng"
          value={m.keywords.total === 0 ? "không có từ gợi ý" : `${m.keywords.used.length}/${m.keywords.total}`}
          detail={m.keywords.used.length > 0 ? <span lang="en">{m.keywords.used.join(", ")}</span> : undefined}
        />
        {m.reason !== "not_required" && (
          <Row
            label="Nêu lý do"
            value={
              m.reason === "yes" ? (
                <span className="inline-flex items-center gap-1.5">
                  <CircleCheck className="size-4 text-brand-strong" aria-hidden />
                  Có từ nối lý do
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <CircleDashed className="size-4" aria-hidden />
                  Chưa có
                </span>
              )
            }
            detail={m.reason === "no" ? "Câu hỏi này cần lý do. Lần sau thử thêm “because…” hoặc “so…”." : undefined}
          />
        )}
      </dl>
    </section>
  );
}

function AiReview({ view, onRetry, level }: { view: FeedbackView; onRetry?: () => void; level: Level }) {
  const ai = view.ai;
  const id = useId();
  const H = level === 2 ? "h2" : "h3";
  const sub = level === 2 ? "h3" : "h4";
  return (
    <section aria-labelledby={id} className="grid gap-4 rounded-3xl bg-brand-soft px-5 py-5">
      <div className="grid gap-1">
        <H id={id} className="flex items-center gap-2 text-xl font-extrabold">
          <MessageSquareText className="size-5" aria-hidden />
          AI nhận xét
        </H>
        <p className="text-sm text-muted">AI đọc chữ ghi lời rồi nhận xét, có thể chưa đúng. Phát âm chưa được đánh giá.</p>
        {view.mock && (
          <p className="w-fit rounded-full bg-warn-soft px-3 py-1 text-sm font-bold text-warn">Dữ liệu mô phỏng, không phải nhận xét thật</p>
        )}
      </div>

      {!ai ? (
        <div className="grid gap-3">
          <p className="flex items-start gap-2 font-semibold">
            <CircleDashed className="mt-0.5 size-5 shrink-0" aria-hidden />
            Chưa có nhận xét cho câu này. Câu trả lời vẫn được lưu bình thường.
          </p>
          {onRetry && <RetryButton onClick={onRetry} />}
        </div>
      ) : (
        <div className="grid gap-4">
          <Part as={sub} title="Nội dung" status={ai.content.status}>
            <p>{ai.content.comment_vi}</p>
          </Part>
          <Part as={sub} title="Ngữ pháp" status={ai.grammar.status}>
            {ai.grammar.issues.length === 0 ? (
              <p>Không thấy lỗi ngữ pháp nào cần sửa.</p>
            ) : (
              <ul className="grid gap-3">
                {ai.grammar.issues.map((i, k) => (
                  <li key={k} className="grid gap-1 rounded-2xl bg-surface px-4 py-3">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-semibold" lang="en">
                      <span className="line-through decoration-2">{i.quote}</span>
                      <ArrowRight className="size-4 shrink-0" aria-label="sửa thành" />
                      <span className="font-extrabold text-brand-strong">{i.fix}</span>
                    </p>
                    {i.explanation_vi && <p className="text-muted">{i.explanation_vi}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Part>
          <Part as={sub} title="Từ vựng và cách diễn đạt" status={ai.vocabulary.status}>
            <p>{ai.vocabulary.comment_vi}</p>
          </Part>
          <Part as={sub} title="Mức hoàn chỉnh" status={ai.completeness.status}>
            {ai.completeness.level && <p className="font-bold">{LEVEL[ai.completeness.level]}</p>}
            {ai.completeness.comment_vi && <p>{ai.completeness.comment_vi}</p>}
          </Part>
          {ai.improved_sentence && (
            <div className="grid gap-1 rounded-2xl bg-surface px-4 py-3">
              <p className="text-sm font-bold text-brand-strong">Thử nói như thế này</p>
              <p lang="en" className="text-lg font-semibold">
                {ai.improved_sentence}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Part({
  as: H,
  title,
  status,
  children,
}: {
  as: "h3" | "h4";
  title: string;
  status: "assessed" | "not_enough_info";
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <H className="font-extrabold">{title}</H>
      {status === "not_enough_info" ? <p className="text-muted">{NOT_ENOUGH}</p> : children}
    </div>
  );
}

function Row({ label, value, detail }: { label: string; value: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="shrink-0 text-muted">{label}</dt>
        <dd className="text-right font-extrabold tabular-nums">{value}</dd>
      </div>
      {detail && <dd className="text-sm text-muted">{detail}</dd>}
    </div>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border-2 border-ink/80 bg-surface px-4 font-bold hover:bg-sunken"
    >
      <RotateCcw className="size-4" aria-hidden />
      Thử lấy nhận xét lại
    </button>
  );
}

/** So sánh hai lần trả lời cùng một câu. Chỉ hiện khi cả hai lần đều có phản hồi. Không kết luận "tốt hơn/kém hơn". */
export function AttemptCompare({ before, after }: { before: FeedbackView; after: FeedbackView }) {
  const kw = (v: FeedbackView) => `${v.measures.keywords.used.length}/${v.measures.keywords.total}`;
  const issues = (v: FeedbackView) => (v.ai?.grammar.status === "assessed" ? String(v.ai.grammar.issues.length) : "chưa đủ thông tin");
  const rows: [string, string, string][] = [
    ["Số từ", String(before.measures.words), String(after.measures.words)],
    ["Từ gợi ý đã dùng", kw(before), kw(after)],
    ...(after.measures.reason !== "not_required"
      ? [["Có từ nối lý do", before.measures.reason === "yes" ? "có" : "chưa", after.measures.reason === "yes" ? "có" : "chưa"] as [string, string, string]]
      : []),
    ["Lỗi ngữ pháp AI chỉ ra", issues(before), issues(after)],
  ];
  return (
    <section aria-labelledby="compare-title" className="grid gap-3 rounded-3xl border border-line bg-surface px-5 py-5">
      <h2 id="compare-title" className="text-xl font-extrabold">
        So sánh lần {before.attemptNo} và lần {after.attemptNo}
      </h2>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-line text-sm text-muted">
            <th scope="col" className="py-2 font-bold">
              <span className="sr-only">Mục</span>
            </th>
            <th scope="col" className="py-2 text-right font-bold">
              Lần {before.attemptNo}
            </th>
            <th scope="col" className="py-2 text-right font-bold">
              Lần {after.attemptNo}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(([label, a, b]) => (
            <tr key={label}>
              <th scope="row" className="py-2.5 pr-2 font-normal text-muted">
                {label}
              </th>
              <td className="py-2.5 text-right font-extrabold tabular-nums">{a}</td>
              <td className="py-2.5 text-right font-extrabold tabular-nums">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-muted">Để bạn tự xem mình đã thay đổi gì giữa hai lần, không phải điểm.</p>
    </section>
  );
}
