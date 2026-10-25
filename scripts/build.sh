#!/bin/bash
set -Eeuo pipefail
exec node "$(dirname "$0")/run-next.mjs" build "$@"
