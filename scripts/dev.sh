#!/usr/bin/env bash
# NewsFlash dev runner
# Usage: bash scripts/dev.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PORT="${API_PORT:-8080}"
WEB_PORT="${WEB_PORT:-3000}"

cd "$ROOT_DIR"
chmod +x ./gradlew

echo "==> Starting API on http://localhost:${API_PORT}"
./gradlew :apps:api:bootRun &
API_PID=$!

echo "==> Waiting for API to be ready..."
for i in $(seq 1 60); do
  if curl -fsS "http://localhost:${API_PORT}/actuator/health" >/dev/null 2>&1; then
    echo "==> API is up!"
    break
  fi
  sleep 2
  echo "    ...waiting ($((i*2))s)"
done

echo "==> Starting web on http://localhost:${WEB_PORT}"
cd "$ROOT_DIR/apps/web"
npm install --silent
npm run dev -- --port "${WEB_PORT}" &
WEB_PID=$!

echo ""
echo "========================================"
echo "  App is running!"
echo "  Web: http://localhost:${WEB_PORT}"
echo "  API: http://localhost:${API_PORT}"
echo "========================================"
echo "  Press Ctrl+C to stop"
echo ""

cleanup() {
  echo "==> Shutting down..."
  kill "$WEB_PID" 2>/dev/null || true
  kill "$API_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

wait

