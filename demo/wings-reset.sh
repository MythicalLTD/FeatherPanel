#!/bin/bash
# Clears FeatherWings server data between demo reset cycles.
set -euo pipefail

WINGS_DATA="${DEMO_WINGS_DATA_PATH:-/var/lib/featherpanel/volumes}"
WINGS_ARCHIVES="${DEMO_WINGS_ARCHIVES_PATH:-/var/lib/featherpanel/archives}"
WINGS_BACKUPS="${DEMO_WINGS_BACKUPS_PATH:-/var/lib/featherpanel/backups}"

log() {
	printf '[demo-wings-reset] %s\n' "$*"
}

clear_dir_contents() {
	local dir="$1"
	if [ ! -d "$dir" ]; then
		return 0
	fi
	log "Clearing ${dir}..."
	find "$dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
}

clear_dir_contents "$WINGS_DATA"
clear_dir_contents "$WINGS_ARCHIVES"
clear_dir_contents "$WINGS_BACKUPS"
log "Wings data cleared."
