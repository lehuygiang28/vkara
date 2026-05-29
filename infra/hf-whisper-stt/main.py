import os
import tempfile
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

MODEL_ALIASES: dict[str, str] = {
    "tiny": "Systran/faster-whisper-tiny",
    "base": "Systran/faster-whisper-base",
    "small": "Systran/faster-whisper-small",
    "medium": "Systran/faster-whisper-medium",
    "large-v3": "Systran/faster-whisper-large-v3",
    "distil-small.en": "Systran/faster-distil-whisper-small.en",
    "distil-medium.en": "Systran/faster-distil-whisper-medium.en",
    "distil-large-v3": "Systran/faster-distil-whisper-large-v3",
}

model: WhisperModel | None = None
model_id_loaded: str | None = None


def resolve_model_id() -> str:
    raw = os.getenv("WHISPER_MODEL", "small").strip()
    return MODEL_ALIASES.get(raw, raw)


def load_model() -> WhisperModel:
    global model, model_id_loaded

    model_id = resolve_model_id()
    if model is not None and model_id_loaded == model_id:
        return model

    cache_dir = os.getenv("WHISPER_CACHE_DIR", "/data/whisper-cache")
    os.makedirs(cache_dir, exist_ok=True)

    device = os.getenv("WHISPER_DEVICE", "cpu")
    compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
    cpu_threads = int(os.getenv("WHISPER_CPU_THREADS", "2"))

    model = WhisperModel(
        model_id,
        device=device,
        compute_type=compute_type,
        download_root=cache_dir,
        cpu_threads=cpu_threads,
    )
    model_id_loaded = model_id
    return model


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_model()
    yield


app = FastAPI(title="Vkara Whisper STT", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "vkara-whisper-stt",
        "model": model_id_loaded,
        "endpoints": ["/health", "/v1/audio/transcriptions", "/transcribe"],
    }


@app.get("/health")
def health():
    return {"status": "ok", "model": model_id_loaded}


def transcribe_file(
    path: str,
    *,
    language: str | None,
    task: str = "transcribe",
) -> dict:
    whisper = load_model()
    lang = language.strip() if language and language.strip() else None

    segments, info = whisper.transcribe(
        path,
        language=lang,
        task=task,
        vad_filter=True,
        beam_size=int(os.getenv("WHISPER_BEAM_SIZE", "5")),
    )

    text_parts: list[str] = []
    for segment in segments:
        text_parts.append(segment.text.strip())

    return {
        "text": " ".join(part for part in text_parts if part).strip(),
        "language": info.language,
        "duration": info.duration,
    }


@app.post("/v1/audio/transcriptions")
async def openai_transcriptions(
    file: Annotated[UploadFile, File()],
    model: Annotated[str | None, Form()] = None,  # noqa: A002
    language: Annotated[str | None, Form()] = None,
    prompt: Annotated[str | None, Form()] = None,  # noqa: ARG001
    response_format: Annotated[str | None, Form()] = None,  # noqa: ARG001
    temperature: Annotated[float | None, Form()] = None,  # noqa: ARG001
):
    del model, prompt, response_format, temperature

    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing audio file")

    suffix = os.path.splitext(file.filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        lang = language or os.getenv("WHISPER_LANGUAGE") or None
        result = transcribe_file(tmp_path, language=lang)
        return {"text": result["text"]}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        os.unlink(tmp_path)


@app.post("/transcribe")
async def transcribe(
    file: Annotated[UploadFile, File()],
    language: Annotated[str | None, Form()] = None,
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing audio file")

    suffix = os.path.splitext(file.filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        lang = language or os.getenv("WHISPER_LANGUAGE") or None
        return transcribe_file(tmp_path, language=lang)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        os.unlink(tmp_path)
