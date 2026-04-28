#!/bin/bash

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

PANEL_DIR="${PANEL_DIR:-/var/www/featherpanel}"
PANEL_REPO="${PANEL_REPO:-https://github.com/mythicalltd/featherpanel.git}"
PANEL_GIT_REF_TYPE="${PANEL_GIT_REF_TYPE:-branch}"
PANEL_GIT_REF="${PANEL_GIT_REF:-main}"
BACKEND_DIR="${BACKEND_DIR:-${PANEL_DIR}/backend}"
FRONTEND_DIR="${FRONTEND_DIR:-${PANEL_DIR}/frontendv2}"
FRONTEND_MODE="${FRONTEND_MODE:-build}"
PANEL_DOMAIN="${PANEL_DOMAIN:-}"
ENABLE_SSL="${ENABLE_SSL:-}"
SSL_EMAIL="${SSL_EMAIL:-}"
CF_TUNNEL_SETUP="${CF_TUNNEL_SETUP:-}"
CF_TUNNEL_TOKEN="${CF_TUNNEL_TOKEN:-}"
CF_TUNNEL_LOCAL_PORT="${CF_TUNNEL_LOCAL_PORT:-8080}"

DB_NAME="${DB_NAME:-featherpanel}"
DB_USER="${DB_USER:-featherpanel}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_PASSWORD="${DB_PASSWORD:-change-me}"
DB_ENCRYPTION="${DB_ENCRYPTION:-xchacha20}"
REDIS_PASSWORD="${REDIS_PASSWORD:-eufefwefwefw}"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
MARIADB_ROOT_PASSWORD="${MARIADB_ROOT_PASSWORD:-}"

CRON_FILE="/etc/cron.d/featherpanel"
CRON_RUNNER_BASH="* * * * * www-data bash ${BACKEND_DIR}/storage/cron/runner.bash >/dev/null 2>&1"
CRON_RUNNER_PHP="* * * * * www-data php ${BACKEND_DIR}/storage/cron/runner.php >/dev/null 2>&1"
NGINX_SITE_NAME="FeatherPanel.conf"
NGINX_SITE_FILE="/etc/nginx/sites-available/${NGINX_SITE_NAME}"
NEXT_SERVICE_NAME="featherpanel-next"
NEXT_SERVICE_FILE="/etc/systemd/system/${NEXT_SERVICE_NAME}.service"
RUNNER_DIR="${RUNNER_DIR:-${PANEL_DIR}/runner}"
RUNNER_SERVICE_NAME="featherpanel-async-runner"
RUNNER_SERVICE_FILE="/etc/systemd/system/${RUNNER_SERVICE_NAME}.service"

step() {
    echo ""
    echo "======================================================================"
    echo " [SOURCE][PANEL] $1"
    echo "======================================================================"
}

banner() {
    echo ""
    echo "######################################################################"
    echo "#                  FEATHERPANEL SOURCE PANEL INSTALL                 #"
    echo "######################################################################"
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

prompt_if_empty() {
    local var_name="$1"
    local prompt_text="$2"
    local current_value="${!var_name:-}"
    if [ -z "$current_value" ]; then
        if [ -t 0 ] || [ -r /dev/tty ]; then
            read -r -p "$prompt_text" current_value </dev/tty
        else
            current_value=""
        fi
        printf -v "$var_name" "%s" "$current_value"
    fi
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

detect_public_ipv4() {
    { curl -4 -s --max-time 10 ifconfig.me 2>/dev/null || curl -4 -s --max-time 10 ipinfo.io/ip 2>/dev/null; } | tr -d '[:space:]' | head -n1
}

detect_public_ipv6() {
    { curl -6 -s --max-time 10 ifconfig.co 2>/dev/null || true; } | tr -d '[:space:]' | head -n1
}

show_dns_setup_instructions() {
    local domain="$1"
    local ipv4=""
    local ipv6=""
    ipv4="$(detect_public_ipv4)"
    ipv6="$(detect_public_ipv6)"

    echo ""
    echo "---------------------------------------------------------------------"
    echo " DNS SETUP REQUIRED FOR SSL"
    echo "---------------------------------------------------------------------"
    echo "Create DNS records for: ${domain}"
    if [ -n "$ipv4" ]; then
        echo "  - A record:    ${domain} -> ${ipv4}"
    fi
    if [ -n "$ipv6" ]; then
        echo "  - AAAA record: ${domain} -> ${ipv6}"
    fi
    if [ -z "$ipv4" ] && [ -z "$ipv6" ]; then
        echo "  - Could not detect server public IP automatically."
        echo "  - Create A/AAAA records manually for this server."
    fi
    echo "Wait for DNS propagation before continuing (can take 5-60 min)."
    echo "---------------------------------------------------------------------"
}

domain_has_dns_record() {
    local domain="$1"
    if getent ahosts "$domain" >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

upsert_env_var() {
    local file="$1"
    local key="$2"
    local value="$3"
    if rg -q "^${key}=" "$file"; then
        sed -i "s|^${key}=.*|${key}=${value}|" "$file"
    else
        printf "%s=%s\n" "$key" "$value" >>"$file"
    fi
}

sync_repo() {
    mkdir -p /var/www
    if [ -d "${PANEL_DIR}/.git" ]; then
        git -C "$PANEL_DIR" fetch --all --prune
        if [ "$PANEL_GIT_REF_TYPE" = "tag" ]; then
            git -C "$PANEL_DIR" fetch --tags --force
            git -C "$PANEL_DIR" checkout "tags/$PANEL_GIT_REF"
        else
            git -C "$PANEL_DIR" checkout "$PANEL_GIT_REF"
            git -C "$PANEL_DIR" pull --ff-only origin "$PANEL_GIT_REF"
        fi
    else
        rm -rf "$PANEL_DIR"
        if [ "$PANEL_GIT_REF_TYPE" = "tag" ]; then
            git clone --branch "$PANEL_GIT_REF" "$PANEL_REPO" "$PANEL_DIR"
        else
            git clone --branch "$PANEL_GIT_REF" "$PANEL_REPO" "$PANEL_DIR"
        fi
    fi
    chown -R root:root "$PANEL_DIR"
}

install_backend_deps() {
    if [ ! -f "${BACKEND_DIR}/composer.json" ]; then
        echo "Backend directory is missing composer.json: ${BACKEND_DIR}" >&2
        exit 1
    fi
    run_as_www_data "cd '${BACKEND_DIR}' && composer install --no-interaction --prefer-dist"
}

install_frontend_deps() {
    if [ ! -f "${FRONTEND_DIR}/package.json" ]; then
        echo "Frontend directory is missing package.json: ${FRONTEND_DIR}" >&2
        exit 1
    fi
    run_frontend_with_nvm "cd '${FRONTEND_DIR}' && pnpm install --frozen-lockfile=false"
}

setup_application_database_connection() {
    local env_file="${BACKEND_DIR}/storage/config/.env"
    local encryption_key=""

    if [ "$DB_ENCRYPTION" != "xchacha20" ]; then
        echo "Invalid DB_ENCRYPTION: ${DB_ENCRYPTION}. Allowed: xchacha20" >&2
        exit 1
    fi

    mkdir -p "$(dirname "$env_file")"
    touch "$env_file"

    encryption_key="$(php -r 'echo base64_encode(sodium_crypto_secretbox_keygen());')"
    if [ -z "$encryption_key" ]; then
        echo "Failed to generate DATABASE_ENCRYPTION_KEY." >&2
        exit 1
    fi

    upsert_env_var "$env_file" "DATABASE_HOST" "$DB_HOST"
    upsert_env_var "$env_file" "DATABASE_PORT" "$DB_PORT"
    upsert_env_var "$env_file" "DATABASE_USER" "$DB_USER"
    upsert_env_var "$env_file" "DATABASE_PASSWORD" "$DB_PASSWORD"
    upsert_env_var "$env_file" "DATABASE_DATABASE" "$DB_NAME"
    upsert_env_var "$env_file" "DATABASE_ENCRYPTION" "$DB_ENCRYPTION"
    upsert_env_var "$env_file" "DATABASE_ENCRYPTION_KEY" "$encryption_key"
    upsert_env_var "$env_file" "REDIS_PASSWORD" "$REDIS_PASSWORD"
    upsert_env_var "$env_file" "REDIS_HOST" "$REDIS_HOST"
    chown root:root "$env_file"
}

run_database_migrations() {
    run_as_www_data "cd '${PANEL_DIR}' && php app migrate"
}

build_or_watch_frontend() {
    case "$FRONTEND_MODE" in
        build)
            run_frontend_with_nvm "cd '${FRONTEND_DIR}' && pnpm build"
            ;;
        watch)
            run_frontend_with_nvm "cd '${FRONTEND_DIR}' && pnpm watch"
            ;;
        skip)
            echo "Skipping frontend build (FRONTEND_MODE=skip)."
            ;;
        *)
            echo "Invalid FRONTEND_MODE: ${FRONTEND_MODE}. Use build, watch, or skip." >&2
            exit 1
            ;;
    esac
}

setup_next_service() {
    if [ ! -f "${FRONTEND_DIR}/package.json" ]; then
        echo "Cannot create Next service, package.json missing: ${FRONTEND_DIR}" >&2
        exit 1
    fi

    cat >"$NEXT_SERVICE_FILE" <<EOF
[Unit]
Description=FeatherPanel Next.js Frontend
After=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=${FRONTEND_DIR}
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/bin/bash -lc 'export NVM_DIR=/root/.nvm && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && pnpm start'
Restart=always
RestartSec=5
KillSignal=SIGINT
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "${NEXT_SERVICE_NAME}"
    systemctl restart "${NEXT_SERVICE_NAME}"
}

configure_database() {
    local auth_args=()
    if [ -n "$MARIADB_ROOT_PASSWORD" ]; then
        auth_args=(-uroot "-p${MARIADB_ROOT_PASSWORD}")
    else
        auth_args=(-uroot)
    fi

    mariadb "${auth_args[@]}" <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;
CREATE USER IF NOT EXISTS '${DB_USER}'@'${DB_HOST}' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'${DB_HOST}' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'${DB_HOST}';
FLUSH PRIVILEGES;
SQL

    mariadb -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" "-p${DB_PASSWORD}" "$DB_NAME" -e "SELECT 1;" >/dev/null
}

configure_cron() {
    step "Configuring cron jobs to run as www-data..."
    cat >"$CRON_FILE" <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
$CRON_RUNNER_BASH
$CRON_RUNNER_PHP
EOF
    chmod 0644 "$CRON_FILE"
}

install_nginx_tools() {
    apt-get update -y
    apt-get install -y nginx
    systemctl enable nginx >/dev/null 2>&1 || true
}

install_ssl_tools() {
    apt-get update -y
    apt-get install -y certbot python3-certbot-nginx
}

install_cloudflared() {
    if command -v cloudflared >/dev/null 2>&1; then
        return 0
    fi
    apt-get update -y
    apt-get install -y curl ca-certificates gnupg
    install -m 0755 -d /usr/share/keyrings
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" >/etc/apt/sources.list.d/cloudflared.list
    apt-get update -y
    apt-get install -y cloudflared
}

resolve_cargo_bin() {
    local user_home=""
    if command -v cargo >/dev/null 2>&1; then
        command -v cargo
        return 0
    fi

    if [ -n "${SUDO_USER:-}" ]; then
        user_home="$(getent passwd "${SUDO_USER}" | cut -d: -f6)"
        if [ -n "$user_home" ] && [ -x "${user_home}/.cargo/bin/cargo" ]; then
            echo "${user_home}/.cargo/bin/cargo"
            return 0
        fi
    fi

    if [ -x "/root/.cargo/bin/cargo" ]; then
        echo "/root/.cargo/bin/cargo"
        return 0
    fi
    if [ -x "/var/www/.cargo/bin/cargo" ]; then
        echo "/var/www/.cargo/bin/cargo"
        return 0
    fi

    echo "cargo not found. Ensure Rust is installed before building runner." >&2
    exit 1
}

build_runner_binary() {
    local cargo_bin=""
    if [ ! -f "${RUNNER_DIR}/Cargo.toml" ]; then
        echo "Runner Cargo.toml not found: ${RUNNER_DIR}" >&2
        exit 1
    fi

    cargo_bin="$(resolve_cargo_bin)"
    (cd "$RUNNER_DIR" && "$cargo_bin" build --release)

    if [ ! -x "${RUNNER_DIR}/target/release/async-runner" ]; then
        echo "Runner binary build failed: ${RUNNER_DIR}/target/release/async-runner" >&2
        exit 1
    fi

    chown -R root:root "${RUNNER_DIR}/target"
}

setup_runner_service() {
    local runner_service_template="${RUNNER_DIR}/featherpanel-async-runner.service"
    local panel_env_file="${BACKEND_DIR}/storage/config/.env"

    if [ -f "$runner_service_template" ]; then
        cp "$runner_service_template" "$RUNNER_SERVICE_FILE"
        if rg -q "^EnvironmentFile=" "$RUNNER_SERVICE_FILE"; then
            sed -i "s|^EnvironmentFile=.*|EnvironmentFile=${panel_env_file}|" "$RUNNER_SERVICE_FILE"
        else
            sed -i "/^Environment=\"RUST_LOG=.*\"/a EnvironmentFile=${panel_env_file}" "$RUNNER_SERVICE_FILE"
        fi
    else
        cat >"$RUNNER_SERVICE_FILE" <<EOF
[Unit]
Description=FeatherPanel Async Runner
After=network.target mysql.service redis.service

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=${RUNNER_DIR}
Environment="RUST_LOG=info"
EnvironmentFile=${panel_env_file}
ExecStart=${RUNNER_DIR}/target/release/async-runner
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    fi

    systemctl daemon-reload
    systemctl enable "${RUNNER_SERVICE_NAME}"
    systemctl restart "${RUNNER_SERVICE_NAME}"
}

detect_php_fpm_socket() {
    local sockets=()
    shopt -s nullglob
    sockets=(/run/php/php*-fpm.sock)
    shopt -u nullglob
    if [ "${#sockets[@]}" -eq 0 ]; then
        echo "Unable to find PHP-FPM socket in /run/php." >&2
        exit 1
    fi
    printf '%s\n' "${sockets[@]}" | sort -V | tail -n 1
}

write_nginx_config_no_ssl() {
    local php_fpm_socket="$1"
    cat >"$NGINX_SITE_FILE" <<EOF
server {
    listen 80;
    server_name ${PANEL_DOMAIN};

    client_max_body_size 100m;
    client_body_timeout 120s;
    sendfile off;

    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy same-origin;
    proxy_hide_header X-Powered-By;
    proxy_hide_header Server;

    location /api {
        proxy_pass http://127.0.0.1:8721;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /pma {
        proxy_pass http://127.0.0.1:8721;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ^~ /attachments/ {
        alias ${BACKEND_DIR}/public/attachments/;
    }

    location ^~ /addons/ {
        alias ${BACKEND_DIR}/public/addons/;
    }

    location ^~ /components/ {
        alias ${BACKEND_DIR}/public/components/;
    }

    location / {
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_pass http://127.0.0.1:3000;
    }
}
EOF
}

write_nginx_config_cloudflare_tunnel() {
    local php_fpm_socket="$1"
    cat >"$NGINX_SITE_FILE" <<EOF
server {
    listen 127.0.0.1:${CF_TUNNEL_LOCAL_PORT};
    server_name localhost;

    client_max_body_size 100m;
    client_body_timeout 120s;
    sendfile off;

    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy same-origin;
    proxy_hide_header X-Powered-By;
    proxy_hide_header Server;

    location /api {
        proxy_pass http://127.0.0.1:8721;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /pma {
        proxy_pass http://127.0.0.1:8721;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ^~ /attachments/ {
        alias ${BACKEND_DIR}/public/attachments/;
    }

    location ^~ /addons/ {
        alias ${BACKEND_DIR}/public/addons/;
    }

    location ^~ /components/ {
        alias ${BACKEND_DIR}/public/components/;
    }

    location / {
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_pass http://127.0.0.1:3000;
    }
}

server {
    listen 127.0.0.1:8721;
    server_name localhost;
    root ${BACKEND_DIR}/public;
    index index.php;

    client_max_body_size 100m;
    client_body_timeout 120s;
    sendfile off;
    error_log ${BACKEND_DIR}/storage/logs/featherpanel-web.fplog error;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \\.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        fastcgi_param HTTP_PROXY "";
        fastcgi_param PHP_VALUE "upload_max_filesize = 100M\\npost_max_size = 100M";
        fastcgi_pass unix:${php_fpm_socket};
        fastcgi_index index.php;
        fastcgi_intercept_errors off;
        fastcgi_buffer_size 16k;
        fastcgi_buffers 4 16k;
        fastcgi_connect_timeout 300;
        fastcgi_send_timeout 300;
        fastcgi_read_timeout 300;
    }

    location ~ /\\.ht {
        deny all;
    }
}
EOF
}

write_nginx_config_ssl() {
    local php_fpm_socket="$1"
    cat >"$NGINX_SITE_FILE" <<EOF
server {
    listen 80;
    server_name ${PANEL_DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${PANEL_DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${PANEL_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${PANEL_DOMAIN}/privkey.pem;
    ssl_session_cache shared:SSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305";
    ssl_prefer_server_ciphers on;

    client_max_body_size 100m;
    client_body_timeout 120s;
    sendfile off;

    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy same-origin;
    proxy_hide_header X-Powered-By;
    proxy_hide_header Server;

    location /api {
        proxy_pass http://127.0.0.1:8721;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /pma {
        proxy_pass http://127.0.0.1:8721;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ^~ /attachments/ {
        alias ${BACKEND_DIR}/public/attachments/;
    }

    location ^~ /addons/ {
        alias ${BACKEND_DIR}/public/addons/;
    }

    location ^~ /components/ {
        alias ${BACKEND_DIR}/public/components/;
    }

    location / {
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_pass http://127.0.0.1:3000;
    }
}

server {
    listen 8721;
    server_name 127.0.0.1 localhost;
    root ${BACKEND_DIR}/public;
    index index.php;

    client_max_body_size 100m;
    client_body_timeout 120s;
    sendfile off;
    error_log ${BACKEND_DIR}/storage/logs/featherpanel-web.fplog error;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \\.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        fastcgi_param HTTP_PROXY "";
        fastcgi_param PHP_VALUE "upload_max_filesize = 100M\\npost_max_size = 100M";
        fastcgi_pass unix:${php_fpm_socket};
        fastcgi_index index.php;
        fastcgi_intercept_errors off;
        fastcgi_buffer_size 16k;
        fastcgi_buffers 4 16k;
        fastcgi_connect_timeout 300;
        fastcgi_send_timeout 300;
        fastcgi_read_timeout 300;
    }

    location ~ /\\.ht {
        deny all;
    }
}
EOF
}

enable_and_reload_nginx() {
    rm -f /etc/nginx/sites-enabled/default
    ln -sf "$NGINX_SITE_FILE" "/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"
    nginx -t
    systemctl restart nginx
}

obtain_ssl_certificate() {
    if [ -z "$SSL_EMAIL" ]; then
        SSL_EMAIL="admin@${PANEL_DOMAIN}"
    fi
    certbot certonly --nginx -d "$PANEL_DOMAIN" --non-interactive --agree-tos -m "$SSL_EMAIL"
}

configure_cloudflare_tunnel() {
    if [ -z "$CF_TUNNEL_TOKEN" ]; then
        if [ -t 0 ] || [ -r /dev/tty ]; then
            read -r -p "Enter Cloudflare Tunnel token: " CF_TUNNEL_TOKEN </dev/tty
        fi
    fi
    if [ -z "$CF_TUNNEL_TOKEN" ]; then
        echo "CF_TUNNEL_TOKEN is required for Cloudflare tunnel mode." >&2
        exit 1
    fi

    install_cloudflared
    cloudflared service install "$CF_TUNNEL_TOKEN"
    systemctl enable cloudflared >/dev/null 2>&1 || true
    systemctl restart cloudflared
    echo ""
    echo "---------------------------------------------------------------------"
    echo " CLOUDFLARE TUNNEL NEXT STEP"
    echo "---------------------------------------------------------------------"
    echo "In Cloudflare Zero Trust, configure a Public Hostname for your panel."
    echo "Recommended service target: http://127.0.0.1:${CF_TUNNEL_LOCAL_PORT}"
    echo "Your DNS record must point to the tunnel hostname (CNAME)."
    echo "---------------------------------------------------------------------"
}

configure_nginx() {
    local php_fpm_socket
    install_nginx_tools

    if [ -z "$CF_TUNNEL_SETUP" ]; then
        CF_TUNNEL_SETUP="$(prompt_yes_no_default_no "Use Cloudflare Tunnel mode (frontend only via tunnel)? (y/n): ")"
    fi

    php_fpm_socket="$(detect_php_fpm_socket)"

    if [ "$CF_TUNNEL_SETUP" = "true" ]; then
        write_nginx_config_cloudflare_tunnel "$php_fpm_socket"
        enable_and_reload_nginx
        configure_cloudflare_tunnel
    else
        prompt_if_empty PANEL_DOMAIN "Enter panel domain (e.g. panel.example.com): "
        if [ -z "$PANEL_DOMAIN" ]; then
            echo "PANEL_DOMAIN cannot be empty." >&2
            exit 1
        fi

        if [ -z "$ENABLE_SSL" ]; then
            if [ "$(prompt_yes_no_default_no "Enable SSL with Let's Encrypt? (y/n): ")" = "true" ]; then
                ENABLE_SSL="y"
            else
                ENABLE_SSL="n"
            fi
        fi

        write_nginx_config_no_ssl "$php_fpm_socket"
        enable_and_reload_nginx

        if [ "$ENABLE_SSL" = "y" ] || [ "$ENABLE_SSL" = "Y" ] || [ "$ENABLE_SSL" = "yes" ] || [ "$ENABLE_SSL" = "YES" ]; then
            install_ssl_tools
            show_dns_setup_instructions "$PANEL_DOMAIN"
            if [ -t 0 ] || [ -r /dev/tty ]; then
                read -r -p "Press Enter after DNS records are created and propagated..." _ </dev/tty
            fi

            if ! domain_has_dns_record "$PANEL_DOMAIN"; then
                echo "DNS for ${PANEL_DOMAIN} is not resolving yet."
                if [ "$(prompt_yes_no_default_no "Continue without SSL for now? (y/n): ")" = "true" ]; then
                    echo "Continuing without SSL. You can add SSL later from installer SSL menu."
                    return 0
                fi
                echo "Aborting to allow DNS setup. Re-run install when DNS is ready."
                exit 1
            fi

            if obtain_ssl_certificate; then
                write_nginx_config_ssl "$php_fpm_socket"
                enable_and_reload_nginx
            else
                echo "Certificate issuance failed."
                if [ "$(prompt_yes_no_default_no "Continue without SSL for now? (y/n): ")" = "true" ]; then
                    echo "Continuing without SSL. You can add SSL later from installer SSL menu."
                else
                    exit 1
                fi
            fi
        fi
    fi
}

main() {
    require_root
    banner
    step "Syncing panel repository..."
    sync_repo
    step "Installing backend dependencies..."
    install_backend_deps
    step "Installing frontend dependencies..."
    install_frontend_deps
    step "Configuring database user and schema..."
    configure_database
    step "Writing application environment configuration..."
    setup_application_database_connection
    step "Running database migrations..."
    run_database_migrations
    step "Building async runner..."
    build_runner_binary
    step "Installing async runner service..."
    setup_runner_service
    step "Configuring Nginx / Cloudflare tunnel integration..."
    configure_nginx
    configure_cron
    step "Building/watching frontend..."
    build_or_watch_frontend
    step "Installing frontend service..."
    setup_next_service
    step "Panel source installation completed."
}

main "$@"
