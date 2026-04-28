#!/bin/bash

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

NVM_VERSION="${NVM_VERSION:-v0.40.4}"
NODE_MAJOR="${NODE_MAJOR:-lts/*}"
TARGET_USER="${TARGET_USER:-root}"
TARGET_HOME="$(getent passwd "$TARGET_USER" | cut -d: -f6)"

step() {
    echo ""
    echo "======================================================================"
    echo " [SOURCE][UNIVERSAL] $1"
    echo "======================================================================"
}

banner() {
    echo ""
    echo "######################################################################"
    echo "#                 FEATHERPANEL SOURCE UNIVERSAL SETUP                #"
    echo "######################################################################"
}

require_root() {
    if [ "${EUID:-$(id -u)}" -ne 0 ]; then
        echo "This script must be run as root." >&2
        exit 1
    fi
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
        apt-get update -y
        apt-get install -y "${to_install[@]}"
    fi
}

run_as_target_user() {
    local cmd="$1"
    if [ "$TARGET_USER" = "root" ]; then
        bash -lc "$cmd"
    else
        su -s /bin/bash -c "$cmd" "$TARGET_USER"
    fi
}

install_nvm_if_missing() {
    local nvm_dir="${TARGET_HOME}/.nvm"
    if [ ! -s "${nvm_dir}/nvm.sh" ]; then
        run_as_target_user "curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | bash"
    fi
}

configure_node_toolchain() {
    local nvm_dir="${TARGET_HOME}/.nvm"
    local nvm_init="export NVM_DIR=\"${nvm_dir}\" && [ -s \"${nvm_dir}/nvm.sh\" ] && . \"${nvm_dir}/nvm.sh\""

    run_as_target_user "${nvm_init} && nvm install ${NODE_MAJOR} && nvm alias default ${NODE_MAJOR}"
    run_as_target_user "${nvm_init} && npm install -g pnpm npm-check-updates"
}

install_rust_if_missing() {
    if ! run_as_target_user "command -v rustup >/dev/null 2>&1"; then
        run_as_target_user "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
    fi
}

main() {
    require_root
    banner

    if [ -z "${TARGET_HOME}" ]; then
        echo "Unable to determine home directory for user: ${TARGET_USER}" >&2
        exit 1
    fi

    step "Installing universal prerequisites (curl, git, build tools, OpenSSL headers)..."
    install_if_missing curl ca-certificates git build-essential pkg-config libssl-dev
    step "Installing/updating Node.js toolchain..."
    install_nvm_if_missing
    configure_node_toolchain
    step "Installing Rust toolchain (if missing)..."
    install_rust_if_missing
    step "Universal setup completed."
}

main "$@"