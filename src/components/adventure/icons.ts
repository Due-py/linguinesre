import { Blocks, Link2, MessageSquareQuote, SpellCheck, Timer, type LucideIcon } from "lucide-react";
import type { GameKey } from "@/lib/adventure/world";

/**
 * Biểu tượng của từng mini-game. Đặt ở file KHÔNG có "use client" để cả trang máy chủ lẫn thành phần trình duyệt dùng được
 * (giá trị xuất từ file "use client" sang trang máy chủ chỉ là tham chiếu, không dùng làm thành phần được).
 */
export const GAME_ICON: Record<GameKey, LucideIcon> = { vocab_match: Link2, sentence_builder: Blocks, grammar_fix: SpellCheck, quick_think: Timer, conversation_choice: MessageSquareQuote };
