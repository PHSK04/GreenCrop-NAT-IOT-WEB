#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${ROOT_DIR}/.runtime"
TUNNEL_URL_FILE="${RUNTIME_DIR}/tunnel_url.txt"
WORKFLOW_FILE="${ROOT_DIR}/.github/workflows/deploy-pages.yml"
STACK_SCRIPT="${ROOT_DIR}/scripts/server_public_stable.sh"

mkdir -p "${RUNTIME_DIR}"

publish_url() {
  local tunnel_url="$1"
  local api_url="${tunnel_url%/}/api"
  local before_hash
  local after_hash

  before_hash="$(shasum "${WORKFLOW_FILE}" | awk '{print $1}')"

  perl -0777 -i -pe "s#(VITE_API_URL:\\s*\\$\\{\\{\\s*secrets\\.VITE_API_URL\\s*\\|\\|\\s*')[^']+(' \\}\\})#\\1${api_url}\\2#g" "${WORKFLOW_FILE}"

  after_hash="$(shasum "${WORKFLOW_FILE}" | awk '{print $1}')"
  if [[ "${before_hash}" == "${after_hash}" ]]; then
    echo "[auto-deploy] URL unchanged in workflow: ${api_url}"
    return 0
  fi

  cd "${ROOT_DIR}"
  git add "${WORKFLOW_FILE}"
  git commit -m "chore(auto): rotate tunnel API URL to ${api_url}" >/dev/null
  git push origin main
  echo "[auto-deploy] deployed URL: ${api_url}"
}

echo "[auto-deploy] starting stable public stack..."
bash "${STACK_SCRIPT}" &
STACK_PID=$!

cleanup() {
  if kill -0 "${STACK_PID}" 2>/dev/null; then
    kill "${STACK_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "[auto-deploy] waiting for tunnel URL..."
for _ in {1..60}; do
  if [[ -s "${TUNNEL_URL_FILE}" ]]; then
    break
  fi
  sleep 1
done

if [[ ! -s "${TUNNEL_URL_FILE}" ]]; then
  echo "[auto-deploy] tunnel URL not found at ${TUNNEL_URL_FILE}"
  exit 1
fi

last_url="$(cat "${TUNNEL_URL_FILE}")"
publish_url "${last_url}"

echo "[auto-deploy] watching tunnel URL changes..."
while true; do
  sleep 20
  if ! kill -0 "${STACK_PID}" 2>/dev/null; then
    echo "[auto-deploy] stack stopped."
    exit 1
  fi
  if [[ -s "${TUNNEL_URL_FILE}" ]]; then
    current_url="$(cat "${TUNNEL_URL_FILE}")"
    if [[ "${current_url}" != "${last_url}" ]]; then
      echo "[auto-deploy] tunnel URL changed: ${current_url}"
      publish_url "${current_url}"
      last_url="${current_url}"
    fi
  fi
done
