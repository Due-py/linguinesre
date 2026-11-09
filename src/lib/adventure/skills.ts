/**
 * TIẾN TRÌNH HỌC: sáu kỹ năng nói, tính từ số đo thật của nhiều lượt làm (module_attempts). KHÔNG đọc XP, cấp, thành tích:
 * làm xong nhiệm vụ không tự làm kỹ năng tăng. Mỗi kỹ năng cần đủ số lượt ở ít nhất 2 bài khác nhau mới xếp mức; chưa đủ thì
 * ghi "chưa đủ dữ liệu". Không hiện phần trăm "trình độ": chỉ mức theo quy tắc ghi rõ, kèm số đo thật làm bằng chứng.
 * Các ngưỡng là mốc tham khảo do nhóm đặt cho học sinh lớp 8 (không phải chuẩn quốc tế), đặt ở một chỗ để dễ xem, dễ sửa.
 * File thuần để test.
 */
import { SKILLS, type GameKey, type SkillKey } from "./world";

export type SkillAttempt = {
  moduleId: string;
  lessonId?: string;
  step?: number;
  day: number;
  kind: string;
  turn: number;
  attemptNo: number;
  area: string | null;
  correct: boolean | null;
  hintLevel: number;
  thinkMs: number | null;
  measures: {
    words?: number;
    wpm?: number | null;
    longPauses?: number;
    clarity?: number | null;
    unclear?: boolean;
    pron?: { words?: { level?: string }[] };
  } | null;
  check: { keywordsUsed?: string[]; reason?: string; test?: boolean; skipped?: boolean } | null;
  errorTags: string[];
  at: string;
};

export type Band = "none" | "emerging" | "developing" | "secure";
export const BAND_VI: Record<Band, string> = { none: "Chưa đủ dữ liệu", emerging: "Đang bắt đầu", developing: "Đang tiến bộ", secure: "Khá vững" };

export type SkillResult = { skill: SkillKey; band: Band; evidence: string[]; activities: number; lessons: number; ruleVi: string };

/** Ngưỡng của từng kỹ năng (mốc tham khảo). */
export const SKILL_RULES = {
  minLessons: 2,
  vocabulary: { min: 8, developing: 0.6, secure: 0.8 },
  grammar: { min: 6, developing: 0.6, secure: 0.8 },
  fluency: { min: 5, wpmDeveloping: 60, wpmSecure: 90, pausesEmerging: 2, pausesSecure: 1 },
  pronunciation: { min: 5, developing: 0.6, secure: 0.8, clarityDeveloping: 0.7, claritySecure: 0.85 },
  speed: { min: 5, recent: 8, secureMs: 3000, developingMs: 6000 },
  completeness: { min: 5, wordsDeveloping: 8, wordsSecure: 15 },
} as const;

const median = (xs: number[]) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const lessonsOf = (xs: SkillAttempt[]) => new Set(xs.map((a) => `${a.moduleId}:${a.day}`)).size;
const secs = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} giây`;
const first = (a: SkillAttempt) => a.attemptNo === 1 && !a.check?.skipped;
const spoken = (a: SkillAttempt) => !!a.measures && a.measures.unclear !== true && typeof a.measures.words === "number" && a.measures.words > 0;

function rated(skill: SkillKey, xs: SkillAttempt[], min: number, rule: string, decide: () => { band: Exclude<Band, "none">; evidence: string[] }): SkillResult {
  const lessons = lessonsOf(xs);
  if (xs.length < min || lessons < SKILL_RULES.minLessons)
    return { skill, band: "none", evidence: [`Có ${xs.length} lượt ở ${lessons} bài; cần ít nhất ${min} lượt ở ${SKILL_RULES.minLessons} bài.`], activities: xs.length, lessons, ruleVi: rule };
  const d = decide();
  return { skill, band: d.band, evidence: d.evidence, activities: xs.length, lessons, ruleVi: rule };
}

const ratioBand = (r: number, t: { developing: number; secure: number }): Exclude<Band, "none"> => (r >= t.secure ? "secure" : r >= t.developing ? "developing" : "emerging");

export function skillResults(attempts: SkillAttempt[]): SkillResult[] {
  const R = SKILL_RULES;

  // Từ vựng: câu hỏi từ vựng, nhớ lại từ, dùng từ trong câu (lần đầu mỗi mục).
  const vocab = attempts.filter((a) => first(a) && a.correct !== null && a.turn === 0 && ((a.kind === "quiz" && a.area === "vocab") || a.kind === "recall_word" || a.kind === "use_word"));
  const vocabRes = rated("vocabulary", vocab, R.vocabulary.min, `Tỷ lệ đúng lần đầu: từ ${R.vocabulary.secure * 10}/10 là khá vững, từ ${R.vocabulary.developing * 10}/10 là đang tiến bộ.`, () => {
    const ok = vocab.filter((a) => a.correct).length;
    return { band: ratioBand(ok / vocab.length, R.vocabulary), evidence: [`Đúng ${ok}/${vocab.length} lần nhớ hoặc dùng từ của bài (lần đầu).`] };
  });

  // Ngữ pháp: câu hỏi ngữ pháp và xếp câu (lần đầu); lỗi ngữ pháp AI ghi nhận chỉ làm bằng chứng thêm.
  const gram = attempts.filter((a) => first(a) && a.correct !== null && ((a.kind === "quiz" && a.area === "grammar") || a.kind === "arrange"));
  const gramRes = rated("grammar", gram, R.grammar.min, `Tỷ lệ đúng lần đầu ở câu ngữ pháp và xếp câu: từ ${R.grammar.secure * 10}/10 là khá vững, từ ${R.grammar.developing * 10}/10 là đang tiến bộ.`, () => {
    const ok = gram.filter((a) => a.correct).length;
    const tagged = attempts.filter((a) => (a.kind === "speak" || a.kind === "roleplay") && a.errorTags.length > 0).length;
    const ev = [`Đúng ${ok}/${gram.length} câu ngữ pháp và xếp câu (lần đầu).`];
    if (tagged > 0) ev.push(`Có ${tagged} lượt tự nói được ghi lỗi ngữ pháp.`);
    return { band: ratioBand(ok / gram.length, R.grammar), evidence: ev };
  });

  // Trôi chảy: tốc độ nói và chỗ ngừng dài khi tự nói (câu hỏi, roleplay, mở rộng câu).
  const flu = attempts.filter((a) => ["speak", "roleplay", "expand"].includes(a.kind) && spoken(a) && typeof a.measures?.wpm === "number");
  const fluRes = rated(
    "fluency",
    flu,
    R.fluency.min,
    `Trung vị số từ mỗi phút và số chỗ ngừng từ 1,5 giây: từ ${R.fluency.wpmSecure} từ/phút và dưới ${R.fluency.pausesSecure} chỗ ngừng mỗi câu là khá vững; dưới ${R.fluency.wpmDeveloping} từ/phút hoặc từ ${R.fluency.pausesEmerging} chỗ ngừng là đang bắt đầu.`,
    () => {
      const wpm = median(flu.map((a) => a.measures!.wpm!))!;
      const pauses = flu.reduce((s, a) => s + (a.measures!.longPauses ?? 0), 0) / flu.length;
      const band: Exclude<Band, "none"> =
        wpm < R.fluency.wpmDeveloping || pauses >= R.fluency.pausesEmerging ? "emerging" : wpm >= R.fluency.wpmSecure && pauses < R.fluency.pausesSecure ? "secure" : "developing";
      return { band, evidence: [`Nói khoảng ${Math.round(wpm)} từ mỗi phút (trung vị ${flu.length} lượt).`, `Trung bình ${pauses.toFixed(1).replace(".", ",")} chỗ ngừng dài mỗi lượt.`] };
    },
  );

  // Phát âm: máy chấm phát âm từng từ nếu có; không có thì độ rõ máy nghe (ước lượng, ghi rõ).
  const pron = attempts.filter((a) => (a.measures?.pron?.words?.length ?? 0) > 0);
  const clar = attempts.filter((a) => spoken(a) && typeof a.measures?.clarity === "number");
  const pronRes =
    pron.length >= R.pronunciation.min
      ? rated("pronunciation", pron, R.pronunciation.min, `Máy chấm phát âm (so với giọng Mỹ): tỷ lệ từ ở mức "Tốt" từ ${R.pronunciation.secure * 10}/10 là khá vững, từ ${R.pronunciation.developing * 10}/10 là đang tiến bộ.`, () => {
          const ws = pron.flatMap((a) => a.measures!.pron!.words!);
          const good = ws.filter((w) => w.level === "good").length;
          return { band: ratioBand(good / ws.length, R.pronunciation), evidence: [`Máy chấm ${good}/${ws.length} từ ở mức "Tốt" (${pron.length} lượt đọc).`, "Máy đo, có thể chấm nhầm với giọng trẻ em."] };
        })
      : rated("pronunciation", clar, R.pronunciation.min, `Chưa có máy chấm phát âm: dùng tỷ lệ từ máy nghe chắc chắn (ước lượng, không phải điểm phát âm). Từ ${R.pronunciation.claritySecure * 10}/10 là khá vững.`, () => {
          const c = median(clar.map((a) => a.measures!.clarity!))!;
          const band: Exclude<Band, "none"> = c >= R.pronunciation.claritySecure ? "secure" : c >= R.pronunciation.clarityDeveloping ? "developing" : "emerging";
          return { band, evidence: [`Máy nghe chắc khoảng ${Math.round(c * 10)}/10 số từ (trung vị ${clar.length} lượt).`, "Micro và tiếng ồn cũng làm số này thấp."] };
        });

  // Phản xạ: thời gian bắt đầu nói ở lượt đầu tự trả lời câu hỏi; xét các lượt gần đây.
  const speed = attempts.filter((a) => (a.kind === "speak" || a.kind === "roleplay") && a.turn === 0 && first(a) && spoken(a) && a.thinkMs !== null).sort((a, b) => a.at.localeCompare(b.at));
  const speedRes = rated("speed", speed, R.speed.min, `Trung vị thời gian bắt đầu nói ở ${R.speed.recent} câu gần nhất: đến ${R.speed.secureMs / 1000} giây là khá vững, đến ${R.speed.developingMs / 1000} giây là đang tiến bộ.`, () => {
    const recent = speed.slice(-R.speed.recent);
    const m = median(recent.map((a) => a.thinkMs!))!;
    const ev = [`Bắt đầu nói sau ${secs(m)} (trung vị ${recent.length} câu gần nhất).`];
    if (speed.length >= R.speed.recent + 3) ev.push(`Những câu đầu tiên: ${secs(median(speed.slice(0, R.speed.recent).map((a) => a.thinkMs!))!)}.`);
    return { band: m <= R.speed.secureMs ? "secure" : m <= R.speed.developingMs ? "developing" : "emerging", evidence: ev };
  });

  // Trả lời đủ ý: số từ và có nêu lý do khi câu hỏi cần (lượt đầu tự trả lời).
  const comp = attempts.filter((a) => a.kind === "speak" && a.turn === 0 && first(a) && spoken(a));
  const compRes = rated("completeness", comp, R.completeness.min, `Trung vị số từ mỗi câu trả lời: từ ${R.completeness.wordsSecure} từ là khá vững, từ ${R.completeness.wordsDeveloping} từ là đang tiến bộ; câu cần lý do mà ít nêu lý do thì chưa xếp "khá vững".`, () => {
    const w = median(comp.map((a) => a.measures!.words!))!;
    const need = comp.filter((a) => a.check?.reason === "yes" || a.check?.reason === "no");
    const gave = need.filter((a) => a.check?.reason === "yes").length;
    let band: Exclude<Band, "none"> = w >= R.completeness.wordsSecure ? "secure" : w >= R.completeness.wordsDeveloping ? "developing" : "emerging";
    if (band === "secure" && need.length >= 3 && gave / need.length < 0.5) band = "developing";
    const ev = [`Trả lời khoảng ${Math.round(w)} từ mỗi câu (trung vị ${comp.length} câu).`];
    if (need.length > 0) ev.push(`Nêu lý do ở ${gave}/${need.length} câu cần lý do.`);
    return { band, evidence: ev };
  });

  const all = { vocabulary: vocabRes, grammar: gramRes, fluency: fluRes, pronunciation: pronRes, speed: speedRes, completeness: compRes };
  return SKILLS.map((k) => all[k]);
}

// ---- Gợi ý theo kỹ năng ----------------------------------------------------------------------------------------------

export type Recommendation = {
  skill: SkillKey | null;
  reasonVi: string;
  action: { kind: "game"; game: GameKey } | { kind: "practice" } | { kind: "knowledge" } | { kind: "quest" };
};

const FOR_SKILL: Record<SkillKey, Recommendation["action"][]> = {
  vocabulary: [{ kind: "game", game: "vocab_match" }, { kind: "knowledge" }],
  grammar: [{ kind: "game", game: "grammar_fix" }, { kind: "game", game: "sentence_builder" }],
  completeness: [{ kind: "game", game: "sentence_builder" }, { kind: "practice" }],
  speed: [{ kind: "game", game: "quick_think" }, { kind: "practice" }],
  fluency: [{ kind: "practice" }, { kind: "game", game: "conversation_choice" }],
  pronunciation: [{ kind: "knowledge" }, { kind: "practice" }],
};
const WHY: Record<SkillKey, string> = {
  vocabulary: "Em hay quên hoặc chưa dùng được từ của bài.",
  grammar: "Câu ngữ pháp và xếp câu còn sai nhiều.",
  completeness: "Câu trả lời của em còn ngắn hoặc thiếu lý do.",
  speed: "Em cần nhiều thời gian trước khi bắt đầu nói.",
  fluency: "Em còn nói chậm hoặc ngừng lâu giữa câu.",
  pronunciation: "Máy chưa nghe rõ nhiều từ em nói.",
};

/**
 * Gợi ý hoạt động tiếp theo từ kỹ năng yếu nhất ĐÃ ĐỦ DỮ LIỆU (mức "đang bắt đầu" trước, rồi "đang tiến bộ").
 * Mini-game chỉ gợi ý khi đã mở trên bản đồ. Chưa đủ dữ liệu thì gợi ý làm tiếp nhiệm vụ để có số đo.
 */
export function recommend(skills: SkillResult[], gamesOpen: GameKey[]): Recommendation[] {
  const order: Band[] = ["emerging", "developing"];
  const out: Recommendation[] = [];
  for (const band of order)
    for (const s of skills.filter((x) => x.band === band)) {
      const action = FOR_SKILL[s.skill].find((a) => a.kind !== "game" || gamesOpen.includes(a.game));
      if (action) out.push({ skill: s.skill, reasonVi: WHY[s.skill], action });
    }
  if (out.length === 0) out.push({ skill: null, reasonVi: "Chưa đủ số đo để biết em cần luyện gì nhất. Làm tiếp nhiệm vụ trên bản đồ nhé.", action: { kind: "quest" } });
  return out.slice(0, 3);
}

// ---- Thử thách trong ngày -------------------------------------------------------------------------------------------

export type DailyChallenge = { date: string; action: { kind: "game"; game: GameKey } | { kind: "quest" }; reasonVi: string };

/**
 * Một thử thách mỗi ngày, cố định trong ngày: chọn từ số đo TRƯỚC hôm nay (nên làm xong việc hôm nay không đổi đề).
 * Nghỉ một ngày không mất gì, không có chuỗi ngày.
 */
export function dailyChallenge(date: string, attemptsBeforeToday: SkillAttempt[], gamesOpen: GameKey[]): DailyChallenge {
  const rec = recommend(skillResults(attemptsBeforeToday), gamesOpen).find((r) => r.action.kind === "game");
  if (rec && rec.action.kind === "game") return { date, action: rec.action, reasonVi: rec.reasonVi };
  if (gamesOpen.length > 0) {
    // Không có kỹ năng yếu rõ: xoay vòng các mini-game đã mở theo ngày, để mỗi ngày một trò khác.
    const n = date.split("-").reduce((s, x) => s + Number(x), 0);
    return { date, action: { kind: "game", game: gamesOpen[n % gamesOpen.length] }, reasonVi: "Ôn nhẹ nội dung của Unit bằng một trò chơi ngắn." };
  }
  return { date, action: { kind: "quest" }, reasonVi: "Hoàn thành một nhiệm vụ trên bản đồ hôm nay." };
}
