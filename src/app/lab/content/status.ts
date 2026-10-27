import type { Unit } from "@/content/schema";

export const STATUS_LABEL: Record<Unit["status"], string> = {
  draft: "Nháp",
  "team-reviewed": "Nhóm đã duyệt",
  "teacher-approved": "Cô đã duyệt",
};
