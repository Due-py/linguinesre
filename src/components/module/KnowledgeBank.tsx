import { Check } from "lucide-react";
import type { ModuleContent } from "@/lib/module/schema";
import ListenButton from "./Listen";
import { SourceBadge } from "./Panels";
import { moduleAudio } from "./audio";

const KIND_VI = { sound: "Âm", word_stress: "Trọng âm từ", sentence_stress: "Trọng âm câu", ending: "Âm cuối", intonation: "Ngữ điệu" } as const;

/**
 * Kho kiến thức của một Unit (Knowledge Layer): từ vựng có phiên âm, ngữ pháp có câu đúng/sai, phát âm, cụm câu.
 * Mỗi mục ghi nguồn (trang SGK hoặc nhóm soạn). listen = false: chỉ đọc (giáo viên xem, không phát giọng).
 */
export default function KnowledgeBank({ moduleId, m, listen = true }: { moduleId: string; m: ModuleContent; listen?: boolean }) {
  return (
    <div className="grid gap-10">
      <section aria-labelledby="kb-vocab" className="grid gap-3">
        <h2 id="kb-vocab" className="text-2xl font-extrabold tracking-tight">
          Từ vựng ({m.vocab.length})
        </h2>
        <ul className="divide-y divide-line border-y border-line">
          {m.vocab.map((v) => (
            <li key={v.id} className="grid gap-1 py-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span lang="en" className="text-xl font-extrabold">
                  {v.en}
                </span>
                <span className="text-muted">
                  {v.ipa} ({v.pos})
                </span>
                <SourceBadge src={v.src} />
                {v.ipaFrom === "dictionary" && <span className="text-xs text-muted">phiên âm tra từ điển</span>}
              </div>
              <p className="font-semibold">{v.vi}</p>
              <p lang="en">{v.example}</p>
              {v.collocations.length > 0 && (
                <p className="text-sm text-muted">
                  Hay đi với: <span lang="en">{v.collocations.join(" · ")}</span>
                  {v.synonyms.length > 0 && (
                    <>
                      {" "}
                      · Gần nghĩa: <span lang="en">{v.synonyms.join(", ")}</span>
                    </>
                  )}
                  {v.antonyms.length > 0 && (
                    <>
                      {" "}
                      · Trái nghĩa: <span lang="en">{v.antonyms.join(", ")}</span>
                    </>
                  )}
                </p>
              )}
              {listen && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <ListenButton url={moduleAudio(moduleId, v.id)} text={v.en}>
                    Nghe từ
                  </ListenButton>
                  <ListenButton url={moduleAudio(moduleId, `${v.id}.ex`)} text={v.example}>
                    Nghe câu ví dụ
                  </ListenButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="kb-grammar" className="grid gap-4">
        <h2 id="kb-grammar" className="text-2xl font-extrabold tracking-tight">
          Ngữ pháp
        </h2>
        {m.grammar.map((g) => (
          <article key={g.id} className="grid gap-3 rounded-2xl border border-line bg-surface px-5 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-extrabold">{g.nameVi}</h3>
              <SourceBadge src={g.src} />
            </div>
            <p lang="en" className="text-sm text-muted">
              {g.name}
            </p>
            <p>{g.explainVi}</p>
            <p className="rounded-xl bg-sunken px-4 py-3 font-semibold">{g.formula}</p>
            <ul className="grid gap-1">
              {g.examples.map((e) => (
                <li key={e} lang="en" className="flex gap-2">
                  <Check className="mt-1 size-4 shrink-0 text-brand-strong" aria-hidden />
                  {e}
                </li>
              ))}
            </ul>
            {g.wrong.map((w) => (
              <div key={w.sentence} className="grid gap-0.5 rounded-xl bg-sunken px-4 py-3">
                <p lang="en">
                  <s>{w.sentence}</s> → <strong>{w.fix}</strong>
                </p>
                <p className="text-sm text-muted">{w.whyVi}</p>
              </div>
            ))}
          </article>
        ))}
      </section>

      <section aria-labelledby="kb-pron" className="grid gap-3">
        <h2 id="kb-pron" className="text-2xl font-extrabold tracking-tight">
          Phát âm
        </h2>
        <ul className="divide-y divide-line border-y border-line">
          {m.pronunciation.map((p) => (
            <li key={p.id} className="grid gap-1.5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold">
                  {KIND_VI[p.kind]}: {p.focus}
                </span>
                <SourceBadge src={p.src} />
              </div>
              <p>{p.tipVi}</p>
              <p lang="en" className="font-semibold">
                {p.words.join(" · ")}
              </p>
              {p.sentence && (
                <p lang="en" className="text-muted">
                  {p.sentence}
                </p>
              )}
              {listen && (
                <div className="flex flex-wrap gap-2">
                  <ListenButton url={moduleAudio(moduleId, `${p.id}.w`)} text={p.words.join(", ")}>
                    Nghe các từ
                  </ListenButton>
                  {p.sentence && (
                    <ListenButton url={moduleAudio(moduleId, `${p.id}.s`)} text={p.sentence}>
                      Nghe câu
                    </ListenButton>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="kb-expr" className="grid gap-3">
        <h2 id="kb-expr" className="text-2xl font-extrabold tracking-tight">
          Cụm câu hay dùng
        </h2>
        <ul className="divide-y divide-line border-y border-line">
          {m.expressions.map((e) => (
            <li key={e.id} className="grid gap-1 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span lang="en" className="text-lg font-bold">
                  {e.en}
                </span>
                <SourceBadge src={e.src} />
              </div>
              <p className="text-muted">
                {e.vi}. {e.useVi}
              </p>
              <p lang="en">{e.example}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
