-- LINGUA-REFLEX 0015: trang thống kê nghiên cứu (/research), điểm chấm mù, phiếu đồng ý. Chạy SAU 0014.
-- CHỈ THÊM bảng mới và một cài đặt. Không sửa, không xóa bảng hay dữ liệu cũ. Chạy lại nhiều lần không sao.
--
--  * research_staff: ai được mở /research và ở mức nào.
--      blind = xem mù: số liệu chung, dữ liệu theo mã học sinh KHÔNG có nhóm A/B (Duy, Hiệu chấm bài; Nam Anh; cô Vân).
--      key   = giữ danh sách: thấy thêm so sánh A/B (Lâm, người xây web nếu nhóm cho phép).
--    Thêm/bớt bằng: npm run research:staff -- add <email> blind|key   (chỉ chạy được bằng khóa máy chủ).
--  * test_scores: điểm 0–1–2 của từng câu trả lời kiểm tra nói, do người chấm mù nhập (Quy trình mục 3.6).
--      rater 1, 2 = hai người chấm độc lập; rater 0 = điểm thống nhất sau khi hai người bàn lại câu lệch nhau.
--  * research_consent: phiếu đồng ý (giấy) của phụ huynh và học sinh, và việc rút khỏi nghiên cứu.
--  * research_settings.unblinded: false = người mức blind chưa được thấy so sánh A/B. Lâm bật sau khi chấm mù xong.
-- Mọi bảng: bật RLS, KHÔNG có policy → học sinh và giáo viên không đọc được; chỉ máy chủ đọc sau khi kiểm tra quyền.

create table if not exists public.research_staff (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  level       text not null check (level in ('blind', 'key')),
  label       text check (char_length(label) <= 60),          -- VD "Người chấm 1" (không bắt buộc, không ghi họ tên đầy đủ)
  created_at  timestamptz not null default now()
);
alter table public.research_staff enable row level security;

create table if not exists public.test_scores (
  response_id  uuid not null references public.test_responses (id) on delete cascade,
  rater        smallint not null check (rater in (0, 1, 2)),
  score        smallint not null check (score in (0, 1, 2)),
  blind_code   text not null check (blind_code ~ '^R[0-9]{4,5}$'),  -- mã file người chấm đã thấy (R0371)
  note         text check (char_length(note) <= 500),
  imported_at  timestamptz not null default now(),
  primary key (response_id, rater)
);
create index if not exists test_scores_response_idx on public.test_scores (response_id);
alter table public.test_scores enable row level security;

create table if not exists public.research_consent (
  student_id          uuid primary key references public.profiles (id) on delete cascade,
  parent_consent_on   date,                                    -- ngày phụ huynh ký phiếu đồng ý
  student_consent_on  date,                                    -- ngày học sinh ký
  withdrawn_on        date,                                    -- ngày rút khỏi nghiên cứu (trống = vẫn tham gia)
  withdraw_data       text check (withdraw_data in ('keep', 'delete')),  -- phụ huynh/học sinh muốn giữ hay xóa dữ liệu đã thu
  note                text check (char_length(note) <= 300),
  updated_at          timestamptz not null default now()
);
alter table public.research_consent enable row level security;

insert into public.research_settings (key, value) values ('unblinded', 'false'::jsonb) on conflict (key) do nothing;
