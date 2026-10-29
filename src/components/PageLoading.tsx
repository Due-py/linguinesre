import { LoaderCircle } from "lucide-react";

/** Trạng thái đang tải của khu vực đã đăng nhập: khung xám thay cho nội dung, có chữ cho trình đọc màn hình. */
export default function PageLoading() {
  return (
    <div role="status" className="mx-auto grid w-full max-w-5xl gap-6 px-4 pt-20 sm:px-6">
      <span className="inline-flex items-center gap-2 font-semibold text-muted">
        <LoaderCircle className="size-5 animate-spin" aria-hidden />
        Đang tải…
      </span>
      <div aria-hidden className="h-48 animate-pulse rounded-2xl bg-sunken" />
      <div aria-hidden className="grid gap-3">
        <div className="h-5 w-2/3 animate-pulse rounded bg-sunken" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-sunken" />
      </div>
    </div>
  );
}
