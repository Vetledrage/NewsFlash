#!/usr/bin/env bash
set -euo pipefail

# NewsFlash dev runner
# Starts the API and the Next.js web app.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

API_PORT="${API_PORT:-8080}"
WEB_PORT="${WEB_PORT:-3000}"
API_BASE_URL="${API_BASE_URL:-http://localhost:${API_PORT}}"

cd "$ROOT_DIR"

echo "==> Starting API on ${API_BASE_URL}"
./gradlew :apps:api:bootRun > /tmp/newsflash-api.log 2>&1 &
API_PID=$!

echo "    API PID: $API_PID (logs: /tmp/newsflash-api.log)"

echo "==> Waiting for API health..."
for i in {1..60}; do
  if curl -fsS "${API_BASE_URL}/actuator/health" >/dev/null 2>&1; then
    echo "    API is up."
    break
  fi
  sleep 1
  if ! kill -0 "$API_PID" >/dev/null 2>&1; then
    echo "API process exited. Tail of log:"
    tail -n 120 /tmp/newsflash-api.log || true
    exit 1
  fi
  if [[ "$i" == "60" ]]; then
    echo "Timed out waiting for API. Tail of log:"
    tail -n 120 /tmp/newsflash-api.log || true
    exit 1
  fi
done

echo "==> Starting web on http://localhost:${WEB_PORT} (proxying API_BASE_URL=${API_BASE_URL})"
cd "$ROOT_DIR/apps/web"

# Ensure .env.local exists with API_BASE_URL for Next proxy routes.
if [[ ! -f .env.local ]]; then
  cat > .env.local <<EOF
API_BASE_URL=${API_BASE_URL}
EOF
fi

npm install >/dev/null
npm run dev -- --port "${WEB_PORT}" &
WEB_PID=$!

echo "    Web PID: $WEB_PID"

echo "\n==> Dev is running"
echo "    Web: http://localhost:${WEB_PORT}"
echo "    API: ${API_BASE_URL}"

echo "\nPress Ctrl+C to stop both."

cleanup() {
  echo "\n==> Shutting down..."
  kill "$WEB_PID" >/dev/null 2>&1 || true
  kill "$API_PID" >/dev/null 2>&1 || true
}
trap cleanup INT TERM EXIT

wait

