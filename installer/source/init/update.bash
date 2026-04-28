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

step() {
    echo ""
    echo "======================================================================"
    echo " [SOURCE][UPDATE] $1"
    echo "======================================================================"
}

banner() {
    echo ""
    echo "######################################################################"
    echo "#                   FEATHERPANEL SOURCE PANEL UPDATE                 #"
    echo "######################################################################"
}

prompt_yes_no_default_no() {
    local prompt_text="$1"
    local reply=""
    if [ -t 0 ] || [ -r /dev/tty ]; then
        read -r -p "$prompt_text" reply </dev/tty
    fi
    if [[ "$reply" =~ ^[yY]([eE][sS])?$ ]]; then
        echo "true"
    else
        echo "false"
    fi
}

has_local_changes() {
    git -C "$PANEL_DIR" update-index -q --refresh || true
    if [ -n "$(git -C "$PANEL_DIR" status --porcelain)" ]; then
        return 0
    fi
    return 1
}

handle_local_changes_before_update() {
    if ! has_local_changes; then
        return 0
    fi

    step "Local changes detected in repository."
    echo "Changes detected locally; update will not continue automatically."
    echo "Please save/commit/stash your changes, or allow the updater to discard them."
    echo ""
    git -C "$PANEL_DIR" status --short || true
    echo ""

    if [ "$(prompt_yes_no_default_no "Discard ALL local changes and continue update? (y/n): ")" != "true" ]; then
        echo "Update cancelled. Please save your changes and rerun update."
        exit 1
    fi

    step "Discarding local changes..."
    git -C "$PANEL_DIR" reset --hard HEAD
    git -C "$PANEL_DIR" clean -fd
}

require_root() {
    if [ "${EUID:-$(id -u)}" -ne 0 ]; then
        echo "This script must be run as root." >&2
        exit 1
    fi
}

run_as_www_data() {
    local cmd="$1"
    bash -lc "$cmd"
}

run_frontend_with_nvm() {
    local cmd="$1"
    run_as_www_data "export NVM_DIR=\"/root/.nvm\" && [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\" && ${cmd}"
}

set_runtime_permissions() {
    step "Applying writable runtime permissions (www-data)..."
    mkdir -p \
        "${BACKEND_DIR}/storage/logs" \
        "${BACKEND_DIR}/storage/caches" \
        "${BACKEND_DIR}/storage/config" \
        "${BACKEND_DIR}/public/attachments" \
        "${BACKEND_DIR}/public/addons" \
        "${BACKEND_DIR}/public/components"

    chown -R www-data:www-data \
        "${BACKEND_DIR}/storage" \
        "${BACKEND_DIR}/public/attachments" \
        "${BACKEND_DIR}/public/addons" \
        "${BACKEND_DIR}/public/components"

    chmod -R u+rwX,g+rwX,o-rwx "${BACKEND_DIR}/storage"
    chown -R www-data:www-data /var/www/featherpanel/*
}

update_repo() {
    if [ ! -d "${PANEL_DIR}/.git" ]; then
        echo "Panel repository not found at ${PANEL_DIR}" >&2
        exit 1
    fi
    handle_local_changes_before_update
    git -C "$PANEL_DIR" fetch --all --prune
    if [ "$PANEL_GIT_REF_TYPE" = "tag" ]; then
        git -C "$PANEL_DIR" fetch --tags --force
        git -C "$PANEL_DIR" checkout -f "tags/$PANEL_GIT_REF"
    else
        git -C "$PANEL_DIR" checkout -f "$PANEL_GIT_REF" || git -C "$PANEL_DIR" checkout -f -B "$PANEL_GIT_REF" "origin/$PANEL_GIT_REF"
        git -C "$PANEL_DIR" reset --hard "origin/$PANEL_GIT_REF"
        git -C "$PANEL_DIR" clean -fd
    fi
}

update_backend() {
    step "Installing backend dependencies and running migrations..."
    COMPOSER_ALLOW_SUPERUSER=1 composer install --working-dir="$BACKEND_DIR" --no-interaction --prefer-dist
    run_as_www_data "cd '${PANEL_DIR}' && php app migrate"
}

update_frontend() {
    step "Installing frontend dependencies and building frontend..."
    run_frontend_with_nvm "cd '${FRONTEND_DIR}' && pnpm install --frozen-lockfile=false"
    run_frontend_with_nvm "cd '${FRONTEND_DIR}' && pnpm build"
}

update_runner() {
    step "Building async runner..."
    if command -v cargo >/dev/null 2>&1; then
        (cd "$RUNNER_DIR" && cargo build --release)
    elif [ -x "/root/.cargo/bin/cargo" ]; then
        (cd "$RUNNER_DIR" && /root/.cargo/bin/cargo build --release)
    else
        echo "cargo not found, skipping runner rebuild." >&2
    fi
}

restart_services() {
    step "Restarting services (runner, frontend, nginx)..."
    systemctl restart "$RUNNER_SERVICE_NAME" || true
    systemctl restart "$NEXT_SERVICE_NAME" || true
    nginx -t && systemctl restart nginx
}

main() {
    require_root
    banner
    step "Updating source repository..."
    update_repo
    chown -R root:root "$PANEL_DIR"
    set_runtime_permissions
    update_backend
    update_frontend
    update_runner
    restart_services
    step "Source update completed."
}

main "$@"
