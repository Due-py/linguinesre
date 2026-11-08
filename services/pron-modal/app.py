"""Máy chấm phát âm của LINGUA-REFLEX trên Modal (CPU, tắt khi không ai dùng).

Triển khai:  modal deploy app.py   (cần secret tên "lingua-pron" chứa PRON_SECRET, tạo ở modal.com/secrets)
Địa chỉ:     https://<tên-workspace>--lingua-pron-web.modal.run
  GET  /health                       -> {"status":"ok","secret_set":true}
  POST /assess?text=<câu mẫu>        thân là WAV 16 kHz mono, header Authorization: Bearer <PRON_SECRET>
"""

import modal

MODEL = "facebook/wav2vec2-lv-60-espeak-cv-ft"


def download_model() -> None:
    """Chạy một lần lúc dựng image: tải sẵn mô hình (~1,2 GB) để máy khởi động nhanh hơn."""
    from transformers import AutoTokenizer, Wav2Vec2FeatureExtractor, Wav2Vec2ForCTC

    Wav2Vec2FeatureExtractor.from_pretrained(MODEL)
    Wav2Vec2ForCTC.from_pretrained(MODEL)
    AutoTokenizer.from_pretrained(MODEL, do_phonemize=False)


image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install("torch==2.15.0", index_url="https://download.pytorch.org/whl/cpu")
    .pip_install(
        "transformers==5.22.1",
        "phonemizer==3.6.0",
        "espeakng-loader==0.2.4",
        "soundfile==0.14.0",
        "numpy==2.5.4",
        "fastapi[standard]",
    )
    .env({"HF_HOME": "/models", "TOKENIZERS_PARALLELISM": "false"})
    .run_function(download_model)
    .add_local_python_source("scoring", "engine")
)

app = modal.App("lingua-pron", image=image)

MAX_BYTES = 1_100_000  # 30 giây WAV 16 kHz 16 bit


@app.function(
    secrets=[modal.Secret.from_name("lingua-pron")],
    cpu=4.0,
    memory=4096,
    timeout=120,
    scaledown_window=600,  # nghỉ 10 phút không ai dùng thì tắt (không tốn tiền khi tắt)
)
@modal.concurrent(max_inputs=4)
@modal.asgi_app()
def web():
    import hmac
    import os

    from fastapi import FastAPI, HTTPException, Query, Request
    from starlette.concurrency import run_in_threadpool

    from engine import Engine

    secret = os.environ.get("PRON_SECRET", "")
    engine = Engine()  # nạp mô hình một lần cho mỗi máy
    api = FastAPI(title="LINGUA-REFLEX pronunciation", docs_url=None, redoc_url=None, openapi_url=None)

    @api.get("/health")
    def health() -> dict:
        return {"status": "ok", "secret_set": bool(secret)}

    @api.post("/assess")
    async def assess(request: Request, text: str = Query(..., min_length=1, max_length=300)) -> dict:
        auth = request.headers.get("authorization", "")
        if not secret or not hmac.compare_digest(auth.encode(), f"Bearer {secret}".encode()):
            raise HTTPException(status_code=401, detail="unauthorized")
        body = await request.body()
        if len(body) < 2_000 or len(body) > MAX_BYTES:
            raise HTTPException(status_code=400, detail="bad audio size")
        try:
            return await run_in_threadpool(engine.assess, body, text)  # không chặn các yêu cầu khác
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        except Exception as e:  # noqa: BLE001  (file không phải WAV, v.v.)
            raise HTTPException(status_code=400, detail="could not read audio") from e

    return api
