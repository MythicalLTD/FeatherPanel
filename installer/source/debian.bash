#!/bin/bash

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

PHP_VERSION="${PHP_VERSION:-8.5}"
DIST_CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME:-}")"
REPOS_CHANGED=0
APT_LOCK_TIMEOUT="${APT_LOCK_TIMEOUT:-900}"
APT_RETRY_COUNT="${APT_RETRY_COUNT:-5}"
APT_RETRY_DELAY="${APT_RETRY_DELAY:-5}"

require_root() {
    if [ "${EUID:-$(id -u)}" -ne 0 ]; then
        echo "This script must be run as root." >&2
        exit 1
    fi
}

apt_get() {
    local attempt=1
    local max_attempts="$APT_RETRY_COUNT"
    while [ "$attempt" -le "$max_attempts" ]; do
        if apt-get -o "DPkg::Lock::Timeout=${APT_LOCK_TIMEOUT}" "$@"; then
            return 0
        fi
        if [ "$attempt" -ge "$max_attempts" ]; then
            break
        fi
        echo "apt-get failed (attempt ${attempt}/${max_attempts}). Retrying in ${APT_RETRY_DELAY}s..."
        sleep "$APT_RETRY_DELAY"
        attempt=$((attempt + 1))
    done
    return 1
}

apt_update_once() {
    apt_get update -y
}

install_if_missing() {
    local pkg
    local to_install=()
    for pkg in "$@"; do
        if ! dpkg -s "$pkg" >/dev/null 2>&1; then
            to_install+=("$pkg")
        fi
    done
    if [ "${#to_install[@]}" -gt 0 ]; then
        apt_get install -y "${to_install[@]}"
    fi
}

add_php_repo() {
    local list_file="/etc/apt/sources.list.d/sury-php.list"
    local keyring="/usr/share/keyrings/sury-php.gpg"
    local repo_line="deb [signed-by=${keyring}] https://packages.sury.org/php/ ${DIST_CODENAME} main"

    if [ -z "$DIST_CODENAME" ]; then
        echo "Unable to determine Debian codename from /etc/os-release." >&2
        exit 1
    fi

    if [ ! -f "$keyring" ]; then
        curl -fsSL "https://packages.sury.org/php/apt.gpg" | gpg --dearmor -o "$keyring"
    fi

    if [ ! -f "$list_file" ] || ! rg -Fq "$repo_line" "$list_file"; then
        echo "$repo_line" >"$list_file"
        REPOS_CHANGED=1
    fi
}

add_redis_repo() {
    local list_file="/etc/apt/sources.list.d/redis.list"
    local keyring="/usr/share/keyrings/redis-archive-keyring.gpg"
    local repo_line="deb [signed-by=${keyring}] https://packages.redis.io/deb ${DIST_CODENAME} main"

    if [ ! -f "$keyring" ]; then
        curl -fsSL "https://packages.redis.io/gpg" | gpg --dearmor -o "$keyring"
    fi

    if [ ! -f "$list_file" ] || ! rg -Fq "$repo_line" "$list_file"; then
        echo "$repo_line" >"$list_file"
        REPOS_CHANGED=1
    fi
}

setup_mariadb_repo() {
    if [ ! -f /etc/apt/sources.list.d/mariadb.list ] && [ ! -f /etc/apt/sources.list.d/mariadb.sources ]; then
        curl -LsS "https://r.mariadb.com/downloads/mariadb_repo_setup" | bash
        REPOS_CHANGED=1
    fi
}

install_composer() {
    if ! command -v composer >/dev/null 2>&1; then
        curl -sS "https://getcomposer.org/installer" | php -- --install-dir=/usr/local/bin --filename=composer
    fi
}

main() {
    require_root

    apt_update_once
    install_if_missing curl ca-certificates gnupg lsb-release ripgrep

    add_php_repo
    add_redis_repo
    setup_mariadb_repo

    if [ "$REPOS_CHANGED" -eq 1 ]; then
        apt_update_once
    fi

    install_if_missing \
        "php${PHP_VERSION}" \
        "php${PHP_VERSION}-common" \
        "php${PHP_VERSION}-cli" \
        "php${PHP_VERSION}-gd" \
        "php${PHP_VERSION}-mysql" \
        "php${PHP_VERSION}-mbstring" \
        "php${PHP_VERSION}-bcmath" \
        "php${PHP_VERSION}-xml" \
        "php${PHP_VERSION}-fpm" \
        "php${PHP_VERSION}-curl" \
        "php${PHP_VERSION}-zip" \
        "php${PHP_VERSION}-redis" \
        "php${PHP_VERSION}-mongodb" \
        "php${PHP_VERSION}-pgsql" \
        "php${PHP_VERSION}-sqlite3" \
		"php${PHP_VERSION}-ldap" \
		"php${PHP_VERSION}-bz2" \
        mariadb-server nginx tar unzip git redis-server zip dos2unix make

    install_composer
}

main "$@"