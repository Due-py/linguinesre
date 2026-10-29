-- LINGUA-REFLEX 0002: nội dung luyện tập (Unit, từ vựng, khung câu, câu hỏi). Chạy SAU 0001_core.sql.
--
-- Nguyên tắc:
--  * Nội dung gốc nằm trong content/grade-<khối>/unit-<số>.json (có kiểm tra cấu trúc), nạp vào đây bằng
--    scripts/seed-content.mjs (khóa service_role). Không có policy ghi cho người dùng.
--  * Học sinh chỉ đọc Unit đã duyệt (status = 'approved'). Giáo viên đọc được cả bản nháp để xem trước.
--  * Nạp lại một Unit có nội dung đã đổi thì Unit tự về 'draft' và phải duyệt lại (xem content_hash).

create table public.units (
  id           uuid primary key default gen_random_uuid(),
  grade        smallint not null check (grade between 6 and 9),
  unit_no      smallint not null check (unit_no between 1 and 20),
  title        text not null,
  title_vi     text not null,
  topic        text not null,
  source       text not null,
  status       text not null default 'draft' check (status in ('draft', 'approved')),
  content_hash text not null,
  reviewed_by  text,
  reviewed_at  timestamptz,
  updated_at   timestamptz not null default now(),
  unique (grade, unit_no),
  constraint approved_has_reviewer check (status <> 'approved' or (reviewed_by is not null and reviewed_at is not null))
);

create table public.vocab (
  unit_id uuid not null references public.units (id) on delete cascade,
  key     text not null,                      -- v01...
  en      text not null,
  vi      text not null,
  example text not null,
  primary key (unit_id, key)
);

create table public.frames (
  unit_id      uuid not null references public.units (id) on delete cascade,
  key          text not null,                 -- f01...
  text         text not null,
  vi           text not null,
  grammar_note text not null,
  examples     text[] not null,
  primary key (unit_id, key)
);

create table public.questions (
  id                uuid primary key default gen_random_uuid(),
  unit_id           uuid not null references public.units (id) on delete cascade,
  key               text not null,            -- q01...
  text              text not null,
  difficulty        smallint not null check (difficulty between 1 and 3),
  kind              text not null check (kind in ('personal', 'reason', 'opinion', 'situation')),
  keywords          text[] not null,
  frame_key         text not null,
  hint_direction_vi text not null,
  example_answer    text not null,
  expects_reason    boolean not null,
  active            boolean not null default true,  -- false khi câu bị bỏ khỏi file JSON (giữ lại cho lịch sử)
  unique (unit_id, key)
);
create index questions_unit_idx on public.questions (unit_id);

alter table public.units enable row level security;
alter table public.vocab enable row level security;
alter table public.frames enable row level security;
alter table public.questions enable row level security;

create function public.is_teacher()
returns boolean language sql security definer stable set search_path = ''
as $$ select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'teacher' and onboarded_at is not null); $$;
revoke all on function public.is_teacher() from public, anon;
grant execute on function public.is_teacher() to authenticated;

-- Đọc được Unit nếu đã duyệt, hoặc người đọc là giáo viên (xem trước bản nháp).
create function public.can_read_unit(uid uuid)
returns boolean language sql security definer stable set search_path = ''
as $$ select exists (select 1 from public.units where id = uid and (status = 'approved' or public.is_teacher())); $$;
revoke all on function public.can_read_unit(uuid) from public, anon;
grant execute on function public.can_read_unit(uuid) to authenticated;

create policy "read units" on public.units
  for select to authenticated using (status = 'approved' or public.is_teacher());
create policy "read vocab" on public.vocab
  for select to authenticated using (public.can_read_unit(unit_id));
create policy "read frames" on public.frames
  for select to authenticated using (public.can_read_unit(unit_id));
create policy "read questions" on public.questions
  for select to authenticated using (public.can_read_unit(unit_id));
-- Không có policy ghi: chỉ scripts/seed-content.mjs và scripts/approve-content.mjs (service_role) ghi được.
