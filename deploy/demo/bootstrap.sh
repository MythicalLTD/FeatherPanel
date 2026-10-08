#!/bin/bash
# First-boot seed for the demo. Creates accounts, rich infrastructure, Wings/Quill
# configs, and the golden snapshot that reset-loop restores every cycle.
set -euo pipefail

APP_ROOT="/var/www/html"
CLI="${APP_ROOT}/cli"
BACKUPS_DIR="${APP_ROOT}/storage/backups"
GOLDEN_NAME="${DEMO_GOLDEN_SNAPSHOT:-demo-golden.fpb}"
GOLDEN_PATH="${BACKUPS_DIR}/${GOLDEN_NAME}"
MARKER="${BACKUPS_DIR}/.demo-bootstrapped"
SEED_VERSION="7"
VERSION_MARKER="${BACKUPS_DIR}/.demo-seed-version"

log() {
	printf '[demo-bootstrap] %s\n' "$*"
}

wait_for_panel() {
	local attempt=0
	local max_attempts=120

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

ensure_user() {
	local username="$1"
	local email="$2"
	local first_name="$3"
	local last_name="$4"
	local password="$5"
	local role_id="$6"

	if user_exists "$username"; then
		log "Syncing existing user: ${username} (email/role/password)"
		php "$CLI" saas updateuser "$username" email "$email" >/dev/null 2>&1 || true
		php "$CLI" saas updateuser "$username" role_id "$role_id" >/dev/null 2>&1 || true
		php "$CLI" saas resetpassword "$username" "$password" >/dev/null 2>&1 || true
		return 0
	fi

	log "Creating user: ${username} (role_id=${role_id})"
	if php "$CLI" saas createuser "$username" "$email" "$first_name" "$last_name" "$password" "$role_id"; then
		log "Created user: ${username}"
	else
		log "WARNING: could not create user ${username} (may already exist)."
		php "$CLI" saas resetpassword "$username" "$password" >/dev/null 2>&1 || true
	fi
}

ensure_users() {
	# Public demo credentials (both admins). Login accepts email or username.
	# Roles: 1=user, 2=support, 3=moderator, 4=admin
	ensure_user \
		"${DEMO_USER_USERNAME:-demo}" \
		"${DEMO_USER_EMAIL:-demo@demo.demo}" \
		"Demo" \
		"User" \
		"${DEMO_USER_PASSWORD:-demoPassword}" \
		"4"

	ensure_user \
		"${DEMO_ADMIN_USERNAME:-admin}" \
		"${DEMO_ADMIN_EMAIL:-admin@featherpanel.com}" \
		"Feather" \
		"Admin" \
		"${DEMO_ADMIN_PASSWORD:-admin@featherpanel.com}" \
		"4"

	# Extra role accounts for UI testing (same password as Account 1)
	ensure_user \
		"${DEMO_SUPPORT_USERNAME:-support}" \
		"support@demo.demo" \
		"Demo" \
		"Support" \
		"${DEMO_SUPPORT_PASSWORD:-demoPassword}" \
		"2"

	ensure_user \
		"${DEMO_MOD_USERNAME:-moderator}" \
		"moderator@demo.demo" \
		"Demo" \
		"Moderator" \
		"${DEMO_MOD_PASSWORD:-demoPassword}" \
		"3"
}

seed_demo_infrastructure() {
	log "Seeding locations, Wings, servers, FeatherQuill webspaces, fake Proxmox VMs..."
	php /demo/seed-infrastructure.php
	log "Seeding banned users, suspended servers, tickets, KPI clutter..."
	php /demo/seed-junk.php || log "WARNING: junk seed failed (continuing)."
}

write_daemon_configs() {
	log "Writing FeatherWings config..."
	DEMO_WINGS_CONFIG_PATH=/etc/featherpanel/config.yml php /demo/write-wings-config.php

	log "Writing FeatherQuilld config..."
	DEMO_QUILL_CONFIG_PATH=/etc/featherquilld/config.yml php /demo/write-quilld-config.php || \
		log "WARNING: FeatherQuilld config write failed (web node may be missing)."

	/bin/bash /demo/restart-wings.sh || true
	/bin/bash /demo/restart-quilld.sh || true
	# Give daemons a moment to load, then install + start game servers
	sleep 8
	/bin/bash /demo/start-demo-servers.sh || log "WARNING: demo server start failed (continuing)."
}

create_golden_snapshot() {
	mkdir -p "$BACKUPS_DIR"

	if [ -f "$GOLDEN_PATH" ] && [ "${DEMO_REBUILD_GOLDEN:-0}" != "1" ]; then
		if [ -f "$VERSION_MARKER" ] && [ "$(cat "$VERSION_MARKER")" = "$SEED_VERSION" ]; then
			log "Golden snapshot already exists: ${GOLDEN_NAME}"
			return 0
		fi
		log "Seed version changed — rebuilding golden snapshot..."
		rm -f "$GOLDEN_PATH"
	fi

	if [ "${DEMO_REBUILD_GOLDEN:-0}" = "1" ] && [ -f "$GOLDEN_PATH" ]; then
		log "DEMO_REBUILD_GOLDEN=1 — removing existing golden snapshot"
		rm -f "$GOLDEN_PATH"
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
	echo "$SEED_VERSION" >"$VERSION_MARKER"
	log "Golden snapshot saved as ${GOLDEN_NAME} (seed v${SEED_VERSION})"
}

print_credentials() {
	cat <<EOF

========================================
  FeatherPanel Demo ready
========================================
  Panel:  ${FEATHERPANEL_APP_URL:-http://localhost:8088}
  Wings:  http://${DEMO_WINGS_FQDN:-localhost}:${DEMO_WINGS_DAEMON_PORT:-8081}

  Account 1 (Admin):
    Email:    ${DEMO_USER_EMAIL:-demo@demo.demo}
    Password: ${DEMO_USER_PASSWORD:-demoPassword}

  Account 2 (Admin):
    Email:    ${DEMO_ADMIN_EMAIL:-admin@featherpanel.com}
    Password: ${DEMO_ADMIN_PASSWORD:-admin@featherpanel.com}

  Seeded: Wings + FeatherQuilld + fake Proxmox + banned users,
          suspended servers, tickets, KPI clutter.
========================================

EOF
}

main() {
	mkdir -p "$BACKUPS_DIR" /etc/featherpanel /etc/featherquilld

	local needs_full_seed=1
	if [ -f "$MARKER" ] && [ -f "$GOLDEN_PATH" ] && [ -f "$VERSION_MARKER" ] \
		&& [ "$(cat "$VERSION_MARKER")" = "$SEED_VERSION" ] \
		&& [ "${DEMO_REBUILD_GOLDEN:-0}" != "1" ]; then
		needs_full_seed=0
	fi

	wait_for_panel

	if [ "$needs_full_seed" -eq 0 ]; then
		if [ ! -f /etc/featherpanel/config.yml ]; then
			write_daemon_configs
		fi
		log "Demo already bootstrapped (seed v${SEED_VERSION})."
		return 0
	fi

	ensure_users
	seed_demo_infrastructure
	write_daemon_configs
	create_golden_snapshot

	date -u +"%Y-%m-%dT%H:%M:%SZ" >"$MARKER"
	print_credentials
	log "Bootstrap complete."
}

main "$@"
