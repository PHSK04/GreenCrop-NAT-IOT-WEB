# GreenCropNAT AI/ML Pipeline

This folder is for the real AI/ML layer that controls project intelligence.

## Runtime Controller

`ai/controller/nat_ai_controller.py` is the Python AI controller used by the Node
API before OpenAI fallback. It receives tenant-bound context from
`server/services/nat_ai_chat.js` and returns:

- `intent` — what the user is asking for
- `text` — the answer shown in NAT AI chat
- `risk` — machine severity, score, and reasons
- `actions` — safe action proposals that require confirmation before any real
  machine control

Run a quick local smoke test:

```bash
printf '{"context":{"user_message":"สถานะเครื่องเป็นไง","latest_sensor":{"ph_value":7.1,"ec_value":1.8,"temp_c":25,"pump1_on":false,"pump2_on":false,"locked":false,"red_on":false,"float_alarm":false,"ph_ok":true}}}' \
  | python3 ai/controller/nat_ai_controller.py
```

Backend config lives in `server/.env`:

```bash
NAT_AI_PYTHON_ENABLED=true
NAT_AI_PYTHON_BIN=python3
NAT_AI_PYTHON_SCRIPT=ai/controller/nat_ai_controller.py
NAT_AI_PYTHON_TIMEOUT_MS=2500
```

OpenAI is the generative layer for questions that should feel broad but still
agriculture-first. NAT AI can answer general questions, then connect the answer
back to farming, crop production, GreenCropNAT, IoT, water, nutrients, sensors,
or automation. The Python controller still answers deterministic machine, pump,
sensor, export, and safety questions first. General agriculture-first questions
are routed to OpenAI when these values are present in `server/.env`:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
OPENAI_MAX_OUTPUT_TOKENS=700
NAT_AI_OPENAI_GENERAL_ENABLED=true
```

If `OPENAI_API_KEY` is empty, NAT AI falls back to the local controller and
offline helper text. Project data must remain scoped to the authenticated
user/tenant; do not train or answer by mixing data from other accounts.

## Assistant Modes

The customer widget separates four roles:

- `NAT AI` — AI assistant for agriculture-first analysis using this account's
  GreenCrop context.
- `Chatbot` — rule/flow-based support bot for common issues. It does not call
  the AI model.
- `AI Agent` — action planner for safe next steps such as inspection, export
  preparation, handoff, or machine-control preparation. Any action that can
  affect hardware must require explicit confirmation before execution.
- `Staff` — human support chat.

## Data Scope

Training data must always come from `/api/ai/sensor-learning/me`.

That API is authenticated and tenant-bound:

- It reads only rows where `tenant_id` matches the logged-in user's tenant context.
- It does not trust a frontend-supplied tenant id.
- Admin/global datasets should use a separate reviewed export flow.

## Install

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r ai/requirements.txt
```

## Train

Export the JSON response from `/api/ai/sensor-learning/me`, then run:

```bash
python ai/training/train_sensor_model.py --input ai/exports/my-samples.json --output-dir ai/models
```

The script trains with scikit-learn when available. If those packages are not installed yet, it writes a baseline model so the pipeline can still be tested.

## Why scikit-learn First

Sensor readings are structured table data, so `pandas`, `numpy`, and `scikit-learn` are the best first step. PyTorch or TensorFlow can be added later when the project has enough historical samples for deeper time-series models.
