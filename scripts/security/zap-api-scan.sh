#!/bin/sh
set -eu

BACKEND_BASE_URL="${ZAP_BACKEND_BASE_URL:-http://backend:8000}"
TARGET_OPENAPI_URL="${ZAP_TARGET_OPENAPI_URL:-${BACKEND_BASE_URL}/openapi.json}"
REPORT_DIR="${ZAP_REPORT_DIR:-/zap/wrk}"
REPORT_PREFIX="${ZAP_REPORT_PREFIX:-zap-api-report}"
CSRF_HEADER_NAME="${ZAP_CSRF_HEADER_NAME:-X-CSRF-Token}"
LOGIN_EMAIL="${ZAP_LOGIN_EMAIL:-sample@example.com}"
LOGIN_PASSWORD="${ZAP_LOGIN_PASSWORD:-SamplePassw0rd!}"
WAIT_TIMEOUT_SECONDS="${ZAP_WAIT_TIMEOUT_SECONDS:-120}"
WAIT_INTERVAL_SECONDS="${ZAP_WAIT_INTERVAL_SECONDS:-2}"

mkdir -p "$REPORT_DIR"
WORK_DIR="$(mktemp -d "${REPORT_DIR}/.zap-work.XXXXXX")"
COOKIE_JAR="${WORK_DIR}/cookies.txt"
LOGIN_RESPONSE="${WORK_DIR}/login-response.json"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "Waiting for backend health: ${BACKEND_BASE_URL}/api/health"
elapsed=0
until curl -fsS "${BACKEND_BASE_URL}/api/health" >/dev/null; do
  if [ "$elapsed" -ge "$WAIT_TIMEOUT_SECONDS" ]; then
    echo "Backend health check did not succeed within ${WAIT_TIMEOUT_SECONDS} seconds." >&2
    exit 1
  fi
  sleep "$WAIT_INTERVAL_SECONDS"
  elapsed=$((elapsed + WAIT_INTERVAL_SECONDS))
done

echo "Fetching CSRF token"
csrf_body="$(curl -fsS "${BACKEND_BASE_URL}/api/auth/csrf")"
csrf_token="$(printf '%s' "$csrf_body" | python3 -c 'import json,sys; print(json.load(sys.stdin)["csrf_token"])')"

login_payload="$(
  ZAP_LOGIN_EMAIL="$LOGIN_EMAIL" ZAP_LOGIN_PASSWORD="$LOGIN_PASSWORD" python3 -c 'import json,os; print(json.dumps({"email": os.environ["ZAP_LOGIN_EMAIL"], "password": os.environ["ZAP_LOGIN_PASSWORD"]}))'
)"

echo "Logging in sample user and storing HttpOnly cookies"
login_status="$(
  curl -sS \
    -o "$LOGIN_RESPONSE" \
    -w "%{http_code}" \
    -c "$COOKIE_JAR" \
    -H "Content-Type: application/json" \
    -H "${CSRF_HEADER_NAME}: ${csrf_token}" \
    -X POST \
    -d "$login_payload" \
    "${BACKEND_BASE_URL}/api/auth/login"
)"

if [ "$login_status" -lt 200 ] || [ "$login_status" -ge 300 ]; then
  echo "Login failed with HTTP ${login_status}." >&2
  cat "$LOGIN_RESPONSE" >&2
  exit 1
fi

cookie_header="$(
  awk '
    BEGIN { sep = "" }
    /^#HttpOnly_/ { sub(/^#HttpOnly_/, "", $1) }
    $0 !~ /^#/ && NF >= 7 {
      printf "%s%s=%s", sep, $6, $7
      sep = ";"
    }
  ' "$COOKIE_JAR"
)"

if [ -z "$cookie_header" ]; then
  echo "Login succeeded, but no cookies were saved to the cookie jar." >&2
  exit 1
fi

zap_options="-config replacer.full_list(0).description=KakeiboAuthCookie -config replacer.full_list(0).enabled=true -config replacer.full_list(0).matchtype=REQ_HEADER -config replacer.full_list(0).matchstr=Cookie -config replacer.full_list(0).regex=false -config replacer.full_list(0).replacement=${cookie_header} -config replacer.full_list(1).description=KakeiboCsrfHeader -config replacer.full_list(1).enabled=true -config replacer.full_list(1).matchtype=REQ_HEADER -config replacer.full_list(1).matchstr=${CSRF_HEADER_NAME} -config replacer.full_list(1).regex=false -config replacer.full_list(1).replacement=${csrf_token}"

html_report="${REPORT_DIR}/${REPORT_PREFIX}.html"
json_report="${REPORT_DIR}/${REPORT_PREFIX}.json"
md_report="${REPORT_DIR}/${REPORT_PREFIX}.md"

echo "Running ZAP API scan against ${TARGET_OPENAPI_URL}"
zap-api-scan.py \
  -t "$TARGET_OPENAPI_URL" \
  -f openapi \
  -r "$html_report" \
  -J "$json_report" \
  -w "$md_report" \
  -I \
  -z "$zap_options" \
  ${ZAP_SCAN_EXTRA_ARGS:-}

echo "ZAP reports:"
echo "  HTML: ${html_report}"
echo "  JSON: ${json_report}"
echo "  Markdown: ${md_report}"
