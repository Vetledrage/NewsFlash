#!/usr/bin/env bash
set -euo pipefail

# NewsFlash dev runner
# Starts the API and the Next.js web app.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

API_PORT="${API_PORT:-8080}"
WEB_PORT="${WEB_PORT:-3000}"
API_BASE_URL="${API_BASE_URL:-http://localhost:${API_PORT}}"

API_LOG="/tmp/newsflash-api.log"

cd "$ROOT_DIR"

port_in_use() {
  local port="$1"
  lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
}

pid_listening_on_port() {
  local port="$1"
  lsof -nP -t -iTCP:"${port}" -sTCP:LISTEN 2>/dev/null | head -n 1 || true
}

bootstrap_node() {
  # Some IDEs (e.g. WebStorm) provide Node/npm implicitly, while non-interactive shells may not.
  # Try common version managers if npm isn't already available.
  if command -v npm >/dev/null 2>&1; then
    return 0
  fi

  # nvm (common on macOS)
  if [[ -z "${NVM_DIR:-}" ]]; then
    export NVM_DIR="$HOME/.nvm"
  fi
  if [[ -s "${NVM_DIR}/nvm.sh" ]]; then
    # shellcheck disable=SC1090
    . "${NVM_DIR}/nvm.sh" >/dev/null 2>&1 || true
  fi

  # asdf
  if [[ -s "$HOME/.asdf/asdf.sh" ]]; then
    # shellcheck disable=SC1090
    . "$HOME/.asdf/asdf.sh" >/dev/null 2>&1 || true
  fi

  # volta
  if [[ -d "$HOME/.volta/bin" ]]; then
    export PATH="$HOME/.volta/bin:$PATH"
  fi
}

require_npm() {
  bootstrap_node
  if ! command -v npm >/dev/null 2>&1; then
    echo "ERROR: 'npm' not found in PATH." >&2
    echo "This is why dev.sh can work in WebStorm but fail in a terminal: the IDE may provide Node/npm, your shell might not." >&2
    echo >&2
    echo "Fix options:" >&2
    echo "  - Install Node.js (e.g. 'brew install node')" >&2
    echo "  - Or ensure your Node version manager is initialized for shells (nvm/asdf/volta)." >&2
    echo >&2
    echo "Debug:" >&2
    echo "  PATH=$PATH" >&2
    echo "  which node: $(command -v node || echo '<missing>')" >&2
    echo "  which npm:  $(command -v npm || echo '<missing>')" >&2
    return 1
  fi
}

API_PID=""
WEB_PID=""
CLEANED_UP=0

cleanup() {
  # Prevent running cleanup twice (INT triggers EXIT too)
  if [[ "${CLEANED_UP}" -eq 1 ]]; then
    return 0
  fi
  CLEANED_UP=1

  echo -e "\n==> Shutting down..."

  if [[ -n "${WEB_PID}" ]]; then
    kill "$WEB_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "${API_PID}" ]]; then
    # First try: stop the Gradle bootRun wrapper.
    kill "$API_PID" >/dev/null 2>&1 || true
  fi

  # If something is still listening on the web port, kill that PID.
  if port_in_use "$WEB_PORT"; then
    local wpid
    wpid="$(pid_listening_on_port "$WEB_PORT")"
    if [[ -n "${wpid}" ]]; then
      echo "    Port ${WEB_PORT} still in use -> stopping pid ${wpid}" >&2
      kill "$wpid" >/dev/null 2>&1 || true
    fi
  fi

  # If something is still listening on the API port, kill that PID.
  if port_in_use "$API_PORT"; then
    local pid
    pid="$(pid_listening_on_port "$API_PORT")"
    if [[ -n "${pid}" ]]; then
      echo "    Port ${API_PORT} still in use -> stopping pid ${pid}" >&2
      kill "$pid" >/dev/null 2>&1 || true

      # Give the process a moment to exit and release the port (avoid racey warnings)
      for _ in {1..10}; do
        if ! port_in_use "$API_PORT"; then
          break
        fi
        sleep 0.2
      done
    fi
  fi

  # Best-effort verification (warn only if still in use after grace period)
  if port_in_use "$API_PORT"; then
    local pid
    pid="$(pid_listening_on_port "$API_PORT")"
    echo "WARN: Port ${API_PORT} is still in use (pid=${pid:-unknown})." >&2
    echo "      You can inspect it with: lsof -nP -iTCP:${API_PORT} -sTCP:LISTEN" >&2
  fi
  if port_in_use "$WEB_PORT"; then
    local wpid
    wpid="$(pid_listening_on_port "$WEB_PORT")"
    echo "WARN: Port ${WEB_PORT} is still in use (pid=${wpid:-unknown})." >&2
    echo "      You can inspect it with: lsof -nP -iTCP:${WEB_PORT} -sTCP:LISTEN" >&2
  fi
}
trap cleanup INT TERM EXIT

if port_in_use "$API_PORT"; then
  pid="$(pid_listening_on_port "$API_PORT")"
  echo "ERROR: API_PORT=${API_PORT} is already in use (pid=${pid:-unknown})." >&2
  echo "This usually happens when a previous dev.sh/bootRun didn't shut down cleanly." >&2
  echo >&2
  echo "Fix options:" >&2
  echo "  1) Stop the process: kill ${pid:-<pid>}" >&2
  echo "  2) Or run with a different port: API_PORT=8081 ./scripts/dev.sh" >&2
  exit 1
fi

if port_in_use "$WEB_PORT"; then
  pid="$(pid_listening_on_port "$WEB_PORT")"
  echo "ERROR: WEB_PORT=${WEB_PORT} is already in use (pid=${pid:-unknown})." >&2
  echo "This usually happens when a previous Next.js dev server didn't shut down cleanly." >&2
  echo >&2
  echo "Fix options:" >&2
  echo "  1) Stop the process: kill ${pid:-<pid>}" >&2
  echo "  2) Or run with a different port: WEB_PORT=3001 ./scripts/dev.sh" >&2
  exit 1
fi

echo "==> Starting API on ${API_BASE_URL}"
./gradlew :apps:api:bootRun --args="--server.port=${API_PORT}" > "$API_LOG" 2>&1 &
API_PID=$!

echo "    API PID: $API_PID (logs: $API_LOG)"

echo "==> Waiting for API health..."
for i in {1..60}; do
  if curl -fsS "${API_BASE_URL}/actuator/health" >/dev/null 2>&1; then
    echo "    API is up."
    break
  fi
  sleep 1
  if ! kill -0 "$API_PID" >/dev/null 2>&1; then
    echo "API process exited. Tail of log:"
    tail -n 120 "$API_LOG" || true
    exit 1
  fi
  if [[ "$i" == "60" ]]; then
    echo "Timed out waiting for API. Tail of log:"
    tail -n 120 "$API_LOG" || true
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

require_npm

npm install >/dev/null

# Start Next.js directly so WEB_PID matches the actual server process.
npx --yes next dev --port "${WEB_PORT}" &
WEB_PID=$!

echo "    Web PID: $WEB_PID"

echo -e "\n==> Dev is running"
echo "    Web: http://localhost:${WEB_PORT}"
echo "    API: ${API_BASE_URL}"

echo -e "\nPress Ctrl+C to stop both."

wait

