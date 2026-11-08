import { describe, expect, it } from "vitest";
import { concat, downsample, encodeWav } from "@/lib/speaking/wav";

describe("WAV 16 kHz cho chấm phát âm", () => {
  it("hạ 48 kHz xuống 16 kHz: một phần ba số mẫu, giữ mức trung bình", () => {
    const x = new Float32Array(4800).fill(0.5);
    const y = downsample(x, 48_000);
    expect(y.length).toBe(1600);
    expect(y[100]).toBeCloseTo(0.5);
  });
  it("ghép khối mẫu theo thứ tự", () => {
    expect(Array.from(concat([Float32Array.of(1, 2), Float32Array.of(3)]))).toEqual([1, 2, 3]);
  });
  it("header WAV đúng: RIFF, PCM mono 16 bit 16 kHz, độ dài dữ liệu", () => {
    const b = encodeWav(Float32Array.of(0, 1, -1, 2));
    const v = new DataView(b.buffer);
    const s = (o: number, n: number) => String.fromCharCode(...b.slice(o, o + n));
    expect(s(0, 4)).toBe("RIFF");
    expect(s(8, 8)).toBe("WAVEfmt ");
    expect(v.getUint16(20, true)).toBe(1);
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint32(24, true)).toBe(16_000);
    expect(v.getUint16(34, true)).toBe(16);
    expect(v.getUint32(40, true)).toBe(8);
    expect(v.getInt16(46, true)).toBe(32767);
    expect(v.getInt16(48, true)).toBe(-32768);
    expect(v.getInt16(50, true)).toBe(32767); // vượt 1 thì cắt
  });
});
