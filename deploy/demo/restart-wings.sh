#!/bin/bash
# Ensure Wings data dirs are owned by the daemon user, then restart the container
# so it reloads config.yml. Uses the Docker Engine API (no docker CLI required).
set -euo pipefail

CONTAINER="${DEMO_WINGS_CONTAINER:-featherpanel_demo_wings}"
SOCK="${DOCKER_SOCK:-/var/run/docker.sock}"
WINGS_ROOT="${DEMO_WINGS_ROOT_PATH:-/var/lib/featherpanel-demo}"
WINGS_TMP="${DEMO_WINGS_TMP_PATH:-/tmp/featherpanel-demo-wings}"
WINGS_UID="${DEMO_WINGS_UID:-988}"
WINGS_GID="${DEMO_WINGS_GID:-988}"

log() {
	printf '[demo-wings-restart] %s\n' "$*"
}

mkdir -p \
	"${WINGS_ROOT}/volumes" \
	"${WINGS_ROOT}/archives" \
	"${WINGS_ROOT}/backups" \
	"${WINGS_ROOT}/diffs" \
	"${WINGS_TMP}"

# Wings drops to uid/gid 988 for filesystem work; keep the tree accessible.
chmod 755 "${WINGS_ROOT}" "${WINGS_ROOT}/volumes" "${WINGS_ROOT}/archives" "${WINGS_ROOT}/backups" "${WINGS_ROOT}/diffs" 2>/dev/null || true
if command -v chown >/dev/null 2>&1; then
	chown -R "${WINGS_UID}:${WINGS_GID}" "${WINGS_ROOT}" 2>/dev/null || true
	log "Ensured ${WINGS_ROOT} is owned by ${WINGS_UID}:${WINGS_GID}"
fi

if [ ! -S "$SOCK" ]; then
	log "WARNING: ${SOCK} not mounted; Wings will pick up config on next recreate."
	exit 0
fi

if [ ! -f /etc/featherpanel/config.yml ]; then
	log "WARNING: /etc/featherpanel/config.yml missing; skipping restart."
	exit 0
fi

log "Restarting ${CONTAINER} via Docker API..."
code="$(curl -sS -o /tmp/wings-restart.body -w '%{http_code}' \
	--unix-socket "$SOCK" \
	-X POST "http://localhost/containers/${CONTAINER}/restart?t=15" || true)"

if [ "$code" = "204" ] || [ "$code" = "200" ]; then
	log "Wings restarted (HTTP ${code})."
	exit 0
fi

log "WARNING: restart returned HTTP ${code}: $(cat /tmp/wings-restart.body 2>/dev/null || true)"
exit 0
