// Thu mẫu âm thanh (mono) gửi về trang để tạo bản WAV 16 kHz cho chấm phát âm. Chỉ gửi khi trang bật "on".
class PcmTap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.on = false;
    this.port.onmessage = (e) => {
      this.on = !!e.data?.on;
    };
  }
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (this.on && ch) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor("pcm-tap", PcmTap);
