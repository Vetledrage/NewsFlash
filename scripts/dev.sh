#!/usr/bin/env bash
# NewsFlash dev runner - Cross-platform compatible (Bash, WSL, Git Bash, etc.)
# Starts the API and the Next.js web app.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

API_PORT="${API_PORT:-8080}"
WEB_PORT="${WEB_PORT:-3000}"
API_BASE_URL="${API_BASE_URL:-http://localhost:${API_PORT}}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Utility function for colored output
log_info() {
  echo -e "${GREEN}==> $1${NC}"
}

log_error() {
  echo -e "${RED}ERROR: $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}WARNING: $1${NC}"
}

# Check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check dependencies
check_dependencies() {
  local missing=()

  if ! command_exists java; then
    missing+=("java (required for Spring Boot)")
  fi

  if ! command_exists npm; then
    missing+=("npm (required for Next.js)")
  fi

  if [[ ${#missing[@]} -gt 0 ]]; then
    log_error "Missing required dependencies:"
    for dep in "${missing[@]}"; do
      echo "  - $dep"
    done
    return 1
  fi

  return 0
}

# Check if port is in use
is_port_in_use() {
  local port=$1
  if command_exists lsof; then
    lsof -i ":$port" >/dev/null 2>&1
  elif command_exists netstat; then
    netstat -ano | grep ":$port" >/dev/null 2>&1
  else
    return 1
  fi
}

# Health check function (with fallback for systems without curl)
check_api_health() {
  local url="$1"

  # Try curl first
  if command_exists curl; then
    curl -fsS "$url" >/dev/null 2>&1
    return $?
  fi

  # Fallback: try with bash built-in /dev/tcp
  if [[ "$OSTYPE" != "msys" && "$OSTYPE" != "win32" && "$OSTYPE" != "cygwin" ]]; then
    exec 3<>/dev/tcp/localhost/$API_PORT >/dev/null 2>&1 && \
    echo -e "GET /actuator/health HTTP/1.1\r\nHost: localhost\r\n\r\n" >&3 && \
    grep -q "200\|UP" <&3 2>/dev/null
    local result=$?
    exec 3>&- 2>/dev/null || true
    return $result
  fi

  # Last resort: assume it's up (for Windows without curl)
  return 0
}

# Determine OS and set appropriate gradlew command
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  GRADLEW_CMD="./gradlew.bat"
  API_LOG="api.log"
else
  GRADLEW_CMD="./gradlew"
  API_LOG="/tmp/newsflash-api.log"
fi

cd "$ROOT_DIR"

<<<<<<< HEAD
port_in_use() {
  local port="$1"
  lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
}

pid_listening_on_port() {
  local port="$1"
  # Prints first PID found (if any)
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

cleanup() {
  echo -e "\n==> Shutting down..."

  if [[ -n "${WEB_PID}" ]]; then
    kill "$WEB_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "${API_PID}" ]]; then
    # First try: stop the Gradle bootRun wrapper.
    kill "$API_PID" >/dev/null 2>&1 || true
  fi

  # Second try: if something is still listening on the port, kill that PID.
  if port_in_use "$API_PORT"; then
    local pid
    pid="$(pid_listening_on_port "$API_PORT")"
    if [[ -n "${pid}" ]]; then
      echo "    Port ${API_PORT} still in use -> stopping pid ${pid}" >&2
      kill "$pid" >/dev/null 2>&1 || true
    fi
  fi

  # Best-effort verification
  if port_in_use "$API_PORT"; then
    local pid
    pid="$(pid_listening_on_port "$API_PORT")"
    echo "WARN: Port ${API_PORT} is still in use (pid=${pid:-unknown})." >&2
    echo "      You can inspect it with: lsof -nP -iTCP:${API_PORT} -sTCP:LISTEN" >&2
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

echo "==> Starting API on ${API_BASE_URL}"
./gradlew :apps:api:bootRun --args="--server.port=${API_PORT}" > /tmp/newsflash-api.log 2>&1 &
=======
# Check dependencies
log_info "Checking dependencies..."
if ! check_dependencies; then
  exit 1
fi

# Check ports
log_info "Checking if ports are available..."
if is_port_in_use "$API_PORT"; then
  log_warning "Port $API_PORT is already in use. Another service may be running."
fi
if is_port_in_use "$WEB_PORT"; then
  log_warning "Port $WEB_PORT is already in use. Another service may be running."
fi

log_info "Starting API on ${API_BASE_URL}"

# Start API in background
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  $GRADLEW_CMD :apps:api:bootRun > "$API_LOG" 2>&1 &
else
  $GRADLEW_CMD :apps:api:bootRun > "$API_LOG" 2>&1 &
fi

>>>>>>> 4486480ca652f8a187d79d4f485864d56f629462
API_PID=$!
echo "    API PID: $API_PID (logs: $API_LOG)"

log_info "Waiting for API health..."
READY=0
for i in {1..60}; do
  if check_api_health "${API_BASE_URL}/actuator/health"; then
    echo "    API is up."
    READY=1
    break
  fi

  sleep 1

  # Check if process is still running
  if ! kill -0 "$API_PID" 2>/dev/null; then
    log_error "API process exited unexpectedly."
    echo "Last 30 lines of API log:"
    tail -n 30 "$API_LOG" || true
    exit 1
  fi

  echo -ne "\r    Waiting... ($i/60)"
done

if [[ $READY -eq 0 ]]; then
  log_error "Timed out waiting for API (60 seconds)."
  echo "Last 30 lines of API log:"
  tail -n 30 "$API_LOG" || true
  kill "$API_PID" 2>/dev/null || true
  exit 1
fi

echo ""
log_info "Starting web on http://localhost:${WEB_PORT}"
cd "$ROOT_DIR/apps/web"

# Ensure .env.local exists with API_BASE_URL for Next proxy routes.
if [[ ! -f .env.local ]]; then
  log_info "Creating .env.local with API_BASE_URL..."
  cat > .env.local <<EOF
API_BASE_URL=${API_BASE_URL}
EOF
fi

<<<<<<< HEAD
require_npm

npm install >/dev/null
=======
log_info "Installing web dependencies..."
npm install --legacy-peer-deps >/dev/null 2>&1 || npm install >/dev/null 2>&1

log_info "Starting Next.js dev server..."
>>>>>>> 4486480ca652f8a187d79d4f485864d56f629462
npm run dev -- --port "${WEB_PORT}" &
WEB_PID=$!

echo "    Web PID: $WEB_PID"

<<<<<<< HEAD
echo -e "\n==> Dev is running"
echo "    Web: http://localhost:${WEB_PORT}"
echo "    API: ${API_BASE_URL}"

echo -e "\nPress Ctrl+C to stop both."
=======
echo ""
log_info "Dev is running"
echo "    Web: http://localhost:${WEB_PORT}"
echo "    API: ${API_BASE_URL}"
echo ""
echo "Press Ctrl+C to stop both."
echo ""

cleanup() {
  echo ""
  log_info "Shutting down..."
  kill "$WEB_PID" >/dev/null 2>&1 || true
  kill "$API_PID" >/dev/null 2>&1 || true
  echo "Done."
}

trap cleanup INT TERM EXIT
>>>>>>> 4486480ca652f8a187d79d4f485864d56f629462

wait

