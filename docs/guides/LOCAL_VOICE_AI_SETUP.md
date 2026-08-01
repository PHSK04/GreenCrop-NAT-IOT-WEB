# Local Voice AI MVP

GreenCrop NAT keeps authentication, tenant isolation, tool authorization, confirmations, and audit logs in the Node backend. Audio/LLM/TTS can run locally; no cloud API secret belongs in `VITE_*` variables or browser code.

## Architecture

- Wake phrase: after one microphone permission gesture, the web UI continuously records short Opus/WebM windows with `MediaRecorder`, sends them to the authenticated local STT endpoint, and detects “เฮ้ Green” / “Hey Green” in the returned local transcript. Browser cloud Speech Recognition is not used.
- STT/VAD: `POST /api/ai/voice/local/transcribe` invokes `faster-whisper` with `vad_filter=True` through `ai/stt/local_transcribe.py`. It is disabled by default and accepts authenticated audio only. Silent windows return an empty transcript and do not wake the assistant.
- LLM: the existing NAT AI backend uses Ollama (`NAT_AI_OLLAMA_URL`, `NAT_AI_OLLAMA_MODEL`) for natural free-form Thai/English conversation. History comes from the authenticated user's current `ai_chat_session`, so short follow-ups retain context without mixing users. Keep OpenAI variables empty, `NAT_AI_OPENAI_GENERAL_ENABLED=false`, and `NAT_AI_PYTHON_ENABLED=false` to avoid the legacy fixed-intent controller.
- TTS: the existing local MMS Thai adapter remains the safe default. XTTS voice cloning is opt-in only after reviewing the code/model license for the intended use.
- Device tools: Ollama returns a schema-constrained proposal (`none`, `read_device_context`, or `control_device`); it never publishes MQTT itself. Context reads and MQTT commands re-check the logged-in user/device pairing on every request. Turning a system or pump on, and system shutdown, require a short-lived confirmation token bound to user, tenant, device, and action. Every route/read/prepare/execute operation is audited.

## Minimal setup (no model download during build)

1. Install normal project dependencies as documented in the root README.
2. Create a separate Python environment and install `ai/requirements-voice-local.txt` only on the machine that will run STT.
3. Allow faster-whisper to obtain the selected model explicitly, or pre-provision its cache offline. Start with `small` and CPU `int8`; models are intentionally not downloaded by this repository.
4. Install and run Ollama separately, pull a model you have reviewed, then configure `NAT_AI_OLLAMA_URL` and `NAT_AI_OLLAMA_MODEL`.
5. Copy the local voice variables from `server/.env.example`. Set `NAT_AI_LOCAL_STT_ENABLED=true` only after the Python environment and model are ready.

## Using your own voice

The current default MMS voice is not a clone. For an XTTS deployment:

1. Record 3–10 clean WAV samples in a quiet room, preferably 10–30 seconds each, mono, without music or echo. Read varied Thai sentences naturally.
2. Keep the samples outside `public/`, Git, backups shared with others, and browser-accessible directories. Voice samples are biometric-like personal data; obtain consent for every speaker.
3. Trim silence and reject clipped/noisy recordings. Point `NAT_AI_XTTS_SPEAKER_WAV` to the protected server-side reference WAV.
4. Install Coqui/XTTS in its own environment and review both repository and model terms before commercial use. The MVP exposes configuration/status but deliberately does not auto-install XTTS or download weights.
5. Test pronunciation and impersonation risk locally before enabling it for users. Provide a way for the speaker to revoke/delete samples.

## Browser limitations

- Microphone access requires HTTPS or localhost and a user permission gesture.
- The browser must support `MediaRecorder` and a codec accepted by the server-side FFmpeg stack used by faster-whisper. The UI prefers Opus/WebM, then WebM, then MP4.
- The safe fallback is typed chat. Hands-free mode turns off when microphone permission is denied or local capture is unsupported. STT failures retry automatically with capped backoff and show a degraded status.
- Background tabs and mobile power-saving may suspend continuous listening.

## Runtime and measurable targets

These are deployment targets, not guarantees: a 3.5-second wake capture should normally return its transcript within 2 seconds after upload; an active 5.5-second command should reach Ollama within 2 seconds after capture; first audible TTS should begin within 3 seconds after text is ready. Measure on the target machine. CPU-only small Whisper and 7B Ollama models may exceed these targets; GPU acceleration, sufficient RAM, and local wired/Wi-Fi latency materially affect results.

The page preserves the authenticated AI chat session/history already stored by the backend and resumes short follow-up context. Audio capture reconnects with capped backoff. TTS messages are queued; explicit stop clears the queue. Transcript recording pauses during TTS to prevent self-transcription, while a separate Web Audio energy monitor remains active for best-effort barge-in.

Web Audio now monitors the already-authorized microphone during TTS for sustained speech energy. It uses a 900 ms grace period and a conservative RMS threshold before cancelling playback and the queue. Browser `echoCancellation`, `noiseSuppression`, and `autoGainControl` are requested. This is best-effort acoustic barge-in: loud speakers, music, room echo, and browser DSP differences can still cause missed or false interruptions.

MQTT commands include a correlation ID and idempotency key. API state distinguishes `accepted`, `published`, `confirmed`, `rejected`, `timeout`, and `failed`. Firmware should acknowledge on `tenants/{tenant}/devices/{device}/acks` with the same `correlation_id`. Broker publication is not treated as hardware confirmation.

`GET /api/ai/voice/metrics` returns bounded in-memory p50/p95 latency aggregates for STT, local tool routing, TTS, and device publication. Raw audio is not stored by the metrics service or STT route.

## Knowledge sync

Grounded documentation retrieval reads only the explicit whitelist in `server/services/project_knowledge.js`. Add sanitized user-facing Markdown to that list; never add `.env`, credentials, raw source dumps, exports, or user records. Restart the server to rebuild the cache, or call `POST /api/admin/ai/knowledge/reindex` as an authenticated admin. Live account data is never placed in this index; it is fetched per request through JWT/tenant/device-authorized APIs.

## Deployment verification checklist

- Install faster-whisper and provision a reviewed STT model; verify the server can decode the browser's selected audio codec.
- Run Ollama and provision the configured Thai-capable model; test free-form follow-ups and structured tool JSON on the actual model version.
- Configure local MMS TTS, or install/review XTTS and provide a protected speaker WAV.
- Pair a test device to a non-admin user and verify another user receives HTTP 403 for its context/control APIs.
- Test MQTT command acknowledgement on real firmware. Publishing success only confirms broker acceptance, not physical actuation.
- Measure wake, STT, LLM, and TTS latency on the deployment hardware and tune capture/model sizes.

## Security checks

Do not add model credentials, MQTT passwords, speaker recordings, or private model files to client environment variables. A device command is never authorized by model output alone: the backend verifies JWT, tenant, user-device pairing, action allowlist, and confirmation proof immediately before MQTT publish.
