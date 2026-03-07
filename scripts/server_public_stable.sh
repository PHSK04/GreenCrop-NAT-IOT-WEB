#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${ROOT_DIR}/.runtime"
SERVER_LOG="${RUNTIME_DIR}/server.log"
TUNNEL_LOG="${RUNTIME_DIR}/tunnel.log"
TUNNEL_URL_FILE="${RUNTIME_DIR}/tunnel_url.txt"
SERVER_PID_FILE="${RUNTIME_DIR}/server.pid"
TUNNEL_PID_FILE="${RUNTIME_DIR}/tunnel.pid"

mkdir -p "${RUNTIME_DIR}"

cleanup() {
  if [[ -f "${TUNNEL_PID_FILE}" ]] && kill -0 "$(cat "${TUNNEL_PID_FILE}")" 2>/dev/null; then
    kill "$(cat "${TUNNEL_PID_FILE}")" 2>/dev/null || true
  fi
  if [[ -f "${SERVER_PID_FILE}" ]] && kill -0 "$(cat "${SERVER_PID_FILE}")" 2>/dev/null; then
    kill "$(cat "${SERVER_PID_FILE}")" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

# Clear stale process ids from previous runs
pkill -f "node server/server.js" 2>/dev/null || true
pkill -f "cloudflared tunnel --url http://localhost:3001" 2>/dev/null || true

echo "[stack] starting API server..."
(
  cd "${ROOT_DIR}"
  npm run server
) >"${SERVER_LOG}" 2>&1 &
SERVER_PID=$!
echo "${SERVER_PID}" > "${SERVER_PID_FILE}"

echo "[stack] waiting for API health..."
for i in {1..30}; do
  if curl -fsS http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "[stack] API ready on http://localhost:3001"
    break
  fi
  sleep 1
done

if ! curl -fsS http://localhost:3001/api/health >/dev/null 2>&1; then
  echo "[stack] API failed to start. Check: ${SERVER_LOG}"
  exit 1
fi

start_tunnel() {
  : > "${TUNNEL_LOG}"
  : > "${TUNNEL_URL_FILE}"

  (
    cd "${ROOT_DIR}"
    cloudflared tunnel --url http://localhost:3001
  ) > "${TUNNEL_LOG}" 2>&1 &

  TUNNEL_PID=$!
  echo "${TUNNEL_PID}" > "${TUNNEL_PID_FILE}"

  echo "[stack] waiting for Cloudflare tunnel URL..."
  for _ in {1..40}; do
    if grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "${TUNNEL_LOG}" | head -n1 > "${TUNNEL_URL_FILE}"; then
      if [[ -s "${TUNNEL_URL_FILE}" ]]; then
        break
      fi
    fi
    sleep 1
  done

  if [[ ! -s "${TUNNEL_URL_FILE}" ]]; then
    echo "[stack] tunnel URL not found. Check: ${TUNNEL_LOG}"
    return 1
  fi

  TUNNEL_URL="$(cat "${TUNNEL_URL_FILE}")"
  echo "[stack] tunnel: ${TUNNEL_URL}"
  echo "[stack] health: ${TUNNEL_URL}/api/health"
  return 0
}

if ! start_tunnel; then
  exit 1
fi

echo "[stack] running. press Ctrl+C to stop."
while true; do
  sleep 15

  if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
    echo "[stack] API process stopped unexpectedly. Check: ${SERVER_LOG}"
    exit 1
  fi

  TUNNEL_URL="$(cat "${TUNNEL_URL_FILE}" 2>/dev/null || true)"
  if [[ -z "${TUNNEL_URL}" ]] || ! curl -fsS "${TUNNEL_URL}/api/health" >/dev/null 2>&1; then
    echo "[stack] tunnel unhealthy. restarting tunnel..."
    if [[ -f "${TUNNEL_PID_FILE}" ]] && kill -0 "$(cat "${TUNNEL_PID_FILE}")" 2>/dev/null; then
      kill "$(cat "${TUNNEL_PID_FILE}")" 2>/dev/null || true
      sleep 1
    fi
    start_tunnel || true
  fi
done
