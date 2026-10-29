-- LINGUA-REFLEX 0001: hồ sơ, lớp học, mã lớp và phân quyền.
-- Chạy trong Supabase: SQL Editor > New query > dán > Run. Chạy các file theo thứ tự số.
--
-- Nguyên tắc:
--  * Hồ sơ chỉ ghi được qua complete_onboarding() (một lần). Vai trò không đổi được sau đó.
--  * Giáo viên chỉ đọc được học sinh đang ở trong lớp do mình sở hữu.
--  * Học sinh chỉ đọc hồ sơ của mình và các lớp mình đã vào.
--  * Mã lớp chỉ để vào lớp, không thay xác thực.

-- 1. Hồ sơ --------------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         text check (role in ('student', 'teacher')),
  display_name text check (char_length(display_name) between 1 and 40),
  grade        smallint check (grade between 6 and 9),            -- THCS; nới ràng buộc khi mở rộng khối
  goal         text check (goal in ('reflex', 'express', 'vocab', 'grammar')),
  onboarded_at timestamptz,
  created_at   timestamptz not null default now(),
  constraint onboarded_has_fields check (
    onboarded_at is null
    or (role is not null and display_name is not null and (role <> 'student' or grade is not null))
  )
);
alter table public.profiles enable row level security;

-- Mỗi tài khoản mới có một dòng hồ sơ trống, điền ở bước onboarding.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Lớp học ------------------------------------------------------------------------------
create table public.classes (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  grade      smallint check (grade between 6 and 9),            -- trống = lớp nhiều khối
  join_code  text not null unique check (join_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  status     text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);
create table public.class_members (
  class_id   uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index class_members_student_idx on public.class_members (student_id);
create index classes_teacher_idx on public.classes (teacher_id);
alter table public.classes enable row level security;
alter table public.class_members enable row level security;

-- 3. Hàm kiểm tra quyền (security definer để không bị RLS chặn đệ quy) ---------------------
create function public.owns_class(cid uuid)
returns boolean language sql security definer stable set search_path = ''
as $$ select exists (select 1 from public.classes where id = cid and teacher_id = (select auth.uid())); $$;

create function public.my_class_ids()
returns setof uuid language sql security definer stable set search_path = ''
as $$ select class_id from public.class_members where student_id = (select auth.uid()); $$;

-- Người đang đăng nhập là giáo viên có lớp chứa học sinh này.
create function public.teaches_student(sid uuid)
returns boolean language sql security definer stable set search_path = ''
as $$
  select exists (
    select 1
    from public.class_members m
    join public.classes c on c.id = m.class_id
    join public.profiles t on t.id = c.teacher_id and t.role = 'teacher'
    where m.student_id = sid and c.teacher_id = (select auth.uid())
  );
$$;

revoke all on function public.owns_class(uuid), public.my_class_ids(), public.teaches_student(uuid) from public, anon;
grant execute on function public.owns_class(uuid), public.my_class_ids(), public.teaches_student(uuid) to authenticated;

-- 4. Policy ---------------------------------------------------------------------------------
create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "teacher reads class students" on public.profiles
  for select to authenticated using (public.teaches_student(id));
-- Không có policy insert/update/delete trên profiles: chỉ complete_onboarding() ghi được.

create policy "read classes" on public.classes
  for select to authenticated
  using (teacher_id = (select auth.uid()) or id in (select public.my_class_ids()));
create policy "teacher creates own class" on public.classes
  for insert to authenticated
  with check (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'teacher' and onboarded_at is not null)
  );
create policy "teacher updates own class" on public.classes
  for update to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));

create policy "read class members" on public.class_members
  for select to authenticated
  using (student_id = (select auth.uid()) or public.owns_class(class_id));
create policy "teacher removes member" on public.class_members
  for delete to authenticated using (public.owns_class(class_id));
-- Thêm thành viên chỉ qua join_class().

-- 5. Onboarding: chạy được đúng một lần ---------------------------------------------------
create function public.complete_onboarding(p_role text, p_display_name text, p_grade int, p_goal text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  name text := btrim(p_display_name);
begin
  if p_role not in ('student', 'teacher') then raise exception 'invalid_role'; end if;
  if name is null or char_length(name) not between 1 and 40 then raise exception 'invalid_name'; end if;
  if p_role = 'student' and (p_grade is null or p_grade not between 6 and 9) then raise exception 'invalid_grade'; end if;
  if p_goal is not null and p_goal not in ('reflex', 'express', 'vocab', 'grammar') then raise exception 'invalid_goal'; end if;

  update public.profiles
  set role = p_role,
      display_name = name,
      grade = case when p_role = 'student' then p_grade::smallint end,
      goal = case when p_role = 'student' then p_goal end,
      onboarded_at = now()
  where id = (select auth.uid()) and onboarded_at is null;

  if not found then raise exception 'already_onboarded'; end if;
end;
$$;
revoke all on function public.complete_onboarding(text, text, int, text) from public, anon;
grant execute on function public.complete_onboarding(text, text, int, text) to authenticated;

-- 6. Vào lớp bằng mã ------------------------------------------------------------------------
-- Trả đúng một dòng khi vào được; không dòng nào khi mã sai / lớp đã lưu trữ / khác khối / người gọi
-- không phải học sinh. Không phân biệt lý do để người ngoài không dò được mã nào đang tồn tại.
create function public.join_class(code text)
returns table (class_id uuid, class_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles%rowtype;
  c  public.classes%rowtype;
begin
  select * into me from public.profiles
  where id = (select auth.uid()) and role = 'student' and onboarded_at is not null;
  if not found then return; end if;

  select * into c from public.classes where join_code = upper(btrim(code)) and status = 'active';
  if not found then return; end if;
  if c.grade is not null and c.grade <> me.grade then return; end if;

  insert into public.class_members (class_id, student_id) values (c.id, me.id) on conflict do nothing;
  class_id := c.id;
  class_name := c.name;
  return next;
end;
$$;
revoke all on function public.join_class(text) from public, anon;
grant execute on function public.join_class(text) to authenticated;
