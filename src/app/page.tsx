// Placeholder home page for Phase 0. The real intro page comes in Phase 1.
const levels = [
  { name: "Level 0", label: "Từ vựng", tile: "bg-level-0" },
  { name: "Level 1", label: "Câu khung", tile: "bg-level-1" },
  { name: "Level 2", label: "Mở rộng câu", tile: "bg-level-2" },
  { name: "Level 3", label: "Nói đoạn", tile: "bg-level-3" },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-16">
      <div className="flex flex-col gap-4">
        <span className="w-fit rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent-ink">
          Đang xây dựng
        </span>
        <h1 className="text-4xl font-extrabold leading-tight sm:text-6xl">
          LinguaReflex
        </h1>
        <p className="max-w-xl text-lg text-muted">
          Biến kiến thức trên giấy thành phản xạ trên môi.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {levels.map((level) => (
          <li key={level.name} className={`${level.tile} rounded-3xl p-5`}>
            <p className="text-sm font-semibold text-muted">{level.name}</p>
            <p className="mt-6 font-bold">{level.label}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
