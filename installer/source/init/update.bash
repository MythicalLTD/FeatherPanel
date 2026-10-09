#!/bin/bash

set -euo pipefail

PANEL_DIR="${PANEL_DIR:-/var/www/featherpanel}"
PANEL_GIT_REF_TYPE="${PANEL_GIT_REF_TYPE:-branch}"
PANEL_GIT_REF="${PANEL_GIT_REF:-develop}"
BACKEND_DIR="${BACKEND_DIR:-${PANEL_DIR}/backend}"
FRONTEND_DIR="${FRONTEND_DIR:-${PANEL_DIR}/frontendv2}"
RUNNER_DIR="${RUNNER_DIR:-${PANEL_DIR}/runner}"

NEXT_SERVICE_NAME="${NEXT_SERVICE_NAME:-featherpanel-next}"
RUNNER_SERVICE_NAME="${RUNNER_SERVICE_NAME:-featherpanel-async-runner}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-FeatherPanel.conf}"
NGINX_SITE_FILE="${NGINX_SITE_FILE:-/etc/nginx/sites-available/${NGINX_SITE_NAME}}"

GIT_CLEAN_EXCLUDES=(
    -e 'backend/public/pma'
    -e 'backend/public/webmail'
    -e 'backend/public/attachments'
    -e 'backend/public/addons'
    -e 'backend/public/components'
    -e 'backend/storage/addons'
    -e 'backend/storage/data'
    -e 'backend/storage/config'
)

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
    preserve_runtime_dirs
    git -C "$PANEL_DIR" reset --hard HEAD
    # Keep runtime installs (phpMyAdmin, webmail, attachments, addons, components)
    git -C "$PANEL_DIR" clean -fd "${GIT_CLEAN_EXCLUDES[@]}"
    restore_runtime_dirs
}

preserve_runtime_dirs() {
    PMA_UPDATE_BACKUP=""
    WEBMAIL_UPDATE_BACKUP=""
    if [ -f "${BACKEND_DIR}/public/pma/index.php" ]; then
        PMA_UPDATE_BACKUP="$(mktemp -d /tmp/featherpanel-pma-XXXXXX)"
        cp -a "${BACKEND_DIR}/public/pma/." "${PMA_UPDATE_BACKUP}/"
        mkdir -p "${BACKEND_DIR}/storage/config"
        printf '%s\n' 'preserved' > "${BACKEND_DIR}/storage/config/phpmyadmin.installed"
    fi
    if [ -f "${BACKEND_DIR}/public/webmail/index.php" ]; then
        WEBMAIL_UPDATE_BACKUP="$(mktemp -d /tmp/featherpanel-webmail-XXXXXX)"
        cp -a "${BACKEND_DIR}/public/webmail/." "${WEBMAIL_UPDATE_BACKUP}/"
        mkdir -p "${BACKEND_DIR}/storage/config"
        printf '%s\n' 'preserved' > "${BACKEND_DIR}/storage/config/roundcube.installed"
    fi
}

restore_runtime_dirs() {
    if [ -n "${PMA_UPDATE_BACKUP:-}" ] && [ -d "${PMA_UPDATE_BACKUP}" ] && [ -f "${PMA_UPDATE_BACKUP}/index.php" ]; then
        mkdir -p "${BACKEND_DIR}/public/pma"
        if [ ! -f "${BACKEND_DIR}/public/pma/index.php" ]; then
            cp -a "${PMA_UPDATE_BACKUP}/." "${BACKEND_DIR}/public/pma/"
        fi
        rm -rf "${PMA_UPDATE_BACKUP}"
        PMA_UPDATE_BACKUP=""
    fi
    if [ -n "${WEBMAIL_UPDATE_BACKUP:-}" ] && [ -d "${WEBMAIL_UPDATE_BACKUP}" ] && [ -f "${WEBMAIL_UPDATE_BACKUP}/index.php" ]; then
        mkdir -p "${BACKEND_DIR}/public/webmail"
        if [ ! -f "${BACKEND_DIR}/public/webmail/index.php" ]; then
            cp -a "${WEBMAIL_UPDATE_BACKUP}/." "${BACKEND_DIR}/public/webmail/"
        fi
        rm -rf "${WEBMAIL_UPDATE_BACKUP}"
        WEBMAIL_UPDATE_BACKUP=""
    fi
}

require_root() {
    if [ "${EUID:-$(id -u)}" -ne 0 ]; then
        echo "This script must be run as root." >&2
        exit 1
    fi
}

run_as_www_data() {
    local cmd="$1"
    if command -v runuser >/dev/null 2>&1; then
        runuser -u www-data -- bash -lc "$cmd"
    elif command -v sudo >/dev/null 2>&1; then
        sudo -u www-data bash -lc "$cmd"
    else
        su -s /bin/bash www-data -c "$cmd"
    fi
}

run_frontend_with_nvm() {
    local cmd="$1"
    # NVM lives under /root — frontend build must run as root.
    bash -lc "export NVM_DIR=\"/root/.nvm\" && [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\" && ${cmd}"
}

set_runtime_permissions() {
    step "Applying writable runtime permissions (www-data)..."
    mkdir -p \
        "${BACKEND_DIR}/storage/logs" \
        "${BACKEND_DIR}/storage/caches" \
        "${BACKEND_DIR}/storage/config" \
        "${BACKEND_DIR}/public/attachments" \
        "${BACKEND_DIR}/public/addons" \
        "${BACKEND_DIR}/public/components" \
        "${BACKEND_DIR}/public/pma" \
        "${BACKEND_DIR}/public/webmail"

    chown -R www-data:www-data \
        "${BACKEND_DIR}/storage" \
        "${BACKEND_DIR}/public/attachments" \
        "${BACKEND_DIR}/public/addons" \
        "${BACKEND_DIR}/public/components" \
        "${BACKEND_DIR}/public/pma" \
        "${BACKEND_DIR}/public/webmail"

    chmod -R u+rwX,g+rwX,o-rwx "${BACKEND_DIR}/storage"
    chown -R www-data:www-data /var/www/featherpanel/*
}

update_repo() {
    if [ ! -d "${PANEL_DIR}/.git" ]; then
        echo "Panel repository not found at ${PANEL_DIR}" >&2
        exit 1
    fi
    handle_local_changes_before_update
    preserve_runtime_dirs
    git -C "$PANEL_DIR" fetch --all --prune
    if [ "$PANEL_GIT_REF_TYPE" = "tag" ]; then
        git -C "$PANEL_DIR" fetch --tags --force
        git -C "$PANEL_DIR" checkout -f "tags/$PANEL_GIT_REF"
    else
        git -C "$PANEL_DIR" checkout -f "$PANEL_GIT_REF" || git -C "$PANEL_DIR" checkout -f -B "$PANEL_GIT_REF" "origin/$PANEL_GIT_REF"
        git -C "$PANEL_DIR" reset --hard "origin/$PANEL_GIT_REF"
        git -C "$PANEL_DIR" clean -fd "${GIT_CLEAN_EXCLUDES[@]}"
    fi
    restore_runtime_dirs
}

update_backend() {
    step "Installing backend dependencies and running migrations..."
    COMPOSER_ALLOW_SUPERUSER=1 composer install --working-dir="$BACKEND_DIR" --no-interaction --prefer-dist
    run_as_www_data "cd '${PANEL_DIR}' && php app migrate"
    run_as_www_data "cd '${PANEL_DIR}' && php app module ensure pma" || true
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

ensure_nginx_webmail_location() {
    step "Ensuring nginx proxies /webmail to the panel backend..."
    local site_file=""
    for candidate in \
        "$NGINX_SITE_FILE" \
        /etc/nginx/sites-available/FeatherPanel.conf \
        /etc/nginx/sites-available/featherpanel.conf \
        /etc/nginx/sites-available/featherpanel
    do
        if [ -f "$candidate" ]; then
            site_file="$candidate"
            break
        fi
    done

    if [ -z "$site_file" ]; then
        echo "No FeatherPanel nginx site found; skipping /webmail location patch." >&2
        return 0
    fi

    if grep -Eq 'location[[:space:]]+/webmail' "$site_file"; then
        echo "nginx already has a /webmail location in ${site_file}"
        return 0
    fi

    if ! grep -Eq 'location[[:space:]]+/pma' "$site_file"; then
        echo "Could not locate /pma block in ${site_file}; skipping /webmail insert." >&2
        return 0
    fi

    local tmp
    tmp="$(mktemp)"
    # Dollar signs must be split so awk does not treat $host as a field var.
    awk '
        BEGIN { inserted = 0; in_pma = 0; depth = 0 }
        {
            print
            if (!inserted && $0 ~ /location[[:space:]]+\/pma/) {
                in_pma = 1
                depth = 0
            }
            if (in_pma) {
                nopen = gsub(/\{/, "{")
                nclose = gsub(/\}/, "}")
                depth += nopen - nclose
                if (depth <= 0 && $0 ~ /\}/) {
                    print ""
                    print "    location /webmail {"
                    print "        proxy_pass http://127.0.0.1:8721;"
                    print "        proxy_set_header Host $" "host;"
                    print "        proxy_set_header X-Real-IP $" "remote_addr;"
                    print "        proxy_set_header X-Forwarded-For $" "proxy_add_x_forwarded_for;"
                    print "        proxy_set_header X-Forwarded-Proto $" "scheme;"
                    print "    }"
                    inserted = 1
                    in_pma = 0
                }
            }
        }
    ' "$site_file" >"$tmp"

    if ! grep -Eq 'location[[:space:]]+/webmail' "$tmp"; then
        echo "Failed to insert /webmail location into ${site_file}" >&2
        rm -f "$tmp"
        return 1
    fi

    cp "$site_file" "${site_file}.bak.pre-webmail"
    mv "$tmp" "$site_file"
    echo "Inserted /webmail location into ${site_file}"
}

# Next.js emits large Link preload headers; nginx defaults (4k/8k) cause 502s.
ensure_nginx_proxy_buffers() {
    step "Ensuring nginx upstream response header buffers are large enough..."
    local site_file=""
    for candidate in \
        "$NGINX_SITE_FILE" \
        /etc/nginx/sites-available/FeatherPanel.conf \
        /etc/nginx/sites-available/featherpanel.conf \
        /etc/nginx/sites-available/featherpanel
    do
        if [ -f "$candidate" ]; then
            site_file="$candidate"
            break
        fi
    done

    if [ -z "$site_file" ]; then
        echo "No FeatherPanel nginx site found; skipping proxy buffer patch." >&2
        return 0
    fi

    if grep -q 'proxy_buffer_size' "$site_file"; then
        echo "nginx already has proxy_buffer_size in ${site_file}"
        return 0
    fi

    local tmp
    tmp="$(mktemp)"
    awk '
        /proxy_buffering[[:space:]]+off;/ && !done {
            print "      # Next.js Link preload headers exceed default upstream header buffer"
            print "      proxy_buffer_size 128k;"
            print "      proxy_buffers 8 128k;"
            print "      proxy_busy_buffers_size 256k;"
            done = 1
        }
        /proxy_pass[[:space:]]+http:\/\/127\.0\.0\.1:3000;/ && !done {
            print "        # Next.js Link preload headers exceed default upstream header buffer"
            print "        proxy_buffer_size 128k;"
            print "        proxy_buffers 8 128k;"
            print "        proxy_busy_buffers_size 256k;"
            done = 1
        }
        /proxy_pass[[:space:]]+http:\/\/localhost:4831;/ && !done {
            print "        # Next.js Link preload headers exceed default upstream header buffer"
            print "        proxy_buffer_size 128k;"
            print "        proxy_buffers 8 128k;"
            print "        proxy_busy_buffers_size 256k;"
            done = 1
        }
        { print }
    ' "$site_file" >"$tmp"

    if ! grep -q 'proxy_buffer_size' "$tmp"; then
        echo "Could not insert proxy_buffer_size into ${site_file}; skipping." >&2
        rm -f "$tmp"
        return 0
    fi

    cp "$site_file" "${site_file}.bak.pre-proxy-buffers"
    mv "$tmp" "$site_file"
    echo "Inserted proxy_buffer_size into ${site_file}"
}

restart_services() {
    step "Restarting services (runner, frontend, nginx)..."
    systemctl restart "$RUNNER_SERVICE_NAME" || true
    systemctl restart "$NEXT_SERVICE_NAME" || true
    ensure_nginx_webmail_location
    ensure_nginx_proxy_buffers
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
