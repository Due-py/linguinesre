/**
 * Đổi mẫu âm thanh thu trong trình duyệt (thường 48 kHz, số thực −1..1) thành file WAV PCM 16 bit, 16 kHz, mono:
 * định dạng mà Azure chấm phát âm nhận (Azure không nhận WebM/MP4 mà trình duyệt ghi). Không phụ thuộc trình duyệt để test được.
 */
export const WAV_RATE = 16_000;

/** Hạ tần số lấy mẫu: lấy trung bình các mẫu rơi vào mỗi ô của tần số mới (lọc chống răng cưa đơn giản). */
export function downsample(input: Float32Array, fromRate: number, toRate = WAV_RATE): Float32Array {
  if (fromRate === toRate) return input;
  if (fromRate < toRate) throw new Error("Chỉ hạ tần số, không nâng.");
  const ratio = fromRate / toRate;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const a = Math.floor(i * ratio);
    const b = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = a; j < b; j++) sum += input[j];
    out[i] = b > a ? sum / (b - a) : 0;
  }
  return out;
}

/** Ghép các khối mẫu thu được thành một mảng. */
export function concat(chunks: Float32Array[]): Float32Array {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

/** Mẫu 16 kHz → byte của file WAV (header 44 byte + PCM 16 bit little-endian). */
export function encodeWav(samples: Float32Array, rate = WAV_RATE): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const v = new DataView(bytes.buffer);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) bytes[o + i] = s.charCodeAt(i);
  };
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return bytes;
}

/**
 * Cắt một file WAV PCM 16 bit mono (do encodeWav tạo) lấy đoạn [start − margin, end + margin] giây. Đọc tần số từ header.
 * File không đúng dạng, hoặc đoạn cắt quá ngắn (dưới 0,4 giây), thì trả lại nguyên file.
 */
export function cropWav(bytes: Uint8Array, start: number, end: number, margin = 0.35): Uint8Array {
  if (bytes.length < 46 || String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" || String.fromCharCode(...bytes.slice(8, 12)) !== "WAVE") return bytes;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (v.getUint16(22, true) !== 1 || v.getUint16(34, true) !== 16) return bytes;
  const rate = v.getUint32(24, true);
  const total = Math.floor((bytes.length - 44) / 2);
  const a = Math.max(0, Math.floor((start - margin) * rate));
  const b = Math.min(total, Math.ceil((end + margin) * rate));
  if (!(b > a) || b - a < 0.4 * rate) return bytes;
  const samples = new Float32Array(b - a);
  for (let i = 0; i < samples.length; i++) samples[i] = v.getInt16(44 + (a + i) * 2, true) / 0x8000;
  return encodeWav(samples, rate);
}
