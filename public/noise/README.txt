Lọc ồn RNNoise cho micro khi luyện nói (src/lib/speaking/useRecorder.ts).
- rnnoise-worklet.js, rnnoise.wasm, rnnoise_simd.wasm: chép từ gói npm @sapphi-red/web-noise-suppressor 0.4.1 (MIT),
  bản WebAssembly của xiph/rnnoise (BSD-3-Clause). Cập nhật gói thì chép lại: npm run noise:copy
- pcm-tap.js: bộ thu mẫu âm thanh của LINGUA-REFLEX, tạo bản WAV 16 kHz cho chấm phát âm Azure.
