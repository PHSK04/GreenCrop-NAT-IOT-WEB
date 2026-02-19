# Web Smoke Test Script (GreenCrop NAT IOT)

ไฟล์นี้รวม:
- สคริปต์เทสแบบเร็ว (Smoke Test)
- คำอธิบายว่าแต่ละส่วนของโค้ดทำอะไร

## 1) สคริปต์พร้อมใช้

ไฟล์จริงอยู่ที่ `scripts/smoke_web_api.sh`

รัน:

```bash
bash scripts/smoke_web_api.sh
```

หรือกำหนดค่าเอง:

```bash
API_BASE=http://localhost:3001/api WEB_URL=http://localhost:5173 START_SERVER=1 bash scripts/smoke_web_api.sh
```

## 2) โค้ดสคริปต์

```bash
#!/usr/bin/env bash
set -euo pipefail

# Quick smoke test for GreenCrop NAT IOT web + API.
# Usage:
#   bash scripts/smoke_web_api.sh
# Optional env:
#   API_BASE=http://localhost:3001/api
#   WEB_URL=http://localhost:5173
#   START_SERVER=1

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE="${API_BASE:-http://localhost:3001/api}"
WEB_URL="${WEB_URL:-http://localhost:5173}"
START_SERVER="${START_SERVER:-1}"
WAIT_SECONDS="${WAIT_SECONDS:-20}"
TMP_DIR="${TMPDIR:-/tmp}/greencrop_smoke"
mkdir -p "$TMP_DIR"

SERVER_STARTED_BY_SCRIPT=0
SERVER_PID=""

pass_count=0
fail_count=0
warn_count=0

print_title() {
  printf "\n== %s ==\n" "$1"
}

pass() {
  pass_count=$((pass_count + 1))
  printf "[PASS] %s\n" "$1"
}

fail() {
  fail_count=$((fail_count + 1))
  printf "[FAIL] %s\n" "$1"
}

warn() {
  warn_count=$((warn_count + 1))
  printf "[WARN] %s\n" "$1"
}

cleanup() {
  if [[ "$SERVER_STARTED_BY_SCRIPT" -eq 1 && -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing command: $1"
    exit 1
  fi
}

is_api_up() {
  curl -fsS "$API_BASE/health" >/dev/null 2>&1
}

start_server_if_needed() {
  if is_api_up; then
    pass "API already running at $API_BASE"
    return
  fi

  if [[ "$START_SERVER" != "1" ]]; then
    fail "API is not running and START_SERVER is disabled"
    exit 1
  fi

  print_title "Starting API Server"
  (
    cd "$ROOT_DIR"
    nohup npm run server >"$TMP_DIR/server.log" 2>&1 &
    echo $! >"$TMP_DIR/server.pid"
  )

  SERVER_PID="$(cat "$TMP_DIR/server.pid")"
  SERVER_STARTED_BY_SCRIPT=1

  local i=0
  while [[ "$i" -lt "$WAIT_SECONDS" ]]; do
    if is_api_up; then
      pass "API started successfully (pid $SERVER_PID)"
      return
    fi
    sleep 1
    i=$((i + 1))
  done

  fail "API did not start within ${WAIT_SECONDS}s. Check $TMP_DIR/server.log"
  exit 1
}

# perform_request METHOD URL [JSON_BODY] [AUTH_TOKEN]
# sets:
#   HTTP_CODE
#   HTTP_BODY
perform_request() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local token="${4:-}"
  local out_file="$TMP_DIR/resp_$$.json"

  local -a curl_args
  curl_args=(-sS -X "$method" -o "$out_file" -w "%{http_code}" "$url")

  if [[ -n "$token" ]]; then
    curl_args+=(-H "Authorization: Bearer $token")
  fi

  if [[ -n "$body" ]]; then
    curl_args+=(-H "Content-Type: application/json" -d "$body")
  fi

  HTTP_CODE="$(curl "${curl_args[@]}" || true)"
  HTTP_BODY="$(cat "$out_file" 2>/dev/null || true)"
}

json_field() {
  local json="$1"
  local field_path="$2"
  printf '%s' "$json" | node -e '
const fs = require("fs");
const raw = fs.readFileSync(0, "utf8");
const path = process.argv[1].split(".");
try {
  let obj = JSON.parse(raw);
  for (const key of path) {
    if (obj == null) throw new Error("null");
    obj = obj[key];
  }
  process.stdout.write(obj == null ? "" : String(obj));
} catch {
  process.stdout.write("");
}
' "$field_path"
}

print_title "Preflight"
require_cmd curl
require_cmd node
require_cmd npm

start_server_if_needed

print_title "Smoke Test"

# 1) Web reachable (warning only; Vite may run separately)
if curl -fsS "$WEB_URL" >/dev/null 2>&1; then
  pass "Web reachable at $WEB_URL"
else
  warn "Web not reachable at $WEB_URL (run: npm run dev)"
fi

# 2) Health
perform_request "GET" "$API_BASE/health"
if [[ "$HTTP_CODE" == "200" ]]; then
  pass "GET /health returns 200"
else
  fail "GET /health expected 200, got $HTTP_CODE"
fi

# Test account
RAND="$(date +%s)"
TEST_NAME="Smoke User $RAND"
TEST_EMAIL="smoke_${RAND}@example.com"
TEST_PASSWORD="Smoke123!"

# 3) Register
REGISTER_BODY="$(printf '{"name":"%s","email":"%s","password":"%s","phone":"0812345678"}' "$TEST_NAME" "$TEST_EMAIL" "$TEST_PASSWORD")"
perform_request "POST" "$API_BASE/register" "$REGISTER_BODY"
if [[ "$HTTP_CODE" == "200" ]]; then
  pass "POST /register success ($TEST_EMAIL)"
else
  fail "POST /register expected 200, got $HTTP_CODE | body: $HTTP_BODY"
fi

# 4) Login with wrong password
LOGIN_BAD_BODY="$(printf '{"email":"%s","password":"%s"}' "$TEST_EMAIL" "wrong-password")"
perform_request "POST" "$API_BASE/login" "$LOGIN_BAD_BODY"
if [[ "$HTTP_CODE" == "401" ]]; then
  pass "POST /login rejects invalid password (401)"
else
  fail "POST /login with bad password expected 401, got $HTTP_CODE | body: $HTTP_BODY"
fi

# 5) Login with correct password
LOGIN_OK_BODY="$(printf '{"email":"%s","password":"%s"}' "$TEST_EMAIL" "$TEST_PASSWORD")"
perform_request "POST" "$API_BASE/login" "$LOGIN_OK_BODY"
TOKEN="$(json_field "$HTTP_BODY" "token")"
USER_ID="$(json_field "$HTTP_BODY" "user.id")"

if [[ "$HTTP_CODE" == "200" && -n "$TOKEN" && -n "$USER_ID" ]]; then
  pass "POST /login success and token issued"
else
  fail "POST /login expected token + user.id, got $HTTP_CODE | body: $HTTP_BODY"
fi

# 6) Unauthorized access should fail
perform_request "GET" "$API_BASE/users"
if [[ "$HTTP_CODE" == "401" ]]; then
  pass "GET /users without token blocked (401)"
else
  fail "GET /users without token expected 401, got $HTTP_CODE"
fi

# 7) Authorized access should pass
perform_request "GET" "$API_BASE/users" "" "$TOKEN"
if [[ "$HTTP_CODE" == "200" ]]; then
  pass "GET /users with token success"
else
  fail "GET /users with token expected 200, got $HTTP_CODE | body: $HTTP_BODY"
fi

# 8) Logout
LOGOUT_BODY="$(printf '{"userId":"%s"}' "$USER_ID")"
perform_request "POST" "$API_BASE/logout" "$LOGOUT_BODY"
if [[ "$HTTP_CODE" == "200" ]]; then
  pass "POST /logout success"
else
  fail "POST /logout expected 200, got $HTTP_CODE | body: $HTTP_BODY"
fi

print_title "Result"
printf "PASS: %d | FAIL: %d | WARN: %d\n" "$pass_count" "$fail_count" "$warn_count"

if [[ "$fail_count" -gt 0 ]]; then
  exit 1
fi
```

## 3) อธิบายโค้ด: แต่ละส่วนทำอะไร

1. `set -euo pipefail`  
หยุดสคริปต์ทันทีเมื่อมี error, กันตัวแปรว่าง, และกัน error ใน pipeline หลุดรอด

2. ตัวแปร config (`API_BASE`, `WEB_URL`, `START_SERVER`, `WAIT_SECONDS`)  
ปรับค่า endpoint/พฤติกรรมได้โดยไม่ต้องแก้โค้ดในสคริปต์

3. ฟังก์ชัน `pass/fail/warn`  
ใช้พิมพ์ผลทดสอบและนับจำนวนผลลัพธ์

4. `cleanup` + `trap cleanup EXIT`  
ถ้าสคริปต์เป็นคนเปิด server เอง จะสั่งปิดให้อัตโนมัติเมื่อจบงาน

5. `require_cmd`  
เช็กว่าเครื่องมี `curl`, `node`, `npm` ก่อนเริ่มเทส

6. `is_api_up`  
เช็กว่า API ตอบ `/health` ได้หรือยัง

7. `start_server_if_needed`  
ถ้า API ยังไม่ขึ้น จะรัน `npm run server` ให้เอง แล้วรอจน API พร้อมใช้งาน

8. `perform_request`  
เป็น helper กลางสำหรับยิง HTTP request แล้วเก็บ `HTTP_CODE` กับ `HTTP_BODY`

9. `json_field`  
ใช้ `node -e` อ่าน JSON แล้วดึงค่าตาม path เช่น `token`, `user.id`

10. ชุดทดสอบหลัก (Smoke Test)  
- เช็กเว็บหน้าแรก (ถ้าไม่ขึ้นจะเตือน ไม่ fail ทันที)  
- เช็ก `/health`  
- สมัครผู้ใช้ใหม่ (`/register`)  
- ล็อกอินผิดต้องได้ `401`  
- ล็อกอินถูกต้องต้องได้ token  
- `/users` แบบไม่มี token ต้องโดนบล็อก `401`  
- `/users` แบบมี token ต้องเข้าได้  
- logout สำเร็จ

11. สรุปผลท้ายสคริปต์  
แสดงจำนวน `PASS/FAIL/WARN` และคืน exit code `1` ถ้ามี fail

## 4) หมายเหตุสำคัญ

- สคริปต์นี้เป็น **Smoke Test** (เช็กเร็ว) ไม่ใช่ E2E เต็มระบบ
- สำหรับ UI รายละเอียด (Responsive, Layout, Permission หน้าเมนู) ยังต้องเช็กใน browser เพิ่ม
