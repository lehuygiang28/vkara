---
title: Vkara Whisper STT
emoji: 🎤
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
license: mit
---

OpenAI-compatible Whisper STT API for vkara voice search.

## Deploy on Hugging Face

1. [Create a new Space](https://huggingface.co/new-space) → SDK: **Docker** → Hardware: **CPU basic** (free) or **CPU upgrade** / **T4 small** if slow.
2. Upload this folder (or push git):

```bash
cd infra/hf-whisper-stt
git init && git add . && git commit -m "init whisper stt"
git remote add origin https://huggingface.co/spaces/YOUR_USER/vkara-whisper-stt
git push -u origin main
```

3. **Settings → Variables and secrets** (optional):

| Variable | Default | Description |
|----------|---------|-------------|
| `WHISPER_MODEL` | `small` | `tiny`, `base`, `small`, `medium`, or HF id e.g. `Systran/faster-whisper-small` |
| `WHISPER_COMPUTE_TYPE` | `int8` | CPU: `int8` or `int8_float32` |
| `WHISPER_LANGUAGE` | *(empty)* | `vi`, `en`, … or empty for auto-detect |
| `HF_TOKEN` | — | Only if pulling private/gated models |

4. Wait for build (~5–15 min first time while model downloads to `/data` cache).

5. Test:

```bash
curl -s https://YOUR_USER-vkara-whisper-stt.hf.space/health
curl -s -X POST "https://YOUR_USER-vkara-whisper-stt.hf.space/v1/audio/transcriptions" \
  -H "Authorization: Bearer hf_xxx" \
  -F "file=@sample.webm" \
  -F "language=vi"
```

Public Spaces may require `HF_TOKEN` in the header when calling from your API (set same token in vkara `WHISPER_HF_TOKEN`).

## Duplicate an existing Space instead

| Space | Why |
|-------|-----|
| [speaches-ai/speaches](https://huggingface.co/spaces/speaches-ai/speaches) | OpenAI API (transcribe + TTS), actively maintained; pick **CPU** hardware |
| [fedirz/faster-whisper-server](https://huggingface.co/spaces/fedirz/faster-whisper-server) | Older name of speaches; may have README preload limits — prefer speaches |
| [wolfofbackstreet/faster-whisper-transcription-api](https://huggingface.co/spaces/wolfofbackstreet/faster-whisper-transcription-api) | API-focused; check if Space is running before duplicate |

**Duplicate:** Space page → **⋮** → **Duplicate this Space** → remove excess `preload_from_hub` models in README if build fails (HF limits ~10 preloads).

## vkara API env (later)

```env
WHISPER_BASE_URL=https://YOUR_USER-vkara-whisper-stt.hf.space
WHISPER_HF_TOKEN=hf_...
```
