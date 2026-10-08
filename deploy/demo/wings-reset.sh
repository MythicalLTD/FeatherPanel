#!/bin/bash
# Clears FeatherWings server data between demo reset cycles.
set -euo pipefail

WINGS_ROOT="${DEMO_WINGS_ROOT_PATH:-/var/lib/featherpanel}"
WINGS_DATA="${DEMO_WINGS_DATA_PATH:-${WINGS_ROOT}/volumes}"
WINGS_ARCHIVES="${DEMO_WINGS_ARCHIVES_PATH:-${WINGS_ROOT}/archives}"
WINGS_BACKUPS="${DEMO_WINGS_BACKUPS_PATH:-${WINGS_ROOT}/backups}"
WINGS_UID="${DEMO_WINGS_UID:-988}"
WINGS_GID="${DEMO_WINGS_GID:-988}"

log() {
	printf '[demo-wings-reset] %s\n' "$*"
}

clear_dir_contents() {
	local dir="$1"
	mkdir -p "$dir" 2>/dev/null || true
	if [ ! -d "$dir" ]; then
		return 0
	fi
	log "Clearing ${dir}..."
	find "$dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
}

mkdir -p "$WINGS_ROOT" "$WINGS_DATA" "$WINGS_ARCHIVES" "$WINGS_BACKUPS"
clear_dir_contents "$WINGS_DATA"
clear_dir_contents "$WINGS_ARCHIVES"
clear_dir_contents "$WINGS_BACKUPS"

if command -v chown >/dev/null 2>&1; then
	chown -R "${WINGS_UID}:${WINGS_GID}" "$WINGS_ROOT" 2>/dev/null || true
fi

log "Wings data cleared."
