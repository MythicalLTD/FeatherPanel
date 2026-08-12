#!/bin/bash
# One-shot setup for you + colleagues (any PHP Tools extension version).
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "$DIR/team.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$DIR/team.env"
  set +a
  echo "Loaded $DIR/team.env"
fi

echo "=== PHP Tools license dev setup ==="
node "$DIR/patch-license-bypass.mjs" "$@"

if [[ "${1:-}" == "--patch-only" ]]; then
  exit 0
fi

if command -v lsof >/dev/null 2>&1 && lsof -i ":${PORT:-3847}" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Mock server already listening on port ${PORT:-3847}"
else
  echo "Starting license mock on ${HOST:-127.0.0.1}:${PORT:-3847} …"
  nohup node "$DIR/license-mock-server.mjs" >"$DIR/license-mock.log" 2>&1 &
  echo "  PID $!  log: $DIR/license-mock.log"
fi

echo ""
echo "Next steps:"
echo "  1. Reload window in VS Code / Cursor"
echo "  2. Share this dev/ folder + team.env (API URL) with teammates"
echo "  3. Teammates run:  ./dev/setup.sh   (patches THEIR extension version)"
echo "  4. When done:      node dev/patch-license-bypass.mjs --unpatch"
