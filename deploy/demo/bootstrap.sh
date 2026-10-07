#!/bin/bash
# First-boot seed for the public demo. Creates accounts, enables demo mode, and
# writes the golden snapshot that reset-loop restores every cycle.
set -euo pipefail

APP_ROOT="/var/www/html"
CLI="${APP_ROOT}/cli"
BACKUPS_DIR="${APP_ROOT}/storage/backups"
GOLDEN_NAME="${DEMO_GOLDEN_SNAPSHOT:-demo-golden.fpb}"
GOLDEN_PATH="${BACKUPS_DIR}/${GOLDEN_NAME}"
MARKER="${BACKUPS_DIR}/.demo-bootstrapped"

log() {
	printf '[demo-bootstrap] %s\n' "$*"
}

wait_for_panel() {
	local attempt=0
	local max_attempts=90

	log "Waiting for panel CLI..."
	while [ "$attempt" -lt "$max_attempts" ]; do
		if [ -f "${APP_ROOT}/storage/config/.env" ] && php "$CLI" help >/dev/null 2>&1; then
			log "Panel CLI is ready."
			return 0
		fi
		attempt=$((attempt + 1))
		sleep 5
	done

	log "ERROR: panel CLI did not become ready in time."
	exit 1
}

user_exists() {
	local username="$1"
	php "$CLI" saas userinfo "$username" 2>/dev/null | grep -qi 'username' || return 1
}

create_user_if_missing() {
	local username="$1"
	local email="$2"
	local first_name="$3"
	local last_name="$4"
	local password="$5"
	local role_id="$6"

	if user_exists "$username"; then
		log "User already exists: ${username}"
		return 0
	fi

	log "Creating user: ${username}"
	if php "$CLI" saas createuser "$username" "$email" "$first_name" "$last_name" "$password" "$role_id" >/dev/null 2>&1; then
		log "Created user: ${username}"
	else
		log "WARNING: could not create user ${username} (may already exist)."
	fi
}

apply_demo_settings() {
	log "Applying demo settings..."

	php "$CLI" saas setsetting app_demo_yes true >/dev/null 2>&1 || true
	php "$CLI" saas setsetting app_name "FeatherPanel Demo" >/dev/null 2>&1 || true
	php "$CLI" saas setsetting registration_enabled false >/dev/null 2>&1 || true

	if [ -n "${FEATHERPANEL_APP_URL:-}" ]; then
		php "$CLI" saas setsetting app_url "${FEATHERPANEL_APP_URL}" >/dev/null 2>&1 || true
	fi
}

seed_demo_infrastructure() {
	log "Seeding demo location, Wings node, allocations, realm, and spell..."
	php /demo/seed-infrastructure.php
}

write_wings_config() {
	log "Writing FeatherWings config..."
	DEMO_WINGS_CONFIG_PATH=/etc/featherpanel/config.yml php /demo/write-wings-config.php
}

create_golden_snapshot() {
	mkdir -p "$BACKUPS_DIR"

	if [ -f "$GOLDEN_PATH" ]; then
		log "Golden snapshot already exists: ${GOLDEN_NAME}"
		return 0
	fi

	log "Creating golden snapshot..."
	php "$CLI" snapshots create >/dev/null 2>&1

	local latest
	latest="$(ls -t "${BACKUPS_DIR}"/*.fpb 2>/dev/null | head -1 || true)"
	if [ -z "$latest" ]; then
		log "ERROR: snapshot create did not produce a .fpb file."
		exit 1
	fi

	cp "$latest" "$GOLDEN_PATH"
	log "Golden snapshot saved as ${GOLDEN_NAME}"
}

main() {
	if [ -f "$MARKER" ] && [ -f "$GOLDEN_PATH" ]; then
		if [ ! -f /etc/featherpanel/config.yml ]; then
			write_wings_config
		fi
		log "Demo already bootstrapped."
		return 0
	fi

	wait_for_panel

	create_user_if_missing \
		"${DEMO_ADMIN_USERNAME:-admin}" \
		"admin@demo.featherpanel.local" \
		"Demo" \
		"Admin" \
		"${DEMO_ADMIN_PASSWORD:-FeatherPanelDemo!}" \
		"1"

	create_user_if_missing \
		"${DEMO_USER_USERNAME:-demo}" \
		"demo@demo.featherpanel.local" \
		"Demo" \
		"User" \
		"${DEMO_USER_PASSWORD:-FeatherPanelDemo!}" \
		"2"

	apply_demo_settings
	seed_demo_infrastructure
	write_wings_config
	create_golden_snapshot

	date -u +"%Y-%m-%dT%H:%M:%SZ" >"$MARKER"
	log "Bootstrap complete."
}

main "$@"
