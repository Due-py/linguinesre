import type { PlannedStep } from "./plan";
import type { ModuleContent } from "./schema";

/** Lượt "bỏ qua" ghi ở lượt con số 10 (xem actions.ts). */
export const SKIP_TURN = 10;

/**
 * Một bước đã xong chưa, từ các lượt đã lưu của bước đó. Bỏ qua cũng tính là xong (để học sinh không có micro vẫn đi tiếp),
 * nhưng thầy cô và báo cáo vẫn thấy là "bỏ qua".
 */
export function stepDone(st: PlannedStep, turns: number[], m: ModuleContent): boolean {
  if (turns.includes(SKIP_TURN)) return true;
  if (turns.length === 0) return false;
  switch (st.t) {
    case "arrange":
      return turns.includes(1);
    case "expand": {
      const x = m.expand.find((e) => e.id === st.ref);
      return !!x && turns.includes(x.steps.length);
    }
    case "speak":
      return st.retry ? turns.includes(1) : true;
    case "roleplay": {
      const r = m.roleplays.find((e) => e.id === st.ref);
      return !!r && turns.includes(r.turns);
    }
    default:
      return true;
  }
}

/** Bước đầu tiên chưa xong (để học tiếp đúng chỗ); null nếu đã xong cả bài. */
export function firstOpenStep(steps: PlannedStep[], rows: { step: number; turn: number }[], m: ModuleContent): number | null {
  for (const st of steps) {
    const turns = rows.filter((r) => r.step === st.n).map((r) => r.turn);
    if (!stepDone(st, turns, m)) return st.n;
  }
  return null;
}
