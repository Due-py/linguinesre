"use client";

import { useState } from "react";
import { AudioLines, CircleAlert, CircleCheck, CircleDashed, CircleMinus } from "lucide-react";
import { weakest, type PronLevel, type PronResult, type PronWord } from "@/lib/speaking/pron";
import ListenButton from "./Listen";

export type PronState =
  | { status: "loading" }
  | { status: "ok"; result: PronResult; mock: boolean }
  | { status: "not_configured" }
  | { status: "no_speech" }
  | { status: "waking" }
  | { status: "error" };

/** Nguồn mã nguồn mở kém chính xác hơn nên dùng lời nhẹ hơn ("nên luyện lại", "chưa nghe thấy") thay vì khẳng định sai. */
const LABEL: Record<PronResult["source"], Record<PronLevel, string>> = {
  azure: { good: "Tốt", close: "Gần đúng", work: "Cần luyện", missing: "Chưa nói" },
  open: { good: "Tốt", close: "Gần đúng", work: "Nên luyện lại", missing: "Chưa nghe thấy" },
};
const levelOf = (score: number): PronLevel => (score < 60 ? "work" : score < 80 ? "close" : "good");
const STYLE: Record<PronLevel, { chip: string; text: string; Icon: typeof CircleCheck }> = {
  good: { chip: "bg-success-soft text-success-strong", text: "text-success-strong", Icon: CircleCheck },
  close: { chip: "bg-warn-soft text-warn", text: "text-warn", Icon: CircleDashed },
  work: { chip: "bg-danger-soft text-danger", text: "text-danger", Icon: CircleAlert },
  missing: { chip: "bg-sunken text-muted", text: "text-muted", Icon: CircleMinus },
};
const ORDER: Record<PronLevel, number> = { missing: 0, work: 1, close: 2, good: 3 };

/**
 * Phát âm từng từ kiểu ELSA: mỗi từ có mức (chữ + biểu tượng + màu, không chỉ màu); bấm một từ để xem âm nào nghe thành âm
 * nào (và âm tiết nào, nếu nguồn có). Mặc định mở từ đáng chú ý nhất. Máy đo, không có điểm tổng.
 */
export default function PronPanel({ state, audioFor }: { state: PronState; audioFor: (w: string) => string | null }) {
  const [picked, setPicked] = useState<number | null>(null);

  if (state.status === "loading")
    return (
      <p role="status" className="flex items-center gap-2 rounded-2xl bg-sunken px-4 py-3 text-sm font-medium text-muted">
        <AudioLines className="size-4 motion-safe:animate-pulse" aria-hidden />
        Đang chấm phát âm từng âm… Em có thể bấm Tiếp tục, không cần chờ.
      </p>
    );
  if (state.status === "not_configured") return <p className="text-sm text-muted">Chấm phát âm từng âm chưa được bật trên web này.</p>;
  if (state.status === "waking") return <p className="text-sm text-muted">Máy chấm phát âm miễn phí đang khởi động (mất khoảng 1–2 phút sau khi nghỉ). Lần nói sau sẽ có kết quả.</p>;
  if (state.status === "no_speech") return <p className="text-sm text-muted">Máy chấm phát âm chưa nghe ra lời. Nói to, rõ hơn một chút rồi thử lại.</p>;
  if (state.status === "error") return <p className="text-sm text-muted">Chưa chấm được phát âm lần này. Bài vẫn được lưu bình thường.</p>;

  const { source, words } = state.result;
  const first = words.reduce((best, w, i) => (ORDER[w.level] < ORDER[words[best].level] ? i : best), 0);
  const index = picked ?? first;
  const w = words[index];
  const allGood = words.every((x) => x.level === "good");
  return (
    <section aria-labelledby="pron-title" className="sheet-up grid gap-4 rounded-3xl bg-surface px-5 py-5 shadow-card">
      <div className="grid gap-1">
        <h3 id="pron-title" className="flex items-center gap-2 text-lg font-semibold">
          <AudioLines className="size-5 text-brand" aria-hidden />
          Phát âm từng từ
        </h3>
        <p className="text-sm text-muted">
          {source === "open"
            ? "Máy đo bằng mô hình mã nguồn mở, so với giọng Mỹ. Máy có thể chấm nhầm, nhất là với giọng trẻ em và khi có tiếng ồn. Giọng khác giọng Mỹ không có nghĩa là sai."
            : "Máy đo (Azure) so với giọng Mỹ. Giọng khác giọng Mỹ không có nghĩa là sai."}{" "}
          Bấm một từ để xem chi tiết.
        </p>
        {state.mock && <p className="w-fit rounded-full bg-warn-soft px-3 py-1 text-sm font-bold text-warn">Dữ liệu mô phỏng, không phải chấm thật</p>}
      </div>
      <ul lang="en" className="flex flex-wrap gap-2" aria-label="Các từ em nói">
        {words.map((x, i) => {
          const s = STYLE[x.level];
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => setPicked(i)}
                aria-pressed={i === index}
                aria-label={`${x.word}: ${LABEL[source][x.level]}`}
                className={`press inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-lg font-semibold ${s.chip} ${i === index ? "ring-2 ring-current ring-offset-2" : ""}`}
              >
                <s.Icon className="size-4" aria-hidden />
                {x.word}
              </button>
            </li>
          );
        })}
      </ul>
      {allGood ? (
        <p className="font-medium text-success-strong">Máy không thấy âm nào cần sửa trong câu này.</p>
      ) : (
        w && <WordDetail w={w} source={source} audio={audioFor(w.word)} />
      )}
    </section>
  );
}

function WordDetail({ w, source, audio }: { w: PronWord; source: PronResult["source"]; audio: string | null }) {
  const weak = weakest(w);
  const s = STYLE[w.level];
  const showPhones = w.phonemes.length > 0 && w.level !== "good";
  return (
    <div className="grid gap-3 rounded-2xl bg-tint px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xl font-semibold">
          <span lang="en">{w.word}</span>{" "}
          <span className={`text-base font-medium ${s.text}`}>
            {LABEL[source][w.level]}
            {w.score !== null ? ` (${w.score}/100)` : ""}
          </span>
        </p>
        <ListenButton url={audio ?? ""} text={w.word}>
          Nghe mẫu
        </ListenButton>
      </div>
      {w.level === "missing" ? (
        <p>Máy không nghe thấy em nói từ này. Nghe mẫu rồi đọc lại cả câu nhé.</p>
      ) : (
        <>
          {w.syllables.length > 0 && (
            <Row title="Từng âm tiết">
              {w.syllables.map((x, i) => {
                const lv = levelOf(x.score);
                return (
                  <li key={i} className={`grid justify-items-center rounded-xl px-3 py-1.5 ${STYLE[lv].chip}`}>
                    <span className="font-mono text-lg font-semibold">/{x.text}/</span>
                    <span className="text-xs font-medium">
                      {LABEL[source][lv]} · {x.score}
                    </span>
                  </li>
                );
              })}
            </Row>
          )}
          {showPhones && (
            <Row title="Từng âm (máy nghe được)">
              {w.phonemes.map((p, i) => {
                const lv: PronLevel = p.heardAs === "" ? "missing" : p.score !== null ? levelOf(p.score) : p.conf >= 0.7 ? "work" : p.conf > 0 ? "close" : "good";
                return (
                  <li key={i} className={`grid justify-items-center rounded-xl px-2.5 py-1.5 ${STYLE[lv].chip}`}>
                    <span className="font-mono text-lg font-semibold">/{p.p}/</span>
                    <span className="text-xs font-medium">{p.heardAs === "" ? "thiếu" : p.heardAs ? `→ /${p.heardAs}/` : p.score !== null ? p.score : "đúng"}</span>
                  </li>
                );
              })}
            </Row>
          )}
          <p className="font-medium">
            {weak.syllable && (
              <>
                Âm tiết <span className="font-mono">/{weak.syllable.text}/</span> chưa chuẩn.{" "}
              </>
            )}
            {weak.phoneme ? (
              <>
                Âm <span className="font-mono">/{weak.phoneme.p}/</span>
                {weak.phoneme.heardAs === "" ? (
                  " máy chưa nghe thấy (có thể em nói lướt mất)"
                ) : weak.phoneme.heardAs ? (
                  <>
                    {" "}
                    nghe giống <span className="font-mono">/{weak.phoneme.heardAs}/</span>
                  </>
                ) : (
                  " chưa rõ"
                )}
                .{" "}
              </>
            ) : null}
            {weak.syllable || weak.phoneme ? "Nghe mẫu, chú ý phần này, rồi nói lại." : "Từ này ổn."}
          </p>
        </>
      )}
    </div>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <p className="text-sm font-medium text-muted">{title}</p>
      <ol className="flex flex-wrap items-center gap-1.5">{children}</ol>
    </div>
  );
}
