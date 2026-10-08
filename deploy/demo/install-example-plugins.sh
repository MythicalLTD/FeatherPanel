#!/bin/bash
# Copy free example plugins into the panel addons directory and publish frontend Components.
set -euo pipefail

SRC="${DEMO_EXAMPLE_PLUGINS_DIR:-/demo/example-plugins}"
DEST="${APP_ADDONS_DIR:-/var/www/html/storage/addons}"
PUBLIC_COMPONENTS="${APP_PUBLIC_COMPONENTS_DIR:-/var/www/html/public/components}"

log() { printf '[demo-plugins] %s\n' "$*"; }

if [ ! -d "$SRC" ]; then
	log "WARNING: example plugins dir missing: ${SRC}"
	exit 0
fi

mkdir -p "$DEST" "$PUBLIC_COMPONENTS"

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

	# Expose Frontend/Components at /components/{identifier} (same as PluginsController install).
	comp_src="${DEST}/${ident}/Frontend/Components"
	if [ -d "$comp_src" ]; then
		link_path="${PUBLIC_COMPONENTS}/${ident}"
		rm -rf "$link_path"
		if ln -s "$comp_src" "$link_path" 2>/dev/null; then
			log "Linked components → /components/${ident}"
		else
			mkdir -p "$link_path"
			cp -a "${comp_src}/." "$link_path/"
			log "Copied components → /components/${ident}"
		fi
	fi
done

log "Copied ${copied} example plugin(s) → ${DEST}"
exit 0
