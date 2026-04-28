#!/bin/bash

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

PHP_VERSION="${PHP_VERSION:-8.5}"
DIST_CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME:-}")"
REPOS_CHANGED=0

require_root() {
    if [ "${EUID:-$(id -u)}" -ne 0 ]; then
        echo "This script must be run as root." >&2
        exit 1
    fi
}

apt_update_once() {
    apt-get update -y
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
        apt-get install -y "${to_install[@]}"
    fi
}

add_ondrej_php_ppa() {
    if ! command -v add-apt-repository >/dev/null 2>&1; then
        install_if_missing software-properties-common
    fi

    if ! rg -q "ondrej/php" /etc/apt/sources.list /etc/apt/sources.list.d 2>/dev/null; then
        LC_ALL=C.UTF-8 add-apt-repository -y ppa:ondrej/php
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
    install_if_missing curl apt-transport-https ca-certificates gnupg lsb-release ripgrep

    if [ -z "$DIST_CODENAME" ]; then
        echo "Unable to determine Ubuntu codename from /etc/os-release." >&2
        exit 1
    fi

    add_ondrej_php_ppa
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
        mariadb-server nginx tar unzip zip git redis-server make dos2unix

    install_composer
}

main "$@"