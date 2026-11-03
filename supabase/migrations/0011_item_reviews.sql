-- 0011: Thầy cô duyệt TỪNG MỤC của Learning Module (từ, cấu trúc, âm, cụm câu, bài luyện, câu hỏi, tình huống).
-- Chạy sau 0010_modules.sql, trong SQL Editor của Supabase.
--
-- Mỗi dòng: một mục (item_ref dạng "vocab:v01") của một module, trạng thái approved / needs_fix, kèm mã băm nội dung lúc duyệt
-- (item_hash). Nhóm sửa nội dung sau khi duyệt thì mã băm hiện tại khác item_hash, giao diện tự ghi "cần duyệt lại".
-- Ai được đọc: như bảng modules (học sinh thấy nhãn "thầy cô đã duyệt"; giáo viên thấy cả module nháp).
-- Ghi: chỉ máy chủ (khóa service_role) sau khi đã kiểm tra là giáo viên. Không có policy ghi cho người dùng.

create table public.module_item_reviews (
  module_id   uuid not null references public.modules (id) on delete cascade,
  item_ref    text not null check (item_ref ~ '^[a-z]+:[a-z][0-9]{2}$'),
  item_hash   text not null check (item_hash ~ '^[0-9a-f]{8}$'),
  status      text not null check (status in ('approved', 'needs_fix')),
  note        text check (note is null or char_length(note) <= 500),
  reviewer    text not null check (char_length(reviewer) between 2 and 80),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz not null default now(),
  primary key (module_id, item_ref)
);

alter table public.module_item_reviews enable row level security;

create policy "read item reviews" on public.module_item_reviews
  for select to authenticated using (
    exists (select 1 from public.modules m where m.id = module_id and (m.status <> 'draft' or public.is_teacher()))
  );
