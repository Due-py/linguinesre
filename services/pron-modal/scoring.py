"""Chấm phát âm kiểu Azure bằng mô hình mã nguồn mở, không cần mạng ngoài.

Cách làm (giống ý tưởng "Goodness of Pronunciation" mà các hệ chấm phát âm dùng):
  1. espeak-ng đổi câu mẫu ra dãy âm mong đợi (IPA), theo từng từ.
  2. Mô hình wav2vec2 nghe âm (facebook/wav2vec2-lv-60-espeak-cv-ft) cho xác suất từng âm ở từng khung 20 ms.
  3. Ép dãy âm mong đợi vào bản ghi (căn chỉnh CTC Viterbi) để biết mỗi âm nằm ở khung nào.
  4. Điểm một âm = mô hình chắc bao nhiêu phần trăm rằng ở chỗ đó em nói ĐÚNG âm ấy (0–100).
  5. Gộp âm thành âm tiết (nguyên tắc phụ âm đầu dài nhất), âm tiết thành từ: điểm là trung bình.

Đây là máy đo so với giọng chuẩn của mô hình, không phải giám khảo: giọng trẻ em, giọng địa phương và tiếng ồn làm điểm thấp
hơn thực tế. Không có điểm tổng của cả câu (sản phẩm cố ý không hiện).
"""

from __future__ import annotations

import re
from dataclasses import dataclass

import numpy as np

# ---- Căn chỉnh CTC (Viterbi) --------------------------------------------------------------------------------------


def ctc_align(log_probs: np.ndarray, targets: list[int], blank: int) -> np.ndarray | None:
    """Đường căn chỉnh tốt nhất của dãy `targets` trên log xác suất T×V. Trả về số trạng thái (0..2L) cho từng khung;
    trạng thái lẻ 2i+1 là âm thứ i, trạng thái chẵn là khoảng trống. None nếu bản ghi quá ngắn so với số âm."""
    T = log_probs.shape[0]
    L = len(targets)
    S = 2 * L + 1
    tokens = np.full(S, blank, dtype=np.int64)
    tokens[1::2] = targets
    # Được nhảy qua một khoảng trống khi hai âm liền nhau khác nhau.
    skip = np.zeros(S, dtype=bool)
    for s in range(3, S, 2):
        skip[s] = tokens[s] != tokens[s - 2]
    need = L + int(np.sum(~skip[3::2])) if L > 1 else L
    if T < max(need, 1):
        return None

    neg = -np.inf
    alpha = np.full(S, neg)
    alpha[0] = log_probs[0, blank]
    if S > 1:
        alpha[1] = log_probs[0, tokens[1]]
    back = np.zeros((T, S), dtype=np.int8)
    for t in range(1, T):
        c0 = alpha
        c1 = np.concatenate(([neg], alpha[:-1]))
        c2 = np.concatenate(([neg, neg], alpha[:-2]))
        c2 = np.where(skip, c2, neg)
        stack = np.stack([c0, c1, c2])
        arg = np.argmax(stack, axis=0)
        alpha = stack[arg, np.arange(S)] + log_probs[t, tokens]
        back[t] = arg
    end = S - 1 if S == 1 or alpha[S - 1] >= alpha[S - 2] else S - 2
    if not np.isfinite(alpha[end]):
        return None
    path = np.empty(T, dtype=np.int64)
    s = end
    for t in range(T - 1, -1, -1):
        path[t] = s
        s -= back[t, s]
    return path


# ---- Chia âm tiết ---------------------------------------------------------------------------------------------------

VOWEL_START = set("aeiouæɑɒɔəɛɜɪʊʌɐɚɝœøyɨʉɯɤɵɘɞɶᵻ")
SYLLABIC_MARK = "̩"
# Cụm phụ âm được đứng đầu âm tiết trong tiếng Anh (viết bằng âm của espeak, r là ɹ).
ONSETS = {
    tuple(x.split())
    for x in [
        "p l", "p ɹ", "p j", "b l", "b ɹ", "b j", "t ɹ", "t w", "t j", "d ɹ", "d w", "d j", "k l", "k ɹ", "k w", "k j",
        "ɡ l", "ɡ ɹ", "ɡ w", "ɡ j", "f l", "f ɹ", "f j", "θ ɹ", "θ w", "ʃ ɹ", "s p", "s t", "s k", "s m", "s n", "s l",
        "s w", "s f", "s j", "m j", "n j", "h j", "v j", "l j",
        "s p l", "s p ɹ", "s t ɹ", "s k ɹ", "s k w", "s p j", "s t j", "s k j",
    ]
}


def is_vowel(phone: str) -> bool:
    return bool(phone) and (phone[0] in VOWEL_START or SYLLABIC_MARK in phone)


def legal_onset(cluster: tuple[str, ...]) -> bool:
    if len(cluster) == 0:
        return True
    if len(cluster) == 1:
        return cluster[0] not in ("ŋ",)
    return cluster in ONSETS


def syllabify(phones: list[str]) -> list[tuple[int, int]]:
    """Chia dãy âm của một từ thành âm tiết, trả về các đoạn [đầu, cuối). Mỗi âm tiết có đúng một nguyên âm."""
    nuclei = [i for i, p in enumerate(phones) if is_vowel(p)]
    if len(nuclei) <= 1:
        return [(0, len(phones))] if phones else []
    starts = [0]
    for a, b in zip(nuclei, nuclei[1:]):
        between = phones[a + 1 : b]
        k = len(between)
        while k > 0 and not legal_onset(tuple(between[len(between) - k :])):
            k -= 1
        starts.append(b - k)
    ends = starts[1:] + [len(phones)]
    return list(zip(starts, ends))


# ---- Chấm ----------------------------------------------------------------------------------------------------------

WORD_RE = re.compile(r"[A-Za-z][A-Za-z'’\-]*|\d+")


def split_words(text: str) -> list[str]:
    return [w.replace("’", "'") for w in WORD_RE.findall(text)][:40]


# Biến thể được chấp nhận của cùng một âm (không tính là sai): nguyên âm nhẹ khi nói nhanh, cot–caught của giọng Mỹ,
# âm t/d bật nhẹ giữa từ ("water"), có hoặc không có r kiểu Anh. Chỉ gồm các cặp KHÔNG phân biệt nghĩa ở giọng Mỹ;
# các cặp phân biệt nghĩa (iː/ɪ "sheep/ship", uː/ʊ, æ/ɛ...) vẫn chấm chặt.
VARIANTS: dict[str, set[str]] = {
    "ə": {"ɐ", "ɪ", "ᵻ", "ʌ"},
    "ɐ": {"ə", "ʌ"},
    "ɪ": {"ᵻ", "ə", "i"},
    "ᵻ": {"ɪ", "ə"},
    "ʌ": {"ə", "ɐ"},
    "i": {"iː", "ɪ"},
    "iː": {"i"},
    "ɔː": {"ɑː", "ɔ", "ɑ", "ɒ"},
    "ɔ": {"ɑː", "ɑ", "ɔː", "ɒ"},
    "ɑː": {"ɔː", "ɑ"},
    "ɚ": {"ə", "ɜː"},
    "ɜː": {"ɚ"},
    "oʊ": {"əʊ"},
    "ɛɹ": {"eə", "ɛ", "ɛː"},
    "ɑːɹ": {"ɑː"},
    "ɔːɹ": {"ɔː", "oːɹ"},
    "oːɹ": {"ɔːɹ", "ɔː"},
    "ɪɹ": {"iə", "ɪə"},
    "ʊɹ": {"ʊə", "ɔːɹ"},
    "ɾ": {"t", "d"},
    "t": {"ɾ", "ʔ"},
    "d": {"ɾ"},
    "əl": {"l̩", "l"},
    "l̩": {"əl", "l"},
    "n̩": {"n"},
}


@dataclass
class PhoneScore:
    p: str
    score: int
    heard: str | None  # None: nghe đúng; "": không nghe thấy; khác: nghe giống âm này


# Từ chức năng hay đọc lướt (dạng yếu): nguyên âm của chúng đọc thành /ə/ cũng đúng ("a" là /ə/, "can" là /kən/).
FUNCTION_WORDS = {
    "a", "an", "the", "to", "of", "and", "for", "at", "from", "can", "could", "was", "were", "are", "do", "does", "you",
    "your", "some", "but", "as", "than", "that", "or", "has", "have", "had", "will", "would", "should", "must", "am", "is",
    "be", "been", "there", "them", "him", "her", "his", "us", "our", "on", "in", "into",
}
WEAK_VOWELS = {"ə", "ɐ", "ɪ", "ᵻ", "ʌ"}


def phone_score(
    probs: np.ndarray,
    frames: np.ndarray,
    token: int,
    blank: int,
    id_to_phone: dict[int, str],
    phone_to_id: dict[str, int],
    weak: bool = False,
) -> PhoneScore:
    """Điểm một âm từ các khung được căn cho nó. Lấy khung mà âm mong đợi (hoặc biến thể chấp nhận) nổi rõ nhất:
    - phần lời nói ở khung đó (1 − khoảng trống) cho biết có âm hay không;
    - trong phần lời nói, tỉ lệ thuộc về đúng âm mong đợi cho biết đúng hay bị nghe thành âm khác."""
    expected = id_to_phone.get(token, "")
    allowed = set(VARIANTS.get(expected, ()))
    if weak and is_vowel(expected):
        allowed |= WEAK_VOWELS
    ok = [token] + [phone_to_id[v] for v in allowed if v in phone_to_id and phone_to_id[v] != token]
    sub = probs[frames]
    good = sub[:, ok].sum(axis=1)
    f = int(np.argmax(good))
    row = sub[f]
    pt = float(good[f])
    speech = max(1e-9, 1.0 - float(row[blank]))
    share = min(1.0, pt / speech)  # trong phần lời nói, bao nhiêu là đúng âm này
    presence = min(1.0, speech / 0.5)  # gần như toàn khoảng trống: có thể em bỏ sót âm
    score = int(round(100 * share * presence))
    others = row.copy()
    others[ok + [blank]] = 0.0
    best = int(np.argmax(others))
    heard: str | None = None
    if speech < 0.1:
        heard = ""
    elif share < 0.5 and others[best] > pt:
        heard = id_to_phone.get(best, "")
    return PhoneScore(p=id_to_phone.get(token, "?"), score=score, heard=heard)


# Bộ âm tiếng Anh (Mỹ) mà espeak-ng dùng. Mô hình nghe được âm của gần 100 ngôn ngữ (cả âm có thanh điệu như "ei5" của
# tiếng Trung); giọng trẻ em hay giọng Việt dễ bị xếp vào các âm đó. Chỉ so trong bộ âm tiếng Anh để "nghe giống" luôn là
# một âm tiếng Anh và điểm không bị kéo xuống vì một âm của ngôn ngữ khác.
EN_PHONES = (
    "p b t d k ɡ f v θ ð s z ʃ ʒ h tʃ dʒ m n ŋ l ɹ w j ɾ ʔ "
    "ɪ ɛ æ ʌ ʊ ɑː ɔː iː uː ə ɚ ɜː eɪ aɪ ɔɪ oʊ aʊ ɪɹ ɛɹ ʊɹ ɑːɹ ɔːɹ oːɹ aɪɚ aɪə ᵻ ɐ i ɑ ɔ ʊə iə əl n̩ l̩"
).split()


def english_only(log_probs: np.ndarray, phone_to_id: dict[str, int], blank: int) -> np.ndarray:
    """Chuẩn hóa lại xác suất chỉ trên khoảng trống và các âm tiếng Anh (bỏ âm của ngôn ngữ khác)."""
    keep = [blank] + [phone_to_id[p] for p in EN_PHONES if p in phone_to_id]
    masked = np.full_like(log_probs, -np.inf)
    masked[:, keep] = log_probs[:, keep]
    m = masked.max(axis=1, keepdims=True)
    return masked - (m + np.log(np.exp(masked - m).sum(axis=1, keepdims=True)))


def score_utterance(
    log_probs: np.ndarray,
    words: list[str],
    word_phones: list[list[str]],
    phone_to_id: dict[str, int],
    blank: int,
) -> dict:
    """Ghép tất cả: căn chỉnh, điểm từng âm, âm tiết, từ. `word_phones[i]` là các âm mong đợi của `words[i]`."""
    id_to_phone = {i: p for p, i in phone_to_id.items()}
    log_probs = english_only(log_probs, phone_to_id, blank)
    probs = np.exp(log_probs)
    # Hầu như toàn khoảng trống: máy không nghe ra lời.
    if float(np.max(1.0 - probs[:, blank], initial=0.0)) < 0.3:
        return {"status": "no_speech"}

    flat: list[int] = []
    owner: list[tuple[int, int]] = []  # (từ, vị trí âm trong từ) cho từng âm trong dãy phẳng
    kept: list[list[str]] = []
    for wi, phones in enumerate(word_phones):
        ok = [p for p in phones if p in phone_to_id]
        kept.append(ok)
        for pi, p in enumerate(ok):
            flat.append(phone_to_id[p])
            owner.append((wi, pi))
    if not flat:
        return {"status": "no_reference"}

    path = ctc_align(log_probs, flat, blank)
    if path is None:
        return {"status": "no_speech"}

    scores: list[list[PhoneScore]] = [[] for _ in words]
    for k, token in enumerate(flat):
        frames = np.nonzero(path == 2 * k + 1)[0]
        wi, _ = owner[k]
        weak = words[wi].lower().strip("'") in FUNCTION_WORDS
        scores[wi].append(phone_score(probs, frames, token, blank, id_to_phone, phone_to_id, weak))

    out = []
    for wi, word in enumerate(words):
        ph = scores[wi]
        if not ph:
            continue
        syl = [
            {"text": "".join(x.p for x in ph[a:b]), "score": int(round(np.mean([x.score for x in ph[a:b]])))}
            for a, b in syllabify([x.p for x in ph])
        ]
        out.append({
            "word": word,
            "score": int(round(np.mean([x.score for x in ph]))),
            "missing": all(x.heard == "" for x in ph),
            "syllables": syl,
            "phones": [{"p": x.p, "score": x.score, "heard": x.heard} for x in ph],
        })
    return {"status": "ok", "words": out}
