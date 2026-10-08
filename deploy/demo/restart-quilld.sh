#!/bin/bash
# Restart the FeatherQuilld container so it reloads config.yml.
set -euo pipefail

CONTAINER="${DEMO_QUILL_CONTAINER:-featherpanel_demo_quilld}"
SOCK="${DOCKER_SOCK:-/var/run/docker.sock}"

log() {
	printf '[demo-quill-restart] %s\n' "$*"
}

if [ ! -S "$SOCK" ]; then
	log "WARNING: ${SOCK} not mounted; Quilld will pick up config on next recreate."
	exit 0
fi

if [ ! -f /etc/featherquilld/config.yml ]; then
	log "WARNING: /etc/featherquilld/config.yml missing; skipping restart."
	exit 0
fi

log "Restarting ${CONTAINER} via Docker API..."
code="$(curl -sS -o /tmp/quill-restart.body -w '%{http_code}' \
	--unix-socket "$SOCK" \
	-X POST "http://localhost/containers/${CONTAINER}/restart?t=15" || true)"

if [ "$code" = "204" ] || [ "$code" = "200" ]; then
	log "Quilld restarted (HTTP ${code})."
	exit 0
fi

log "WARNING: restart returned HTTP ${code}: $(cat /tmp/quill-restart.body 2>/dev/null || true)"
exit 0
