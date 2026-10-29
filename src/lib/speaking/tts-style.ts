/**
 * Cách đọc câu hỏi (chỉ dẫn cho gpt-4o-mini-tts; mô hình tts-1 bỏ qua). Đổi chuỗi này thì giọng đọc của mọi câu
 * được tạo lại, vì tên file lưu trong kho phụ thuộc cả mô hình, giọng và chỉ dẫn (xem /api/tts).
 *
 * Chọn ngày 29/10/2026 (mẫu "04-moi-cedar" của npm run voice:samples), dùng với OPENAI_TTS_MODEL=gpt-4o-mini-tts-2025-12-15.
 * KHÔNG đổi giọng, mô hình hay chỉ dẫn từ bài kiểm tra lần 1 đến hết lần 2: đề kiểm tra phải nghe giống hệt nhau.
 */
export const TTS_INSTRUCTIONS =
  "Speak like a friendly young English teacher chatting with a 13-year-old student, face to face. " +
  "Sound genuinely curious about the answer. Use a relaxed, natural conversational rhythm with a tiny natural pause where a person would breathe. " +
  "Keep a normal speaking pace, a little slower than fast native speech, and the same pace for every question. " +
  "Natural question intonation, light warmth, no exaggerated cheerfulness, no announcer voice. Say exactly the given words, nothing more.";

export const DEFAULT_TTS_VOICE = "cedar";
