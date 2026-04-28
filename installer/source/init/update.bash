#!/bin/bash

set -euo pipefail

PANEL_DIR="${PANEL_DIR:-/var/www/featherpanel}"
PANEL_GIT_REF_TYPE="${PANEL_GIT_REF_TYPE:-branch}"
PANEL_GIT_REF="${PANEL_GIT_REF:-main}"
BACKEND_DIR="${BACKEND_DIR:-${PANEL_DIR}/backend}"
FRONTEND_DIR="${FRONTEND_DIR:-${PANEL_DIR}/frontendv2}"
RUNNER_DIR="${RUNNER_DIR:-${PANEL_DIR}/runner}"

NEXT_SERVICE_NAME="${NEXT_SERVICE_NAME:-featherpanel-next}"
RUNNER_SERVICE_NAME="${RUNNER_SERVICE_NAME:-featherpanel-async-runner}"

require_root() {
    if [ "${EUID:-$(id -u)}" -ne 0 ]; then
        echo "This script must be run as root." >&2
        exit 1
    fi
}

run_as_www_data() {
    local cmd="$1"
    su -s /bin/bash -c "$cmd" www-data
}

update_repo() {
    if [ ! -d "${PANEL_DIR}/.git" ]; then
        echo "Panel repository not found at ${PANEL_DIR}" >&2
        exit 1
    fi
    git -C "$PANEL_DIR" fetch --all --prune
    if [ "$PANEL_GIT_REF_TYPE" = "tag" ]; then
        git -C "$PANEL_DIR" fetch --tags --force
        git -C "$PANEL_DIR" checkout "tags/$PANEL_GIT_REF"
    else
        git -C "$PANEL_DIR" checkout "$PANEL_GIT_REF"
        git -C "$PANEL_DIR" pull --ff-only origin "$PANEL_GIT_REF"
    fi
}

update_backend() {
    COMPOSER_ALLOW_SUPERUSER=1 composer install --working-dir="$BACKEND_DIR" --no-interaction --prefer-dist
    run_as_www_data "cd '${PANEL_DIR}' && php app migrate"
}

update_frontend() {
    run_as_www_data "cd '${FRONTEND_DIR}' && pnpm install --frozen-lockfile=false"
    run_as_www_data "cd '${FRONTEND_DIR}' && pnpm build"
}

update_runner() {
    if command -v cargo >/dev/null 2>&1; then
        (cd "$RUNNER_DIR" && cargo build --release)
    elif [ -x "/root/.cargo/bin/cargo" ]; then
        (cd "$RUNNER_DIR" && /root/.cargo/bin/cargo build --release)
    else
        echo "cargo not found, skipping runner rebuild." >&2
    fi
}

restart_services() {
    systemctl restart "$RUNNER_SERVICE_NAME" || true
    systemctl restart "$NEXT_SERVICE_NAME" || true
    nginx -t && systemctl restart nginx
}

main() {
    require_root
    update_repo
    chown -R www-data:www-data "$PANEL_DIR"
    update_backend
    update_frontend
    update_runner
    restart_services
}

main "$@"
