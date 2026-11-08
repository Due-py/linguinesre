"""Nạp mô hình nghe âm và espeak-ng, rồi chấm một bản ghi. Dùng chung cho máy chủ Modal và thử trên máy."""

from __future__ import annotations

import io
import os

import numpy as np

from scoring import score_utterance, split_words

MODEL = "facebook/wav2vec2-lv-60-espeak-cv-ft"
RATE = 16000


def _setup_espeak() -> None:
    """Dùng espeak-ng đóng gói sẵn trong gói espeakng-loader (chạy giống nhau trên Linux và Windows)."""
    import espeakng_loader
    from phonemizer.backend.espeak.wrapper import EspeakWrapper

    EspeakWrapper.set_library(espeakng_loader.get_library_path())
    EspeakWrapper.set_data_path(espeakng_loader.get_data_path())


class Engine:
    def __init__(self) -> None:
        import torch
        from phonemizer.backend import EspeakBackend
        from phonemizer.separator import Separator
        from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2ForCTC

        _setup_espeak()
        torch.set_num_threads(max(1, os.cpu_count() or 1))
        self.torch = torch
        self.features = Wav2Vec2FeatureExtractor.from_pretrained(MODEL)
        self.model = Wav2Vec2ForCTC.from_pretrained(MODEL).eval()
        from transformers import AutoTokenizer

        vocab = AutoTokenizer.from_pretrained(MODEL, do_phonemize=False).get_vocab()
        self.phone_to_id: dict[str, int] = {p: i for p, i in vocab.items() if not p.startswith("<")}
        self.blank = int(vocab.get("<pad>", 0))
        self.backend = EspeakBackend("en-us", preserve_punctuation=False, with_stress=False, language_switch="remove-flags")
        self.sep = Separator(phone=" ", word="|", syllable="")

    def expected(self, words: list[str]) -> list[list[str]]:
        """Âm mong đợi của từng từ (espeak-ng, giọng Mỹ), tách theo đúng bộ âm của mô hình.
        Đọc cả câu một lần để có dạng nói nhanh tự nhiên ("to" là /tə/, "a" là /ɐ/), không phải dạng tra từ điển;
        nếu số từ espeak trả về không khớp thì đọc từng từ."""
        whole = self.backend.phonemize([" ".join(words)], separator=self.sep, strip=True, njobs=1)[0].split("|")
        out = whole if len(whole) == len(words) else self.backend.phonemize(words, separator=self.sep, strip=True, njobs=1)
        result = []
        for s in out:
            phones: list[str] = []
            for tok in s.replace("|", " ").split():
                if tok in self.phone_to_id:
                    phones.append(tok)
                else:  # âm ghép lạ: thử tách thành các âm có trong bộ của mô hình
                    phones.extend(c for c in tok if c in self.phone_to_id)
            result.append(phones)
        return result

    def log_probs(self, wave: np.ndarray) -> np.ndarray:
        torch = self.torch
        inputs = self.features(wave, sampling_rate=RATE, return_tensors="pt")
        with torch.inference_mode():
            logits = self.model(inputs.input_values).logits[0]
        return torch.log_softmax(logits.float(), dim=-1).numpy()

    def assess(self, wav_bytes: bytes, text: str) -> dict:
        import soundfile as sf

        wave, rate = sf.read(io.BytesIO(wav_bytes), dtype="float32")
        if wave.ndim > 1:
            wave = wave.mean(axis=1)
        if rate != RATE:
            raise ValueError("need 16 kHz")
        if wave.size < RATE // 4 or float(np.sqrt(np.mean(wave**2))) < 1e-4:
            return {"status": "no_speech"}
        words = split_words(text)
        if not words:
            return {"status": "no_reference"}
        return score_utterance(self.log_probs(wave), words, self.expected(words), self.phone_to_id, self.blank)
