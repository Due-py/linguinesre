import { redirect } from "next/navigation";

/** Luyện tự do đã bỏ (09/11): buổi cũ chỉ còn xem lại ở trang tổng kết (không làm tiếp). */
export default async function PracticeSessionGone({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(/^[0-9a-f-]{36}$/.test(id) ? `/student/sessions/${id}` : "/student/history");
}
