"""Thử máy chấm trên máy: python try_local.py <file.wav 16 kHz> "<câu mẫu>" [thêm cặp wav/câu...]"""

import json
import sys
import time

from engine import Engine

if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) < 2 or len(args) % 2:
        sys.exit(__doc__)
    t = time.time()
    engine = Engine()
    print(f"nạp mô hình: {time.time() - t:.1f}s", file=sys.stderr)
    for path, text in zip(args[::2], args[1::2]):
        t = time.time()
        with open(path, "rb") as f:
            result = engine.assess(f.read(), text)
        print(f"--- {path} | {text!r} | {time.time() - t:.2f}s", file=sys.stderr)
        print(json.dumps(result, ensure_ascii=False))
