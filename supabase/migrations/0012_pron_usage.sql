-- LINGUA-REFLEX 0012: đếm lượt chấm phát âm chi tiết (Azure) trong api_usage. Chạy SAU 0010.
-- Chưa chạy file này thì chấm phát âm vẫn chạy, chỉ là chưa đếm được giới hạn lượt (dòng đếm bị từ chối).
alter table public.api_usage drop constraint if exists api_usage_kind_check;
alter table public.api_usage add constraint api_usage_kind_check check (kind in ('transcribe', 'feedback', 'tts', 'roleplay', 'pron'));
