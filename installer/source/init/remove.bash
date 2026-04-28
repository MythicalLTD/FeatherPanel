#!/bin/bash

set -euo pipefail

PANEL_DIR="${PANEL_DIR:-/var/www/featherpanel}"
NEXT_SERVICE_NAME="${NEXT_SERVICE_NAME:-featherpanel-next}"
RUNNER_SERVICE_NAME="${RUNNER_SERVICE_NAME:-featherpanel-async-runner}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-FeatherPanel.conf}"
NGINX_SITE_AVAILABLE="/etc/nginx/sites-available/${NGINX_SITE_NAME}"
NGINX_SITE_ENABLED="/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"
CRON_FILE="${CRON_FILE:-/etc/cron.d/featherpanel}"

REMOVE_DATA="${REMOVE_DATA:-false}"

require_root() {
    if [ "${EUID:-$(id -u)}" -ne 0 ]; then
        echo "This script must be run as root." >&2
        exit 1
    fi
}

stop_disable_service() {
    local service="$1"
    if systemctl list-unit-files | rg -q "^${service}\\.service"; then
        systemctl stop "$service" || true
        systemctl disable "$service" || true
    fi
}

remove_services() {
    stop_disable_service "$NEXT_SERVICE_NAME"
    stop_disable_service "$RUNNER_SERVICE_NAME"

    rm -f "/etc/systemd/system/${NEXT_SERVICE_NAME}.service"
    rm -f "/etc/systemd/system/${RUNNER_SERVICE_NAME}.service"
    systemctl daemon-reload
}

remove_nginx() {
    rm -f "$NGINX_SITE_ENABLED"
    rm -f "$NGINX_SITE_AVAILABLE"
    if command -v nginx >/dev/null 2>&1; then
        nginx -t && systemctl restart nginx || true
    fi
}

remove_cron() {
    rm -f "$CRON_FILE"
}

remove_data_if_requested() {
    if [ "$REMOVE_DATA" = "true" ]; then
        rm -rf "$PANEL_DIR"
    fi
    rm -f "${PANEL_DIR}/.install_mode" "${PANEL_DIR}/.installed" 2>/dev/null || true
}

main() {
    require_root
    remove_services
    remove_nginx
    remove_cron
    remove_data_if_requested
}

main "$@"
