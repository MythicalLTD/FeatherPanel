#!/bin/bash
# FeatherPanel source install: FrankenPHP backend (worker mode + Mercure).
#
# Sourced by init/panel.bash (fresh install) and init/update.bash (existing
# installs). Every function is idempotent: re-running keeps existing keys,
# settings and admin edits of the generated env file.
#
# Layout it produces:
#   nginx (public :80/:443, SSL, Cloudflare tunnel)  ->  127.0.0.1:8721
#   featherpanel-backend.service = FrankenPHP running backend/Caddyfile
#     - /api/* in worker mode, Mercure hub at /api/mercure
#   PHP for the web: php-zts packages from pkg.henderkes.com (the official
#   FrankenPHP repository); CLI/cron keep the distribution PHP.
#
# Testing: FP_DRY_RUN=1 prints the commands instead of running them and
# FP_DESTDIR=/tmp/x writes the generated /etc files below /tmp/x (the
# backend directory itself is always the real path).

# shellcheck disable=SC2034 # read by the sourcing script
FP_SERVICE_NAME="${FP_SERVICE_NAME:-featherpanel-backend}"
FP_BACKEND_PORT="${FP_BACKEND_PORT:-8721}"
FP_PHP_SERIES="${FP_PHP_SERIES:-85}"
FP_DRY_RUN="${FP_DRY_RUN:-0}"
FP_DESTDIR="${FP_DESTDIR:-}"

# Extensions FeatherPanel needs on top of php-zts-cli (which already has
# sodium, mbstring, curl, openssl, opcache, xml, fileinfo, pcntl, ...).
FP_REQUIRED_EXTENSIONS=(pdo-mysql mysqli redis gd intl bcmath zip)
# Used by optional features (LDAP, MongoDB/PostgreSQL databases, images, YAML eggs).
FP_OPTIONAL_EXTENSIONS=(ldap mongodb pgsql pdo-pgsql sqlite3 pdo-sqlite bz2 gmp imagick yaml)

fp_log() { printf '[frankenphp] %s\n' "$*"; }
fp_die() {
    printf '[frankenphp] ERROR: %s\n' "$*" >&2
    exit 1
}

fp_run() {
    if [ "$FP_DRY_RUN" = "1" ]; then
        printf '+ %s\n' "$*"
        return 0
    fi
    "$@"
}

fp_path() { printf '%s%s' "$FP_DESTDIR" "$1"; }

# Write stdin to a file (below FP_DESTDIR when testing) only when it changed.
# Returns 0 when the file was written, 1 when it was already up to date.
fp_write_file() {
    local target mode tmp
    target="$(fp_path "$1")"
    mode="${2:-0644}"
    tmp="$(mktemp)"
    cat >"$tmp"
    if [ "$FP_DRY_RUN" = "1" ] && [ -z "$FP_DESTDIR" ]; then
        printf '+ write %s\n' "$target"
        rm -f "$tmp"
        return 0
    fi
    if [ -f "$target" ] && cmp -s "$tmp" "$target"; then
        rm -f "$tmp"
        return 1
    fi
    mkdir -p "$(dirname "$target")"
    install -m "$mode" "$tmp" "$target"
    rm -f "$tmp"
    fp_log "wrote ${target}"
    return 0
}

fp_env_get() {
    local file="$1" key="$2"
    [ -r "$file" ] || return 0
    sed -n "s/^${key}=//p" "$file" | tail -n 1 | sed 's/^["'"'"']//; s/["'"'"']$//'
}

# Add KEY=VALUE when KEY is missing or empty; never overwrite a set value.
fp_env_ensure() {
    local file="$1" key="$2" value="$3"
    if [ -n "$(fp_env_get "$file" "$key")" ]; then
        return 0
    fi
    if [ "$FP_DRY_RUN" = "1" ]; then
        printf '+ set %s in %s\n' "$key" "$file"
        return 0
    fi
    if grep -q "^${key}=" "$file" 2>/dev/null; then
        sed -i "s|^${key}=.*|${key}=\"${value}\"|" "$file"
    else
        printf '%s="%s"\n' "$key" "$value" >>"$file"
    fi
}

fp_random_secret() {
    openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64
}

fp_install_packages() {
    local keyring list line pkg missing=()
    keyring="/etc/apt/keyrings/static-php${FP_PHP_SERIES}.asc"
    list="/etc/apt/sources.list.d/static-php${FP_PHP_SERIES}.list"
    line="deb [signed-by=${keyring}] https://pkg.henderkes.com/api/packages/${FP_PHP_SERIES}/debian php-zts main"

    command -v apt-get >/dev/null 2>&1 || fp_die "apt-get not found: only Debian/Ubuntu are supported by the source installer."

    if [ ! -s "$(fp_path "$keyring")" ]; then
        fp_run install -d -m 0755 "$(fp_path /etc/apt/keyrings)"
        fp_run curl -fsSL "https://pkg.henderkes.com/api/packages/${FP_PHP_SERIES}/debian/repository.key" -o "$(fp_path "$keyring")" ||
            fp_die "could not download the FrankenPHP repository key (pkg.henderkes.com unreachable?)"
    fi
    if ! grep -qxF "$line" "$(fp_path "$list")" 2>/dev/null; then
        printf '%s\n' "$line" | fp_write_file "$list" || true
    fi
    fp_run apt-get -o "DPkg::Lock::Timeout=${APT_LOCK_TIMEOUT:-900}" update -y ||
        fp_die "apt-get update failed after adding the FrankenPHP repository"

    local required=(frankenphp php-zts-cli)
    for pkg in "${FP_REQUIRED_EXTENSIONS[@]}"; do required+=("php-zts-${pkg}"); done
    fp_run apt-get -o "DPkg::Lock::Timeout=${APT_LOCK_TIMEOUT:-900}" install -y "${required[@]}" ||
        fp_die "installing FrankenPHP failed: ${required[*]}"

    # Optional extensions one by one: a missing one must not abort the install.
    for pkg in "${FP_OPTIONAL_EXTENSIONS[@]}"; do
        if ! fp_run apt-get -o "DPkg::Lock::Timeout=${APT_LOCK_TIMEOUT:-900}" install -y "php-zts-${pkg}" >/dev/null 2>&1; then
            missing+=("$pkg")
        fi
    done
    if [ "${#missing[@]}" -gt 0 ]; then
        fp_log "optional PHP extensions not installed: ${missing[*]} (the related features stay unavailable)"
    fi

    # The package ships its own service on :80/:443; nginx owns those ports here.
    if [ "$FP_DRY_RUN" = "1" ] || systemctl list-unit-files frankenphp.service >/dev/null 2>&1; then
        fp_run systemctl disable --now frankenphp.service >/dev/null 2>&1 || true
        fp_run systemctl mask frankenphp.service >/dev/null 2>&1 || true
    fi
}

# php.ini overrides for the FrankenPHP (php-zts) runtime.
fp_write_php_ini() {
    fp_write_file /etc/php-zts/conf.d/99-featherpanel.ini <<'INI' || true
; Managed by the FeatherPanel installer (installer/source/lib/frankenphp.bash).
; memory_limit for web requests is set in backend/Caddyfile (PHP_MEMORY_LIMIT).
expose_php = Off
upload_max_filesize = 250M
post_max_size = 250M
max_execution_time = 300
; Production: assertions compiled out (measurable on the hot path).
zend.assertions = -1
realpath_cache_size = 4096K
realpath_cache_ttl = 600
opcache.enable = 1
opcache.enable_cli = 0
opcache.memory_consumption = 256
opcache.interned_strings_buffer = 32
opcache.max_accelerated_files = 20000
; Source installs update in place: keep revalidating (workers restart on update anyway).
opcache.validate_timestamps = 1
opcache.revalidate_freq = 2
INI
}

# Mercure keys in the panel .env (the panel signs tokens, the hub verifies them).
fp_ensure_mercure_keys() {
    local env_file="$1"
    fp_env_ensure "$env_file" MERCURE_SUBSCRIBER_JWT_KEY "$(fp_random_secret)"
    fp_env_ensure "$env_file" MERCURE_PUBLISHER_JWT_KEY "$(fp_random_secret)"
}

# Settings of the backend service. Written once; later runs keep admin edits.
fp_write_service_env() {
    local backend_dir="$1" file
    file="/etc/featherpanel/backend.env"
    if [ -f "$(fp_path "$file")" ]; then
        fp_log "keeping existing ${file}"
        return 0
    fi
    fp_write_file "$file" 0640 <<ENV || true
# FeatherPanel backend (FrankenPHP). Restart after editing:
#   systemctl restart ${FP_SERVICE_NAME}
# Every variable is documented at the top of ${backend_dir}/Caddyfile and
# ${backend_dir}/caddy/php-worker.caddyfile.
FEATHERPANEL_ROOT=${backend_dir}
SERVER_NAME=:${FP_BACKEND_PORT}
# nginx on this host is the public entry point: only listen locally.
FEATHERPANEL_BIND=127.0.0.1
CADDY_ADMIN_ADDRESS=localhost:2019
# Worker mode (app stays booted). false = classic mode (boot per request).
FRANKENPHP_WORKER=true
# Live updates through the built-in Mercure hub (auto | off).
FEATHERPANEL_MERCURE=auto
PHP_MEMORY_LIMIT=512M
# Pool sizes default to the CPU count (2x workers, up to 4x under load):
#FEATHERPANEL_WORKERS=
#FEATHERPANEL_WORKER_MAX_THREADS=
#FEATHERPANEL_SLOW_WORKERS=2
#FEATHERPANEL_SLOW_MAX_THREADS=16
#FRANKENPHP_MAX_THREADS=auto
#FEATHERPANEL_ROUTE_CACHE=true
ENV
}

fp_write_service_unit() {
    local backend_dir="$1"
    if fp_write_file "/etc/systemd/system/${FP_SERVICE_NAME}.service" <<UNIT; then
[Unit]
Description=FeatherPanel backend (FrankenPHP worker mode + Mercure)
Documentation=https://frankenphp.dev/docs/
After=network-online.target mariadb.service redis-server.service
Wants=network-online.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=${backend_dir}
EnvironmentFile=/etc/featherpanel/backend.env
Environment=XDG_DATA_HOME=${backend_dir}/storage/caches/caddy
Environment=XDG_CONFIG_HOME=${backend_dir}/storage/caches/caddy
# frankenphp-env.sh sizes the worker pools from the CPU count and enables Mercure.
ExecStart=/bin/sh -c '. ${backend_dir}/caddy/frankenphp-env.sh && exec /usr/bin/frankenphp run --config ${backend_dir}/Caddyfile'
# Caddy ignores SIGUSR1: reload through the admin API (re-reads the Caddyfile).
ExecReload=/bin/sh -c '. ${backend_dir}/caddy/frankenphp-env.sh && exec /usr/bin/frankenphp reload --config ${backend_dir}/Caddyfile --force'
Restart=on-failure
RestartSec=3s
TimeoutStopSec=30s
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
UNIT
        fp_run systemctl daemon-reload
    fi
}

fp_prepare_runtime_dirs() {
    local backend_dir="$1" dir
    for dir in storage/caches/caddy storage/caches/runtime storage/caches/routes storage/logs; do
        fp_run mkdir -p "${backend_dir}/${dir}"
        fp_run chown www-data:www-data "${backend_dir}/${dir}"
    done
}

# Start (or restart) the backend and wait until it answers.
fp_start_backend() {
    local i
    fp_run systemctl enable "${FP_SERVICE_NAME}.service"
    fp_run systemctl restart "${FP_SERVICE_NAME}.service"
    [ "$FP_DRY_RUN" = "1" ] && return 0
    for i in $(seq 1 30); do
        if curl -fsS -o /dev/null "http://127.0.0.1:${FP_BACKEND_PORT}/api/system/health"; then
            fp_log "backend is up on 127.0.0.1:${FP_BACKEND_PORT} (worker mode)"
            return 0
        fi
        sleep 1
    done
    journalctl -u "${FP_SERVICE_NAME}" -n 40 --no-pager >&2 || true
    fp_die "the backend did not answer on 127.0.0.1:${FP_BACKEND_PORT}; see: journalctl -u ${FP_SERVICE_NAME}"
}

# Remove the old php-fpm "server { listen ...8721 }" block from an nginx site
# so FrankenPHP can own the port. Prints nothing and changes nothing when
# there is no such block. A backup is kept next to the file.
fp_strip_nginx_fpm_backend() {
    local site="$1" tmp
    [ -f "$site" ] || return 0
    grep -Eq "listen[[:space:]]+(127\.0\.0\.1:)?${FP_BACKEND_PORT}[[:space:];]" "$site" || return 0
    tmp="$(mktemp)"
    awk -v port="$FP_BACKEND_PORT" '
        function flush() { if (!drop) printf "%s", buf; buf = ""; drop = 0 }
        {
            if (depth == 0 && $0 ~ /^[[:space:]]*server[[:space:]]*\{/) { inblock = 1; buf = ""; drop = 0 }
            if (inblock) {
                buf = buf $0 "\n"
                if ($0 ~ ("listen[[:space:]]+(127\\.0\\.0\\.1:)?" port "[[:space:];]")) drop = 1
                n = gsub(/\{/, "{"); m = gsub(/\}/, "}"); depth += n - m
                if (depth == 0) { inblock = 0; flush() }
                next
            }
            print
        }
        END { if (inblock) flush() }
    ' "$site" >"$tmp"
    if cmp -s "$tmp" "$site"; then
        rm -f "$tmp"
        return 0
    fi
    if [ "$FP_DRY_RUN" = "1" ]; then
        printf '+ remove php-fpm backend server block (port %s) from %s\n' "$FP_BACKEND_PORT" "$site"
        diff -u "$site" "$tmp" || true
        rm -f "$tmp"
        return 0
    fi
    cp -a "$site" "${site}.pre-frankenphp.bak"
    cat "$tmp" >"$site"
    rm -f "$tmp"
    fp_log "removed the php-fpm backend block from ${site} (backup: ${site}.pre-frankenphp.bak)"
}

# Mercure streams through nginx: no buffering, long reads.
fp_nginx_mercure_location() {
    cat <<'NGINX'
    location /api/mercure {
        proxy_pass http://127.0.0.1:8721;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 1h;
    }

NGINX
}

# Add the Mercure location to an existing site (before the first "location /api").
fp_ensure_nginx_mercure_location() {
    local site="$1" tmp block
    [ -f "$site" ] || return 0
    grep -q "location /api/mercure" "$site" && return 0
    grep -q "location /api" "$site" || return 0
    block="$(mktemp)"
    fp_nginx_mercure_location >"$block"
    tmp="$(mktemp)"
    awk -v blockfile="$block" '
        /^[[:space:]]*location \/api[[:space:]]*\{/ && !seen[FNR] {
            while ((getline line < blockfile) > 0) print line
            close(blockfile)
        }
        { print }
    ' "$site" >"$tmp"
    rm -f "$block"
    if [ "$FP_DRY_RUN" = "1" ]; then
        printf '+ add location /api/mercure to %s\n' "$site"
        rm -f "$tmp"
        return 0
    fi
    cp -a "$site" "${site}.pre-mercure.bak"
    cat "$tmp" >"$site"
    rm -f "$tmp"
    fp_log "added location /api/mercure to ${site}"
}

# Everything for the backend in one call (used by panel.bash and update.bash).
fp_setup_backend() {
    local backend_dir="$1" env_file="${1}/storage/config/.env"
    [ -f "${backend_dir}/Caddyfile" ] || fp_die "${backend_dir}/Caddyfile not found: is ${backend_dir} a FeatherPanel backend?"
    [ -f "${backend_dir}/caddy/frankenphp-env.sh" ] || fp_die "${backend_dir}/caddy/frankenphp-env.sh missing: update the panel source first"
    fp_install_packages
    fp_write_php_ini
    if [ -f "$env_file" ]; then
        fp_ensure_mercure_keys "$env_file"
    else
        fp_log "${env_file} not found yet: frankenphp-env.sh will create the Mercure keys on first start"
    fi
    fp_write_service_env "$backend_dir"
    fp_write_service_unit "$backend_dir"
    fp_prepare_runtime_dirs "$backend_dir"
}
