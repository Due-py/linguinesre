-- LINGUA-REFLEX 0010: Learning Module 14 ngày (Kho kiến thức, lộ trình 5 giai đoạn, bài kiểm tra đầu/cuối module).
-- Chạy SAU 0009. Không đổi bảng nào của phần nghiên cứu (chế độ A/B, bài kiểm tra).
--
-- Nguyên tắc:
--  * Nội dung module nằm trong content/modules/grade-<khối>/unit-<số>.json (có kiểm tra cấu trúc), nạp bằng
--    scripts/seed-modules.mjs (khóa máy chủ). Quy trình: nháp (draft) → nhóm đã kiểm tra (team_checked, học sinh thấy kèm
--    nhãn "chưa được thầy cô duyệt") → thầy cô đã duyệt (teacher_approved). Đổi nội dung thì về lại team_checked.
--  * Học sinh chỉ ĐỌC được bài học và lượt làm của mình; giáo viên đọc của học sinh trong lớp mình.
--  * Mọi thao tác ghi đi qua máy chủ (khóa máy chủ) SAU khi kiểm tra người đang đăng nhập, để học sinh không tự sửa
--    số đo, đáp án đúng/sai hay nhận xét. Người tham gia nghiên cứu bị máy chủ chặn cho tới study_over (như 0009).
--  * File ghi âm nằm trong kho "recordings", thư mục id học sinh (đã có policy đọc/xóa ở 0003; xóa tài khoản xóa theo).

create table public.modules (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null unique references public.units (id) on delete cascade,
  grade         smallint not null check (grade between 6 and 12),
  unit_no       smallint not null check (unit_no between 1 and 20),
  title         text not null,
  content       jsonb not null,
  content_hash  text not null,
  status        text not null default 'draft' check (status in ('draft', 'team_checked', 'teacher_approved')),
  reviewed_by   text,
  reviewed_at   timestamptz,
  updated_at    timestamptz not null default now(),
  unique (grade, unit_no),
  constraint approved_has_reviewer check (status <> 'teacher_approved' or (reviewed_by is not null and reviewed_at is not null))
);

create table public.module_lessons (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  module_id     uuid not null references public.modules (id) on delete cascade,
  day           smallint not null check (day between 1 and 14),
  plan          jsonb not null,                                   -- các bước của bài (máy chủ lập, cố định)
  status        text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  unique (student_id, module_id, day)
);
create index module_lessons_student_idx on public.module_lessons (student_id, module_id);

create table public.module_attempts (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid not null references public.module_lessons (id) on delete cascade,
  student_id      uuid not null references public.profiles (id) on delete cascade,
  module_id       uuid not null references public.modules (id) on delete cascade,
  day             smallint not null check (day between 1 and 14),
  step            smallint not null check (step >= 0),
  turn            smallint not null default 0 check (turn between 0 and 10),  -- lượt con: bước mở rộng câu, lượt roleplay
  attempt_no      smallint not null default 1 check (attempt_no between 1 and 3),
  kind            text not null check (kind in ('learn_word', 'recall_word', 'known_words', 'card', 'say', 'quiz', 'use_word', 'arrange', 'expand', 'speak', 'roleplay', 'report')),
  item_ref        text not null check (char_length(item_ref) <= 40),
  quiz_set        text check (quiz_set in ('entry', 'check1', 'check2', 'final', 'practice', 'review')),
  area            text check (area in ('vocab', 'grammar', 'pron', 'expression')),
  answer          text check (char_length(answer) <= 4000),        -- chữ ghi lời, hoặc phương án đã chọn
  correct         boolean,
  hint_level      smallint not null default 0 check (hint_level between 0 and 4),
  think_ms        integer check (think_ms between 0 and 120000),
  time_target_ms  integer check (time_target_ms between 500 and 20000),
  in_target       boolean,
  measures        jsonb,                                            -- đo trực tiếp (measure.ts)
  check_result    jsonb,                                            -- kiểm tra bằng quy tắc (từ khóa, lý do, yêu cầu roleplay)
  ai              jsonb,                                            -- AI nhận xét đã kiểm chứng
  ai_status       text not null default 'none' check (ai_status in ('none', 'ok', 'failed')),
  error_tags      text[] not null default '{}',
  reply           text check (char_length(reply) <= 600),           -- lời AI đáp trong roleplay
  reply_source    text check (reply_source in ('ai', 'fallback')),
  audio_path      text,
  created_at      timestamptz not null default now(),
  unique (lesson_id, step, turn, attempt_no)
);
create index module_attempts_student_idx on public.module_attempts (student_id, module_id, created_at);
create index module_attempts_lesson_idx on public.module_attempts (lesson_id, step);

alter table public.modules enable row level security;
alter table public.module_lessons enable row level security;
alter table public.module_attempts enable row level security;

-- Học sinh chỉ thấy module đã qua bước kiểm tra của nhóm; giáo viên xem được cả bản nháp để duyệt.
create policy "read modules" on public.modules
  for select to authenticated using (status <> 'draft' or public.is_teacher());

create policy "read own or class lessons" on public.module_lessons
  for select to authenticated using (student_id = (select auth.uid()) or public.teaches_student(student_id));

create policy "read own or class attempts" on public.module_attempts
  for select to authenticated using (student_id = (select auth.uid()) or public.teaches_student(student_id));
-- Không có policy ghi: chỉ máy chủ (khóa service_role) ghi, sau khi đã kiểm tra quyền.

-- Bộ đếm lượt gọi AI: thêm loại "roleplay" (AI đóng vai) để giới hạn riêng.
alter table public.api_usage drop constraint if exists api_usage_kind_check;
alter table public.api_usage add constraint api_usage_kind_check check (kind in ('transcribe', 'feedback', 'tts', 'roleplay'));
