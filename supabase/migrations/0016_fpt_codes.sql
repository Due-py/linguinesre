-- LINGUA-REFLEX 0016: mã học sinh theo mã FPT Bắc Giang (VD: FBG20124). Chạy SAU 0015.
-- Chỉ nới điều kiện kiểm tra của cột code: nhận FBG + 4–6 chữ số, vẫn nhận dạng cũ (VD: HS008) để tài khoản đã tạo không lỗi.
-- Không sửa, không xóa dữ liệu nào. Chạy lại nhiều lần không sao.
alter table public.research_participants drop constraint if exists research_participants_code_check;
alter table public.research_participants
  add constraint research_participants_code_check check (code ~ '^(FBG[0-9]{4,6}|[A-Z]{2}[0-9]{2,4})$');
