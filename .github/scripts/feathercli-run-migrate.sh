#!/usr/bin/env bash
set -euo pipefail
: "${DB_PORT:?}"
: "${FEATHERCLI_API_URL:?}"
: "${FEATHERCLI_BIN:=cli/dist/linux-x64/FeatherCli}"

if [ ! -x "$FEATHERCLI_BIN" ]; then
  echo "FeatherCli binary missing or not executable: $FEATHERCLI_BIN" >&2
  ls -la "$(dirname "$FEATHERCLI_BIN")" >&2 || true
  exit 1
fi

export FEATHERCLI_API_KEY
FEATHERCLI_API_KEY="$(cat /tmp/feathercli-api-key)"

echo "Running migrate with $FEATHERCLI_BIN on $(uname -m)"
"$FEATHERCLI_BIN" migrate \
  --sql-dump /tmp/panel.sql \
  --env-file /tmp/panel.env \
  --staging-db-host 127.0.0.1 \
  --staging-db-port "$DB_PORT" \
  --staging-db-user root \
  --staging-db-password '' \
  --confirm-blueprint \
  --confirm-migrate \
  --reset
