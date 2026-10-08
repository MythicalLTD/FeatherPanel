#!/bin/sh
# Pulls latest :dev / daemon images and recreates the demo stack on a schedule.
# Prunes unused images/containers/build cache so the demo VM does not fill the disk.
#
# IMPORTANT: never include demo-updater in `compose up`. Recreating this container
# from inside itself SIGKILLs the loop (exit 137) mid-recreate and leaves
# demo-reset / async-runner intentionally stopped (unless-stopped will not revive them).
set -eu

INTERVAL="${DEMO_UPDATE_INTERVAL_SECONDS:-3600}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

log() {
	printf '[demo-updater] %s\n' "$*"
}

# Long-running services only. host-prep is one-shot (run --rm below).
# demo-updater must be omitted so we do not stop ourselves.
up_services() {
	docker compose -f "$COMPOSE_FILE" config --services | while read -r svc; do
		case "$svc" in
			demo-updater|host-prep) ;;
			*) printf '%s\n' "$svc" ;;
		esac
	done
}

prune_disk() {
	log "Pruning unused Docker data..."
	# Dangling + unused images not referenced by a running container
	docker image prune -af >/dev/null 2>&1 || true
	docker container prune -f >/dev/null 2>&1 || true
	docker network prune -f >/dev/null 2>&1 || true
	docker builder prune -af >/dev/null 2>&1 || true
	# Keep named volumes (DB / golden snapshot) — never prune -a volumes
	docker volume prune -f >/dev/null 2>&1 || true
}

log "FeatherPanel demo updater starting (interval: ${INTERVAL}s)."

# First cycle after a short delay so initial seed can finish.
sleep 120

while true; do
	log "Pulling latest images (panel :dev, wings :latest, quilld :main)..."
	if docker compose -f "$COMPOSE_FILE" pull; then
		log "Recreating stack with latest images (excluding demo-updater)..."
		docker compose -f "$COMPOSE_FILE" run --rm --no-deps host-prep >/dev/null 2>&1 || true
		# shellcheck disable=SC2046
		docker compose -f "$COMPOSE_FILE" up -d --remove-orphans $(up_services)
		prune_disk
		log "Update cycle finished."
	else
		log "WARNING: image pull failed; keeping current stack."
		prune_disk
	fi

	sleep "$INTERVAL"
done
