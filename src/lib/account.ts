import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Xóa hẳn một tài khoản và mọi dữ liệu của nó.
 *  1. File ghi âm trong 3 kho: luyện tự do (thư mục id người dùng), bài kiểm tra và chế độ luyện (thư mục mã học sinh).
 *  2. Tài khoản đăng nhập. Mọi bảng đều nối tới hồ sơ bằng "on delete cascade" nên hồ sơ, lớp (của giáo viên), buổi luyện,
 *     câu trả lời, nhận xét AI, bài kiểm tra, lượt luyện, câu hỏi hằng tuần bị xóa theo.
 * Chỉ gọi SAU khi đã xác định đúng người đang đăng nhập yêu cầu xóa chính mình.
 */
export async function deleteAccount(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: part } = await admin.from("research_participants").select("code").eq("student_id", userId).maybeSingle();

  const targets: [bucket: string, root: string][] = [["recordings", userId]];
  if (part?.code) targets.push(["test-recordings", part.code], ["mode-recordings", part.code]);
  for (const [bucket, root] of targets) {
    if (!(await removeFolder(bucket, root))) return false;
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  return !error;
}

/** Xóa mọi file trong thư mục root (hai cấp: root/thư-mục-con/file và root/file). */
async function removeFolder(bucket: string, root: string): Promise<boolean> {
  const store = createAdminClient().storage.from(bucket);
  const { data: top, error } = await store.list(root, { limit: 1000 });
  if (error) return false;
  const paths: string[] = [];
  for (const entry of top ?? []) {
    if (entry.id) {
      paths.push(`${root}/${entry.name}`); // file nằm thẳng trong thư mục gốc
      continue;
    }
    for (let offset = 0; ; offset += 1000) {
      const { data: files } = await store.list(`${root}/${entry.name}`, { limit: 1000, offset });
      paths.push(...(files ?? []).map((f) => `${root}/${entry.name}/${f.name}`));
      if (!files || files.length < 1000) break;
    }
  }
  for (let i = 0; i < paths.length; i += 500) {
    const { error: rmErr } = await store.remove(paths.slice(i, i + 500));
    if (rmErr) return false;
  }
  return true;
}
