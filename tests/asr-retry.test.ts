import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { deepgram } = await import("@/lib/module/asr");

const ok = () => new Response(JSON.stringify({ results: {} }), { status: 200 });
const fail = (status: number) => new Response("err", { status });

describe("chép lời: thử lại khi Deepgram lỗi tạm thời", () => {
  afterEach(() => vi.restoreAllMocks());
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});

  it("lỗi 503 rồi được: thành công ở lần 2", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(fail(503)).mockResolvedValueOnce(ok());
    expect(await deepgram("k", new ArrayBuffer(10), "audio/webm")).not.toBeNull();
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("lỗi mạng hai lần: lần 3 dùng mô hình dự phòng nova-2", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("net")).mockRejectedValueOnce(new Error("net")).mockResolvedValueOnce(ok());
    expect(await deepgram("k", new ArrayBuffer(10), "audio/webm")).not.toBeNull();
    expect(f).toHaveBeenCalledTimes(3);
    expect(String(f.mock.calls[2][0])).toContain("model=nova-2");
    expect(String(f.mock.calls[0][0])).toContain("model=nova-3");
  });

  it("lỗi do file (400): không thử lại, để trình duyệt gửi bản ghi thô", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(fail(400));
    expect(await deepgram("k", new ArrayBuffer(10), "audio/webm")).toBeNull();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("lỗi cả 3 lần: trả null", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(fail(502));
    expect(await deepgram("k", new ArrayBuffer(10), "audio/webm")).toBeNull();
  });
});
