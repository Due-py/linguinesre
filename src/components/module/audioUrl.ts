/**
 * Đường dẫn giọng đọc mẫu của module. Để riêng ở file thường (không "use client") vì trang máy chủ (Kho kiến thức) cũng cần
 * tạo đường dẫn này; hàm trong file "use client" thì máy chủ không gọi được.
 */
export const moduleAudio = (moduleId: string, key: string) => `/api/module/tts?m=${moduleId}&k=${encodeURIComponent(key)}`;
