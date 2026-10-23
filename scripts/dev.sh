#!/bin/bash
set -Eeuo pipefail

PORT="${USER_PROJECT_PORT:-${PORT:-5001}}"
WORKSPACE_PATH="${WORKSPACE_PATH:-$(pwd)}"
NODE_ENV=development

cd "${WORKSPACE_PATH}"

kill_port() {
    local pids
    pids=$(ss -tlnp sport = :"${PORT}" 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true)
    if [ -n "${pids}" ]; then
        echo "Killing existing process on port ${PORT} (PIDs: ${pids})..."
        echo "${pids}" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

kill_port
echo "Starting dev server on port ${PORT}..."
npx next dev --port $PORT
