#!/bin/bash
# Restores the demo to its golden snapshot on a fixed interval.
set -euo pipefail

APP_ROOT="/var/www/html"
CLI="${APP_ROOT}/cli"
BACKUPS_DIR="${APP_ROOT}/storage/backups"
ATTACHMENTS_DIR="${APP_ROOT}/public/attachments"
GOLDEN_NAME="${DEMO_GOLDEN_SNAPSHOT:-demo-golden.fpb}"
GOLDEN_PATH="${BACKUPS_DIR}/${GOLDEN_NAME}"
INTERVAL="${DEMO_RESET_INTERVAL_SECONDS:-1800}"

log() {
	printf '[demo-reset] %s\n' "$*"
}

wait_for_panel() {
	local attempt=0
	local max_attempts=90

	while [ "$attempt" -lt "$max_attempts" ]; do
		if [ -f "${APP_ROOT}/storage/config/.env" ] && php "$CLI" help >/dev/null 2>&1; then
			return 0
		fi
		attempt=$((attempt + 1))
		sleep 5
	done

	log "ERROR: panel CLI did not become ready in time."
	exit 1
}

flush_redis() {
	log "Flushing Redis cache..."
	php -r '
$host = getenv("REDIS_HOST") ?: "redis";
$password = getenv("REDIS_PASSWORD") ?: "";
$redis = new Redis();
$redis->connect($host, 6379, 2.0);
if ($password !== "") {
	$redis->auth($password);
}
$redis->flushAll();
echo "Redis flushed\n";
' || log "WARNING: Redis flush failed (continuing)."
}

clear_attachments() {
	log "Clearing uploaded attachments..."
	if [ -d "$ATTACHMENTS_DIR" ]; then
		find "$ATTACHMENTS_DIR" -mindepth 1 ! -name '.gitkeep' -delete 2>/dev/null || true
	fi
}

restore_golden_snapshot() {
	if [ ! -f "$GOLDEN_PATH" ]; then
		log "Golden snapshot missing; running bootstrap..."
		/bin/bash /demo/bootstrap.sh
	fi

	if [ ! -f "$GOLDEN_PATH" ]; then
		log "ERROR: golden snapshot still missing after bootstrap."
		return 1
	fi

	log "Restoring database from ${GOLDEN_NAME}..."
	if php "$CLI" snapshots restore "$GOLDEN_NAME" -y >/dev/null 2>&1; then
		log "Database restored."
	else
		log "ERROR: database restore failed."
		return 1
	fi

	php "$CLI" saas setsetting app_demo_yes true >/dev/null 2>&1 || true
	/bin/bash /demo/wings-reset.sh
	DEMO_WINGS_CONFIG_PATH=/etc/featherpanel/config.yml php /demo/write-wings-config.php
	flush_redis
	clear_attachments
	log "Demo reset complete. Next reset in ${INTERVAL}s."
}

log "FeatherPanel demo reset service starting (interval: ${INTERVAL}s)."
wait_for_panel
/bin/bash /demo/bootstrap.sh

while true; do
	sleep "$INTERVAL"
	restore_golden_snapshot || log "Reset failed; will retry next cycle."
done
