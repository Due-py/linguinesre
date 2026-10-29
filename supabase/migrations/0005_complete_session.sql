-- LINGUA-REFLEX 0005: hoàn thành buổi luyện (M6). Chạy SAU 0004_feedback.sql.
--
-- Không có policy update trên practice_sessions, nên học sinh chỉ đổi trạng thái được qua hàm này.
-- Hàm chỉ cho "completed" khi MỌI câu đã lên kế hoạch có ít nhất một câu trả lời đã lưu, và chỉ với buổi của chính mình.
-- Gọi lại với buổi đã hoàn thành thì trả true, không đổi completed_at.

create function public.complete_session(sid uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  s public.practice_sessions;
begin
  select * into s from public.practice_sessions
  where id = sid and student_id = (select auth.uid())
  for update;
  if not found then return false; end if;
  if s.status = 'completed' then return true; end if;
  if exists (
    select 1 from unnest(s.question_ids) q(id)
    where not exists (select 1 from public.session_answers a where a.session_id = s.id and a.question_id = q.id)
  ) then
    return false;
  end if;
  update public.practice_sessions set status = 'completed', completed_at = now() where id = s.id;
  return true;
end;
$$;
revoke all on function public.complete_session(uuid) from public, anon;
grant execute on function public.complete_session(uuid) to authenticated;

