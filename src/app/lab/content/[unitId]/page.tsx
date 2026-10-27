import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { UNITS, findUnit } from "@/content/units";
import { STATUS_LABEL } from "../status";

export function generateStaticParams() {
  return UNITS.map((unit) => ({ unitId: unit.id }));
}

export default async function UnitReviewPage({ params }: PageProps<"/lab/content/[unitId]">) {
  const { unitId } = await params;
  const unit = findUnit(unitId);
  if (!unit) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-3">
        <Link href="/lab/content" className="text-sm font-semibold text-muted">
          ← Tất cả Unit
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent-ink">
            Lớp {unit.grade} · Unit {unit.unit}
          </span>
          <span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold">{STATUS_LABEL[unit.status]}</span>
        </div>
        <h1 className="text-3xl font-extrabold sm:text-5xl">{unit.title}</h1>
        <p className="text-lg text-muted">
          {unit.titleVi} · {unit.source.book}, trang {unit.source.pages[0]}–{unit.source.pages[1]}
          {unit.source.glossaryPage ? ` (Glossary trang ${unit.source.glossaryPage})` : ""}
        </p>
        <ul className="list-disc pl-5">
          {unit.objectivesVi.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </header>

      <Section title="Level 0 · Từ vựng" tile="bg-level-0" count={unit.vocabulary.length}>
        <Table head={["Từ", "Phiên âm", "Nghĩa", "Câu ví dụ", "Loại", "Trang"]}>
          {unit.vocabulary.map((v) => (
            <tr key={v.id} className="border-t border-line align-top">
              <td className="py-2 pr-3 font-bold">
                {v.text}
                <Say text={v.text} say={v.say} />
              </td>
              <td className="py-2 pr-3 text-muted">{v.ipa ?? "—"}</td>
              <td className="py-2 pr-3">{v.meaningVi}</td>
              <td className="py-2 pr-3">
                {v.example}
                <Say text={v.example} say={v.exampleSay} />
              </td>
              <td className="py-2 pr-3 text-muted">{KIND_LABEL[v.kind]}</td>
              <td className="py-2 pr-3 text-muted">{v.page}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title={`Level 0 · Phát âm ${unit.pronunciation.sounds.join(" và ")}`} tile="bg-level-0" count={unit.pronunciation.words.length}>
        <div className="grid gap-3 sm:grid-cols-2">
          {unit.pronunciation.sounds.map((sound) => (
            <div key={sound} className="rounded-2xl bg-surface p-4">
              <p className="text-2xl font-extrabold">{sound}</p>
              <p className="mt-2">
                {unit.pronunciation.words
                  .filter((w) => w.sound === sound)
                  .map((w) => w.text)
                  .join(", ")}
              </p>
            </div>
          ))}
        </div>
        <Page n={unit.pronunciation.page} />
      </Section>

      <Section title="Level 1 · Câu khung" tile="bg-level-1" count={unit.frames.length}>
        <Table head={["Khung câu", "Nghĩa", "Gợi ý điền", "Câu mẫu", "Trang"]}>
          {unit.frames.map((f) => (
            <tr key={f.id} className="border-t border-line align-top">
              <td className="py-2 pr-3 font-bold">{f.frame}</td>
              <td className="py-2 pr-3">{f.meaningVi}</td>
              <td className="py-2 pr-3 text-muted">{f.slotOptions.join(" · ")}</td>
              <td className="py-2 pr-3">
                {f.model}
                <Say text={f.model} say={f.modelSay} />
              </td>
              <td className="py-2 pr-3 text-muted">{f.page}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Level 2 · Mở rộng câu" tile="bg-level-2" count={unit.extensions.length}>
        <Table head={["Câu gốc", "Yêu cầu", "Câu mẫu", "Trang"]}>
          {unit.extensions.map((e) => (
            <tr key={e.id} className="border-t border-line align-top">
              <td className="py-2 pr-3 font-bold">{e.base}</td>
              <td className="py-2 pr-3">
                {e.promptVi} <span className="text-muted">({e.connector})</span>
              </td>
              <td className="py-2 pr-3">
                {e.model}
                <Say text={e.model} say={e.modelSay} />
              </td>
              <td className="py-2 pr-3 text-muted">{e.page}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Level 3 · Nói đoạn" tile="bg-level-3" count={unit.talks.length}>
        <div className="grid gap-4">
          {unit.talks.map((t) => (
            <article key={t.id} className="rounded-2xl bg-surface p-5">
              <p className="text-lg font-bold">{t.prompt}</p>
              <p className="text-muted">
                {t.promptVi} · khoảng {t.targetSeconds} giây · trang {t.page}
              </p>
              <ul className="mt-3 list-disc pl-5">
                {t.guide.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted">Mẫu câu: {t.usefulLanguage.join(" · ")}</p>
              <p className="mt-3 rounded-xl bg-background p-3">
                <b>Bài nói mẫu:</b> {t.model}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Speed Q&A" tile="bg-level-1" count={unit.speed.length}>
        <div className="grid gap-3">
          {unit.speed.map((s) => (
            <article key={s.id} className="rounded-2xl bg-surface p-4">
              <p className="font-bold">
                {s.question}
                <Say text={s.question} say={s.say} />
                <span className="ml-2 text-sm font-normal text-muted">
                  độ khó {s.difficulty} · trang {s.page}
                </span>
              </p>
              <p className="mt-2 text-sm">
                <b>Chấp nhận nếu có:</b>{" "}
                {s.keywords.map((group) => `[${group.join(" / ")}]`).join(" và ")}
              </p>
              <p className="text-sm">
                <b>Câu trả lời mẫu:</b> {s.samples.join(" · ")}
              </p>
              <ol className="mt-2 list-decimal pl-5 text-sm text-muted">
                <li>Hình: {s.rescue.image}</li>
                <li>Câu mở đầu: {s.rescue.starter}</li>
                <li>Hỏi dễ hơn: {s.rescue.simpler}</li>
                <li>Từ khóa tiếng Việt: {s.rescue.keywordsVi}</li>
              </ol>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Micro-Roleplay" tile="bg-level-2" count={unit.roleplays.length}>
        <div className="grid gap-4">
          {unit.roleplays.map((r) => (
            <article key={r.id} className="rounded-2xl bg-surface p-5">
              <p className="text-lg font-bold">
                {r.title} <span className="font-normal text-muted">({r.titleVi})</span>
              </p>
              <p>{r.goalVi}</p>
              {r.beyondBook && (
                <p className="mt-2 rounded-xl bg-level-0 p-3 text-sm">
                  <b>Ngoài sách:</b> {r.beyondBookNoteVi}
                </p>
              )}
              <p className="mt-2 text-sm text-muted">Mẫu câu: {r.usefulLanguage.join(" · ")}</p>
              <ol className="mt-3 grid gap-2">
                {r.turns.map((t) => (
                  <li key={t.id} className="rounded-xl bg-background p-3 text-sm">
                    <p>
                      <b>{r.partnerName}:</b> {t.partner}
                    </p>
                    <p className="text-muted">
                      Học sinh ({t.expect}): {t.samples.join(" / ")} · gợi ý: {t.starter}
                    </p>
                  </li>
                ))}
              </ol>
              <Page n={r.page} />
            </article>
          ))}
        </div>
      </Section>
    </main>
  );
}

const KIND_LABEL = {
  glossary: "Glossary",
  activity: "Hoạt động",
  expression: "Cụm diễn đạt",
  verb: "Động từ",
} as const;

function Section({ title, tile, count, children }: { title: string; tile: string; count: number; children: ReactNode }) {
  return (
    <section className={`${tile} flex flex-col gap-4 rounded-3xl p-5`}>
      <h2 className="text-2xl font-extrabold">
        {title} <span className="text-base font-semibold text-muted">({count})</span>
      </h2>
      {children}
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-surface p-3">
      <table className="w-full text-left text-sm">
        <thead className="text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="py-2 pr-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Shows how the voice will read a line when it differs from the text. */
function Say({ text, say }: { text: string; say?: string }) {
  if (!say || say === text) return null;
  return <span className="block text-xs font-normal text-muted">🔊 đọc là: “{say}”</span>;
}

function Page({ n }: { n: number }) {
  return <p className="text-sm text-muted">Nguồn: trang {n}</p>;
}
