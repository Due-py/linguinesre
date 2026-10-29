-- 0007: mở rộng từ THCS (lớp 6–9) lên lớp 6–12, vì đã có nội dung luyện nói cho đủ 78 Unit.
-- Chạy sau 0001–0006. Chạy lại được (drop ... if exists, create or replace).

alter table public.profiles drop constraint if exists profiles_grade_check;
alter table public.profiles add constraint profiles_grade_check check (grade between 6 and 12);

alter table public.classes drop constraint if exists classes_grade_check;
alter table public.classes add constraint classes_grade_check check (grade between 6 and 12);

alter table public.units drop constraint if exists units_grade_check;
alter table public.units add constraint units_grade_check check (grade between 6 and 12);

-- Giữ nguyên như 0001, chỉ đổi khoảng khối lớp.
create or replace function public.complete_onboarding(p_role text, p_display_name text, p_grade int, p_goal text)
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
  if p_role = 'student' and (p_grade is null or p_grade not between 6 and 12) then raise exception 'invalid_grade'; end if;
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
