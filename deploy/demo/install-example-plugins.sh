#!/bin/bash
# Copy free example plugins into the panel addons directory and register them.
set -euo pipefail

SRC="${DEMO_EXAMPLE_PLUGINS_DIR:-/demo/example-plugins}"
DEST="${APP_ADDONS_DIR:-/var/www/html/storage/addons}"

log() { printf '[demo-plugins] %s\n' "$*"; }

if [ ! -d "$SRC" ]; then
	log "WARNING: example plugins dir missing: ${SRC}"
	exit 0
fi

mkdir -p "$DEST"

copied=0
for dir in "$SRC"/*/; do
	[ -d "$dir" ] || continue
	ident="$(basename "$dir")"
	if [ ! -f "${dir}/conf.yml" ]; then
		log "Skip ${ident} (no conf.yml)"
		continue
	fi
	rm -rf "${DEST}/${ident}"
	cp -a "$dir" "${DEST}/${ident}"
	copied=$((copied + 1))
	log "Installed example plugin: ${ident}"
done

log "Copied ${copied} example plugin(s) → ${DEST}"
exit 0
