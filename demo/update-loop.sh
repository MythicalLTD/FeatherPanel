#!/bin/sh
# Pulls latest :dev images and recreates the demo stack on a schedule.
set -eu

INTERVAL="${DEMO_UPDATE_INTERVAL_SECONDS:-3600}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.demo.yml}"

log() {
	printf '[demo-updater] %s\n' "$*"
}

log "FeatherPanel demo updater starting (interval: ${INTERVAL}s, compose: ${COMPOSE_FILE})."

while true; do
	sleep "$INTERVAL"

	log "Pulling latest images..."
	if docker compose -f "$COMPOSE_FILE" pull; then
		log "Recreating stack with latest images..."
		docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
		docker image prune -f >/dev/null 2>&1 || true
		log "Update cycle finished."
	else
		log "WARNING: image pull failed; keeping current stack."
	fi
done
