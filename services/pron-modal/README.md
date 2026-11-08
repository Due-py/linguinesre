# Máy chấm phát âm (Modal)

Chấm 0–100 cho từng âm, âm tiết và từ, giống cách Azure trình bày, nhưng bằng mô hình mã nguồn mở:

- [facebook/wav2vec2-lv-60-espeak-cv-ft](https://huggingface.co/facebook/wav2vec2-lv-60-espeak-cv-ft) (Apache-2.0) nghe ra âm;
- espeak-ng (qua `phonemizer` + `espeakng-loader`) cho âm mong đợi của câu mẫu, giọng Mỹ;
- căn chỉnh CTC rồi tính điểm kiểu "Goodness of Pronunciation" (xem `scoring.py`).

Máy đo so với giọng chuẩn của mô hình. Giọng trẻ em, giọng địa phương và tiếng ồn làm điểm thấp hơn thực tế. Không có điểm tổng.

## Triển khai

1. Tạo tài khoản ở modal.com (gói Starter, 30 USD/tháng miễn phí).
2. Ở modal.com/secrets tạo secret tên `lingua-pron`, khóa `PRON_SECRET`, giá trị giống `PRON_SECRET` trên Vercel.
3. Trên máy: `pip install modal`, `python -m modal setup` (đăng nhập), rồi trong thư mục này `python -m modal deploy app.py`.
4. Địa chỉ in ra (dạng `https://<workspace>--lingua-pron-web.modal.run`) đặt vào `PRON_SERVER_URL` trên Vercel và `.env.local`.

Kiểm tra: mở `<địa chỉ>/health` phải thấy `{"status":"ok","secret_set":true}` (lần đầu chờ máy bật khoảng nửa phút).

## Chi phí

Máy tắt sau 10 phút không ai dùng nên không tốn tiền lúc tắt. Khi bật: 4 lõi CPU + 4 GB RAM, khoảng 0,22 USD mỗi giờ
theo bảng giá Modal, nằm gọn trong 30 USD miễn phí mỗi tháng với một lớp học.

## Thử trên máy

`python try_local.py <file.wav 16 kHz> "<câu mẫu>"` (cần `torch transformers phonemizer espeakng-loader soundfile`).
