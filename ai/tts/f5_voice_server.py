"""Small protected HTTP service for the local Thai F5-TTS voice clone."""

from __future__ import annotations

import io
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
import soundfile as sf
from f5_tts_th.tts import TTS


HOST = os.getenv("NAT_AI_F5_HOST", "0.0.0.0")
PORT = int(os.getenv("NAT_AI_F5_PORT", "3012"))
TOKEN = os.getenv("NAT_AI_F5_TOKEN", "")
REFERENCE_WAV = os.environ["NAT_AI_F5_REFERENCE_WAV"]
REFERENCE_TEXT = os.environ["NAT_AI_F5_REFERENCE_TEXT"]
MAX_TEXT_CHARS = int(os.getenv("NAT_AI_TTS_MAX_TEXT_CHARS", "1200"))

MODEL = TTS(model=os.getenv("NAT_AI_F5_MODEL", "v1"))


class Handler(BaseHTTPRequestHandler):
    server_version = "NATF5/1.0"

    def send_json(self, status: int, payload: dict) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        if self.path != "/health":
            return self.send_json(404, {"error": "Not found"})
        self.send_json(200, {"ok": True, "engine": "f5-th", "voice_clone": True})

    def do_POST(self) -> None:
        if self.path != "/synthesize":
            return self.send_json(404, {"error": "Not found"})
        if TOKEN and self.headers.get("X-NAT-TTS-Token", "") != TOKEN:
            return self.send_json(401, {"error": "Unauthorized"})
        try:
            length = min(int(self.headers.get("Content-Length", "0")), 32_768)
            payload = json.loads(self.rfile.read(length))
            text = " ".join(str(payload.get("text", "")).split()).strip()
            if not text or len(text) > MAX_TEXT_CHARS:
                return self.send_json(400, {"error": "Invalid text"})
            rate = max(0.75, min(1.25, float(payload.get("rate", 0.92))))
            waveform = MODEL.infer(
                ref_audio=REFERENCE_WAV,
                ref_text=REFERENCE_TEXT,
                gen_text=text,
                step=32,
                cfg=2.0,
                speed=rate,
            )
            values = np.asarray(waveform, dtype=np.float32)
            peak = float(np.max(np.abs(values))) if values.size else 0.0
            if peak > 0.89:
                values = values * (0.89 / peak)
            output = io.BytesIO()
            sf.write(output, values, 24000, format="WAV", subtype="PCM_16")
            audio = output.getvalue()
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(audio)))
            self.send_header("X-NAT-AI-Voice-Model", "VIZINTZOR/F5-TTS-THAI")
            self.end_headers()
            self.wfile.write(audio)
        except Exception as exc:
            self.send_json(500, {"error": str(exc)})

    def log_message(self, fmt: str, *args) -> None:
        print(f"[f5-voice] {self.address_string()} {fmt % args}", flush=True)


if __name__ == "__main__":
    if not TOKEN:
        raise SystemExit("NAT_AI_F5_TOKEN is required")
    print(f"[f5-voice] ready on {HOST}:{PORT}", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
