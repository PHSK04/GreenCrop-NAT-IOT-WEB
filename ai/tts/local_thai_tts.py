"""Persistent JSON-lines worker for local Thai text-to-speech.

Input (one JSON object per line):
    {"id": "request-id", "text": "สวัสดี", "rate": 1.0}

Output (one JSON object per line):
    {"id": "request-id", "audio_base64": "...", "content_type": "audio/wav"}

The model is loaded once and reused for every request.
"""

from __future__ import annotations

import base64
import io
import json
import os
import sys
import traceback

import numpy as np
import torch
from scipy.io import wavfile
from transformers import AutoModelForTextToWaveform, AutoTokenizer


MODEL_ID = os.getenv("NAT_AI_TTS_MODEL", "facebook/mms-tts-tha")
MAX_TEXT_CHARS = max(100, min(2400, int(os.getenv("NAT_AI_TTS_MAX_TEXT_CHARS", "1200"))))


def log(message: str) -> None:
    print(f"[local-tts] {message}", file=sys.stderr, flush=True)


def write_message(payload: dict) -> None:
    print(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), flush=True)


def normalize_audio(audio: np.ndarray) -> np.ndarray:
    values = np.asarray(audio, dtype=np.float32).reshape(-1)
    peak = float(np.max(np.abs(values))) if values.size else 0.0
    if peak > 1.0:
        values = values / peak
    return np.clip(values, -1.0, 1.0)


def adjust_rate(audio: np.ndarray, rate: float) -> np.ndarray:
    rate = max(0.75, min(1.25, rate))
    if abs(rate - 1.0) < 0.01 or audio.size < 2:
        return audio
    source = np.arange(audio.size, dtype=np.float64)
    target = np.arange(0, audio.size, rate, dtype=np.float64)
    return np.interp(target, source, audio).astype(np.float32)


def encode_wav(audio: np.ndarray, sample_rate: int) -> str:
    pcm = (normalize_audio(audio) * 32767.0).astype(np.int16)
    output = io.BytesIO()
    wavfile.write(output, sample_rate, pcm)
    return base64.b64encode(output.getvalue()).decode("ascii")


def main() -> None:
    log(f"loading model {MODEL_ID}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    model = AutoModelForTextToWaveform.from_pretrained(MODEL_ID)
    model.eval()
    sample_rate = int(getattr(model.config, "sampling_rate", 16000))
    log(f"ready model={MODEL_ID} sample_rate={sample_rate}")
    write_message({"type": "ready", "model": MODEL_ID, "sample_rate": sample_rate})

    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        request_id = None
        try:
            request = json.loads(line)
            request_id = str(request.get("id") or "")
            text = " ".join(str(request.get("text") or "").split()).strip()
            if not request_id:
                raise ValueError("request id is required")
            if not text:
                raise ValueError("text is required")
            if len(text) > MAX_TEXT_CHARS:
                raise ValueError(f"text exceeds {MAX_TEXT_CHARS} characters")
            rate = float(request.get("rate") or 1.0)
            inputs = tokenizer(text, return_tensors="pt")
            with torch.inference_mode():
                waveform = model(**inputs).waveform[0].detach().cpu().numpy()
            waveform = adjust_rate(waveform, rate)
            write_message(
                {
                    "id": request_id,
                    "audio_base64": encode_wav(waveform, sample_rate),
                    "content_type": "audio/wav",
                    "model": MODEL_ID,
                }
            )
        except Exception as exc:  # keep the worker alive for later requests
            log(traceback.format_exc())
            write_message({"id": request_id, "error": str(exc)})


if __name__ == "__main__":
    main()
