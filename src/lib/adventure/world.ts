/**
 * Thế giới phiêu lưu của một Learning Module (một Unit = một vùng đất). Mỗi khu vực là một giai đoạn có thật của module
 * (plan.ts PHASES), mỗi nhiệm vụ là đúng một bài học ngày có thật, mỗi mini-game dùng nội dung của chính Unit đó.
 * Chỉ là cách trình bày và kể chuyện: không thêm bài học giả, không đổi thứ tự mở bài (vẫn theo nextOpenDay).
 * File thuần, không import máy chủ, để test và dùng ở cả trình duyệt.
 */
import { DAY_INFO, PHASES } from "../module/plan";

export const GAMES = ["vocab_match", "sentence_builder", "grammar_fix", "quick_think", "conversation_choice"] as const;
export type GameKey = (typeof GAMES)[number];

/** Sáu kỹ năng nói được theo dõi (tiến trình học, tách khỏi XP). */
export const SKILLS = ["vocabulary", "grammar", "fluency", "pronunciation", "speed", "completeness"] as const;
export type SkillKey = (typeof SKILLS)[number];
export const SKILL_VI: Record<SkillKey, string> = {
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
  fluency: "Trôi chảy",
  pronunciation: "Phát âm",
  speed: "Phản xạ",
  completeness: "Trả lời đủ ý",
};

export type RegionTheme = "valley" | "forest" | "hills" | "harbor" | "summit";
export type Region = { phase: number; theme: RegionTheme; nameVi: string; nameEn: string; introVi: string };

export const REGIONS: Region[] = [
  { phase: 1, theme: "valley", nameVi: "Thung lũng Khởi Hành", nameEn: "Finding Your Voice", introVi: "Làng nhỏ nơi em gom đủ từ, cấu trúc và âm để bắt đầu nói." },
  { phase: 2, theme: "forest", nameVi: "Rừng Câu Chữ", nameEn: "Building Better Answers", introVi: "Trong rừng, từng từ ghép thành câu, từng câu dài thêm ý." },
  { phase: 3, theme: "hills", nameVi: "Đồi Gió Phản Xạ", nameEn: "Thinking Faster", introVi: "Gió đổi hướng liên tục: câu hỏi đổi cách hỏi, em trả lời nhanh hơn." },
  { phase: 4, theme: "harbor", nameVi: "Bến Cảng Trò Chuyện", nameEn: "Real Conversations", introVi: "Bến cảng đông người: trò chuyện thật với Linguine, không kịch bản." },
  { phase: 5, theme: "summit", nameVi: "Đỉnh Thử Thách", nameEn: "The Summit", introVi: "Leo lên đỉnh: tự nói không gợi ý, nhìn lại chặng đường từ ngày đầu." },
];
export const regionOf = (phase: number) => REGIONS[phase - 1];

/** Ngày cuối mỗi giai đoạn có bài kiểm tra: nút "thử thách" trên bản đồ. */
export const CHALLENGE_DAYS = [3, 7, 10, 12, 14] as const;
export const isChallenge = (day: number) => (CHALLENGE_DAYS as readonly number[]).includes(day);

export type QuestIcon = "book" | "repeat" | "puzzle" | "blocks" | "grow" | "signpost" | "flag" | "shuffle" | "zap" | "bolt" | "chat" | "chats" | "mic" | "mountain";

type QuestStory = { storyVi: string; skills: SkillKey[]; icon: QuestIcon };
const STORY: Record<number, QuestStory> = {
  1: { storyVi: "Em đặt chân tới cổng làng. Bác trưởng làng muốn nghe em tự nói vài câu để biết em đang ở đâu, rồi trao cho em những từ mới đầu tiên.", skills: ["speed", "completeness", "vocabulary", "pronunciation"], icon: "book" },
  2: { storyVi: "Sáng hôm sau, người bán hàng ở chợ làng hỏi lại những từ hôm qua. Ai nhớ được sẽ học thêm từ và cụm từ đi kèm.", skills: ["vocabulary", "pronunciation"], icon: "repeat" },
  3: { storyVi: "Thư viện làng giữ các cấu trúc câu và cụm câu hay. Học xong, em làm bài kiểm tra ở cổng để rời thung lũng.", skills: ["grammar", "vocabulary"], icon: "flag" },
  4: { storyVi: "Bìa rừng có những mảnh câu rơi rải rác. Em dùng từ của bài nói thành câu và xếp lại các mảnh cho đúng.", skills: ["grammar", "vocabulary"], icon: "blocks" },
  5: { storyVi: "Cây trong rừng lớn dần như câu nói của em: thêm khi nào, ở đâu, vì sao để câu dài và rõ hơn.", skills: ["completeness", "grammar"], icon: "grow" },
  6: { storyVi: "Người gác rừng hỏi em những câu hỏi của Unit. Gợi ý có sẵn từng bước, dùng gợi ý không bị trừ gì.", skills: ["completeness", "fluency"], icon: "signpost" },
  7: { storyVi: "Cuối rừng là cây cầu gỗ. Muốn qua, em ôn lại và trả lời vài câu không cần gợi ý.", skills: ["completeness", "grammar", "speed"], icon: "flag" },
  8: { storyVi: "Trên đồi, gió thổi đổi hướng câu hỏi: cùng một ý mà hỏi theo nhiều cách. Em nghe ra ý chính rồi trả lời.", skills: ["speed", "completeness"], icon: "shuffle" },
  9: { storyVi: "Cối xay gió quay nhanh dần. Em trả lời Speed Q&A trong mục tiêu thời gian của riêng em.", skills: ["speed", "fluency"], icon: "zap" },
  10: { storyVi: "Đỉnh đồi lộng gió: nói nhanh hơn, nghe nhận xét, sửa lỗi rồi nói lại. Cuối bài là thử thách rời đồi.", skills: ["speed", "grammar", "fluency"], icon: "flag" },
  11: { storyVi: "Thuyền cập bến. Linguine đóng vai người dân ở cảng, em trò chuyện trong những tình huống quen thuộc.", skills: ["fluency", "completeness"], icon: "chat" },
  12: { storyVi: "Ở chợ cá, người ta có ý kiến khác em. Em giữ cuộc trò chuyện, giải thích và bảo vệ ý của mình.", skills: ["fluency", "completeness", "speed"], icon: "chats" },
  13: { storyVi: "Chân núi có những câu hỏi em chưa gặp, và vài câu đã luyện từ tuần trước. Em tự nói, không gợi ý.", skills: ["speed", "completeness", "fluency"], icon: "mic" },
  14: { storyVi: "Đỉnh núi! Bài kiểm tra cuối và một cuộc trò chuyện mới. Rồi em nhìn lại mình đã đi được bao xa từ ngày đầu.", skills: ["speed", "completeness", "grammar", "vocabulary"], icon: "mountain" },
};

export type GameInfo = { key: GameKey; titleVi: string; titleEn: string; storyVi: string; howVi: string; minutes: number; skills: SkillKey[]; phase: number };
export const GAME_INFO: Record<GameKey, GameInfo> = {
  vocab_match: {
    key: "vocab_match",
    titleVi: "Ghép từ ở chợ làng",
    titleEn: "Vocabulary Match",
    storyVi: "Các sạp hàng bị lẫn bảng tên. Ghép mỗi từ tiếng Anh với nghĩa của nó.",
    howVi: "Chọn một từ, rồi chọn nghĩa đúng. 6 từ của Unit.",
    minutes: 2,
    skills: ["vocabulary"],
    phase: 1,
  },
  sentence_builder: {
    key: "sentence_builder",
    titleVi: "Cầu câu chữ",
    titleEn: "Sentence Builder",
    storyVi: "Mỗi tấm ván cầu là một mảnh câu. Xếp đúng thứ tự để bắc cầu qua suối.",
    howVi: "Bấm các mảnh theo đúng thứ tự. 3 câu.",
    minutes: 2,
    skills: ["grammar", "completeness"],
    phase: 2,
  },
  grammar_fix: {
    key: "grammar_fix",
    titleVi: "Tìm câu lạc lối",
    titleEn: "Grammar Fix",
    storyVi: "Vài câu bị lạc trong rừng vì sai ngữ pháp. Câu nào đúng, câu nào sai?",
    howVi: "Đọc câu, chọn Đúng hoặc Sai, rồi xem câu sửa. 6 câu.",
    minutes: 2,
    skills: ["grammar"],
    phase: 2,
  },
  quick_think: {
    key: "quick_think",
    titleVi: "Gió đổi chiều",
    titleEn: "Quick Think",
    storyVi: "Gió đổi cách hỏi liên tục. Nghe ra câu hỏi đang hỏi ý gì, càng nhanh càng tốt.",
    howVi: "Đọc câu hỏi tiếng Anh, chọn ý nó hỏi trong 15 giây. 5 câu. Đồng hồ chỉ để chơi, không tính vào kết quả học.",
    minutes: 2,
    skills: ["speed"],
    phase: 3,
  },
  conversation_choice: {
    key: "conversation_choice",
    titleVi: "Lời đáp ở bến cảng",
    titleEn: "Conversation Choice",
    storyVi: "Người ở cảng cần một câu nói hợp tình huống. Chọn cách nói phù hợp nhất.",
    howVi: "Đọc tình huống, chọn câu tiếng Anh hợp nhất. 5 câu.",
    minutes: 2,
    skills: ["vocabulary", "fluency"],
    phase: 4,
  },
};

/** Độ khó hiển thị theo giai đoạn (nói thật: giai đoạn sau cần tự nói nhiều hơn, ít gợi ý hơn). */
export const DIFFICULTY_VI = ["", "Nhẹ nhàng", "Vừa sức", "Thử sức", "Thử sức", "Thử thách"] as const;
export const difficultyOf = (phase: number) => (phase <= 1 ? 1 : phase === 2 ? 2 : 3);

export type QuestNode = {
  kind: "quest";
  id: string; // "d<ngày>"
  day: number;
  phase: number;
  titleVi: string;
  goalVi: string;
  storyVi: string;
  minutes: number;
  skills: SkillKey[];
  icon: QuestIcon;
  challenge: boolean;
};
export type GameNode = { kind: "game"; id: string; game: GameKey; phase: number; after: number; titleVi: string; storyVi: string; minutes: number; skills: SkillKey[] };
export type WorldNode = QuestNode | GameNode;

/** Thứ tự các nút trên đường đi: 14 nhiệm vụ, mỗi mini-game đứng sau nhiệm vụ đã dạy nội dung của nó. */
export const GAME_AFTER: Record<GameKey, number> = { vocab_match: 2, sentence_builder: 4, grammar_fix: 6, quick_think: 8, conversation_choice: 11 };

export function worldNodes(): WorldNode[] {
  const out: WorldNode[] = [];
  for (const p of PHASES) {
    for (const day of p.days) {
      const s = STORY[day];
      out.push({
        kind: "quest",
        id: `d${day}`,
        day,
        phase: p.no,
        titleVi: DAY_INFO[day].titleVi,
        goalVi: DAY_INFO[day].goalVi,
        storyVi: s.storyVi,
        minutes: DAY_INFO[day].minutes,
        skills: s.skills,
        icon: s.icon,
        challenge: isChallenge(day),
      });
      for (const g of GAMES)
        if (GAME_AFTER[g] === day) {
          const info = GAME_INFO[g];
          out.push({ kind: "game", id: `g-${g}`, game: g, phase: p.no, after: day, titleVi: info.titleVi, storyVi: info.storyVi, minutes: info.minutes, skills: info.skills });
        }
    }
  }
  return out;
}

export type NodeState = "done" | "current" | "available" | "locked";

/**
 * Trạng thái từng nút từ dữ liệu thật: nhiệm vụ đã xong / đang mở (đúng ngày tiếp theo theo nextOpenDay) / khóa.
 * Mini-game mở khi nhiệm vụ đứng trước nó đã xong; "done" khi đã chơi xong ít nhất một lượt.
 */
export function nodeStates(nodes: WorldNode[], completedDays: number[], nextDay: number | null, gamesFinished: GameKey[]): Map<string, NodeState> {
  const out = new Map<string, NodeState>();
  for (const n of nodes) {
    if (n.kind === "quest") out.set(n.id, completedDays.includes(n.day) ? "done" : n.day === nextDay ? "current" : "locked");
    else out.set(n.id, gamesFinished.includes(n.game) ? "done" : completedDays.includes(n.after) ? "available" : "locked");
  }
  return out;
}
