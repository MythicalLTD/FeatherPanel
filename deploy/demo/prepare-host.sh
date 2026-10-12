#!/bin/sh
# Deprecated: host-prep runs automatically via docker compose.
# Kept as a thin wrapper for manual debugging.
set -eu
cd "$(dirname "$0")"
docker compose run --rm --no-deps host-prep
