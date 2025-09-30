#!/bin/bash
# FeatherPanel Docker Installation Script
# Docker-only installer/uninstaller for Ubuntu/Debian

LOG_DIR=/var/www/featherpanel
LOG_FILE=$LOG_DIR/install.log

# Colors (use real ANSI escapes)
NC=$'\033[0m'; RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[0;33m'; BLUE=$'\033[0;34m'; CYAN=$'\033[0;36m'; BOLD=$'\033[1m'

log_init() {
    sudo mkdir -p "$LOG_DIR"
    sudo touch "$LOG_FILE"
    sudo chmod 664 "$LOG_FILE" 2>/dev/null || true
    {
        echo "========================================"
        date '+%Y-%m-%d %H:%M:%S %Z' | sed 's/^/[START] /'
        echo "Script: FeatherPanel Installer"
        echo "========================================"
    } >> "$LOG_FILE" 2>&1
}

log_info()    { echo -e "${BLUE}[INFO]${NC} $1";    echo "[INFO] $1"    >> "$LOG_FILE"; }
log_success() { echo -e "${GREEN}[ OK ]${NC} $1";  echo "[OK] $1"      >> "$LOG_FILE"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; echo "[WARN] $1"    >> "$LOG_FILE"; }
log_error()   { echo -e "${RED}[FAIL]${NC} $1";   echo "[ERROR] $1"   >> "$LOG_FILE"; }
log_step()    { echo -e "${CYAN}${BOLD}==> $1${NC}"; echo "[STEP] $1" >> "$LOG_FILE"; }

support_hint() {
    echo -e "${YELLOW}Need help?${NC} Join Discord: ${BLUE}https://discord.mythical.systems${NC}  Docs: ${BLUE}https://docs.mythical.systems${NC}"
}

upload_logs_on_fail() {
    if command -v curl >/dev/null 2>&1; then
        log_warn "Attempting to upload logs to mclo.gs for diagnostics..."
        RESPONSE=$(curl -s -X POST --data-urlencode "content@${LOG_FILE}" "https://api.mclo.gs/1/log")
        SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")
        if [ "$SUCCESS" = "true" ]; then
            URL=$(echo "$RESPONSE" | jq -r '.url')
            RAW=$(echo "$RESPONSE" | jq -r '.raw')
            log_info "Logs uploaded: $URL"
            echo -e "${BLUE}Logs URL:${NC} $URL"
            echo -e "${BLUE}Raw:${NC} $RAW"
        else
            log_warn "Failed to upload logs. Response: $RESPONSE"
        fi
    else
        log_warn "curl not available; cannot upload logs automatically."
    fi
    support_hint
}

# Initialize logging before any traps or operations use it
log_init

trap 'log_error "An unexpected error occurred."; upload_logs_on_fail' ERR
set -o pipefail

print_banner() {
    echo -e "${CYAN}${BOLD}FeatherPanel${NC}"
	echo -e "${CYAN}${BOLD}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡀⠀⠀⣀⣀⡀${NC}"
	echo -e "${CYAN}${BOLD}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⣶⣿⣽⣶⣾⣿⣿⣿⣿⠀${NC}"
	echo -e "${CYAN}${BOLD}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⠂⣰⣿⣿⡿⠟⠋⣿⣿⣿⣿⣿⣿⠏⠀${NC}"
	echo -e "${CYAN}${BOLD}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣶⣿⣣⣾⡿⠛⢉⣤⣶⣿⣿⣿⣿⣿⡿⠃⠀⠀${NC}"
	echo -e "${CYAN}${BOLD}⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⡄⣿⣿⣿⠟⢁⣤⣾⣿⣿⣿⣿⣿⣭⠥⠀⠀⠀⠀⠀${NC}"
	echo -e "${CYAN}${BOLD}⠀⠀⠀⠀⠀⠀⠀⣠⣾⣿⣷⡿⠋⣀⣴⣿⣿⣿⣿⣿⣷⠌⠉⠁⠀⠀⠀⠀⠀⠀${NC}"
	echo -e "${CYAN}${BOLD}⠀⠀⠀⠀⠀⢀⣼⣿⣿⣿⠟⢀⣼⣿⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀${NC}"
	echo -e "${CYAN}${BOLD}⠀⠀⠀⠀⢀⣾⣿⣿⡿⠃⣰⣿⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀${NC}"
	echo -e "${CYAN}${BOLD}⠀⠀⠰⣄⣾⣿⣿⡿⠁⣼⣿⣿⣿⣿⣿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀${NC}"
	echo -e "${CYAN}${BOLD}⠀⠀⣀⢻⣿⣿⡟⢀⣾⣿⢻⣿⠻⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀${NC}"
	echo -e "${CYAN}${BOLD}⠀⠀⠙⢿⣿⡿⠀⣾⣿⣿⠈⠟⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀${NC}"
	echo -e "${CYAN}${BOLD}⠀⠀⠀⠀⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀${NC}"
	echo -e "${CYAN}${BOLD}⠀⠀⠀⢰⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀${NC}"
	echo -e "${CYAN}${BOLD}⠀⠀⠀⣼⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀${NC}"
	echo -e "${CYAN}${BOLD}⠀⠀⠀⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀${NC}"

	echo -e "${CYAN}${BOLD}┌────────────────────────────────────────────────────────────┐${NC}"
	echo -e "${CYAN}${BOLD}│${NC}  🌐 Website:  ${BLUE}https://www.mythical.systems${NC}           ${CYAN}${BOLD}│${NC}"
	echo -e "${CYAN}${BOLD}│${NC}  💻 Github:   ${BLUE}github.com/mythicalltd/featherpanel${NC}    ${CYAN}${BOLD}│${NC}"
	echo -e "${CYAN}${BOLD}│${NC}  💬 Discord:  ${BLUE}discord.mythical.systems${NC}                ${CYAN}${BOLD}│${NC}"
	echo -e "${CYAN}${BOLD}│${NC}  📚 Docs:     ${BLUE}docs.mythical.systems${NC}                   ${CYAN}${BOLD}│${NC}"
echo -e "${CYAN}${BOLD}└────────────────────────────────────────────────────────────┘${NC}"
}

draw_hr() {
    echo -e "${CYAN}────────────────────────────────────────────────────────${NC}"
}

show_main_menu() {
    if [ -t 1 ]; then clear; fi
    print_banner
    draw_hr
    echo -e "${BOLD}Choose an action:${NC}"
    echo -e "  ${GREEN}[0]${NC} ${BOLD}Install${NC} ${BLUE}(Docker)${NC}"
    echo -e "  ${RED}[1]${NC} ${BOLD}Uninstall${NC} ${BLUE}(Docker)${NC}"
    echo -e "  ${YELLOW}[2]${NC} ${BOLD}Update${NC} ${BLUE}(pull & restart)${NC}"
    draw_hr
}

show_cf_mode_menu() {
    draw_hr
    echo -e "${BOLD}Cloudflare Tunnel mode:${NC}"
    echo -e "  ${GREEN}[1]${NC} ${BOLD}Full Automatic${NC} ${BLUE}(API Key; creates tunnel + DNS)${NC}"
    echo -e "  ${YELLOW}[2]${NC} ${BOLD}Semi-Automatic${NC} ${BLUE}(provide Tunnel Token)${NC}"
    draw_hr
}

# Function to check if a package is installed and install it if not
install_packages() {
    packages_to_install=()
    for pkg in "$@"; do
        if dpkg -s "$pkg" >/dev/null 2>&1;
        then
            log_info "$pkg is already installed. Skipping..."
        else
            packages_to_install+=("$pkg")
        fi
    done

    if [ ${#packages_to_install[@]} -gt 0 ]; then
        printf 'Installing packages: %s\n' "${packages_to_install[*]}" | sed 's/^/ /'
        log_step "Installing dependencies: ${packages_to_install[*]}"
        sudo apt-get -qq install -y "${packages_to_install[@]}" 2>&1 | tee -a "$LOG_FILE" >/dev/null || {
            log_error "Failed to install packages: ${packages_to_install[*]}"; exit 1; }
        log_success "Dependencies installed."
    fi
}

# Prompt helpers that work even when the script is piped (stdin not a TTY)
prompt() {
    local message="$1"; local __varname="$2"
    if [ -t 0 ]; then
        read -r -p "$message" "$__varname"
    else
        # Read from the real terminal
        read -r -p "$message" "$__varname" < /dev/tty
    fi
}

prompt_secret() {
    local message="$1"; local __varname="$2"
    if [ -t 0 ]; then
        read -r -s -p "$message" "$__varname"; echo
    else
        # Read from the real terminal
        read -r -s -p "$message" "$__varname" < /dev/tty; echo
    fi
}

uninstall_cloudflare_tunnel() {
    echo "Uninstalling Cloudflare Tunnel..."
    if [ -f /var/www/featherpanel/.env ]; then
        # shellcheck source=/dev/null
        . /var/www/featherpanel/.env

        if [ -n "$TUNNEL_ID" ] && [ -n "$ACCOUNT_ID" ] && [ -n "$ZONE_ID" ] && [ -n "$CF_HOSTNAME" ]; then
            echo "Deleting DNS record for $CF_HOSTNAME..."
            DNS_RECORD_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=CNAME&name=$CF_HOSTNAME" \
                 -H "X-Auth-Email: $CF_EMAIL" \
                 -H "X-Auth-Key: $CF_API_KEY" \
                 -H "Content-Type: application/json" | jq -r '.result[0].id')

            if [ -n "$DNS_RECORD_ID" ] && [ "$DNS_RECORD_ID" != "null" ]; then
                curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$DNS_RECORD_ID" \
                     -H "X-Auth-Email: $CF_EMAIL" \
                     -H "X-Auth-Key: $CF_API_KEY" \
                     -H "Content-Type: application/json" > /dev/null
                echo "DNS record deleted."
            else
                echo "Could not find DNS record for $CF_HOSTNAME or already deleted."
            fi

            echo "Deleting Cloudflare Tunnel..."
            curl -s -X DELETE "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID" \
                 -H "X-Auth-Email: $CF_EMAIL" \
                 -H "X-Auth-Key: $CF_API_KEY" \
                 -H "Content-Type: application/json" > /dev/null
            echo "Cloudflare Tunnel deleted."
        else
            echo "Cloudflare Tunnel credentials not found or incomplete. Skipping tunnel deletion."
        fi
        # Do not remove .env; it stores user Cloudflare settings
    else
        echo "Cloudflare Tunnel credentials file not found. Skipping tunnel deletion."
    fi
}

setup_cloudflare_tunnel_full_auto() {
    echo "Starting full-automatic Cloudflare Tunnel setup..."
    install_packages jq

    ACCOUNTS_DATA=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts" \
         -H "X-Auth-Email: $CF_EMAIL" \
         -H "X-Auth-Key: $CF_API_KEY" \
         -H "Content-Type: application/json")

    ACCOUNT_COUNT=$(echo "$ACCOUNTS_DATA" | jq -r '.result | length')

    if [ "$ACCOUNT_COUNT" == "0" ]; then
        echo "Error: No Cloudflare accounts found. Please check your email and API key."
        return 1
    elif [ "$ACCOUNT_COUNT" -gt "1" ]; then
        echo "Multiple Cloudflare accounts found. Please choose one:"
    echo "$ACCOUNTS_DATA" | jq -r '.result[] | "\(.id) \(.name)"' | nl
    read -r -p "Enter the number of the account you want to use: " ACCOUNT_CHOICE
    ACCOUNT_ID=$(echo "$ACCOUNTS_DATA" | jq -r ".result[$((ACCOUNT_CHOICE-1))].id")
    else
    ACCOUNT_ID=$(echo "$ACCOUNTS_DATA" | jq -r '.result[0].id')
    fi

    if [ "$ACCOUNT_ID" == "null" ] || [ -z "$ACCOUNT_ID" ]; then
        echo "Error: Could not get Cloudflare Account ID. Please check your email and API key."
        return 1
    fi

    TUNNEL_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel?name=FeatherPanel" \
         -H "X-Auth-Email: $CF_EMAIL" \
         -H "X-Auth-Key: $CF_API_KEY" \
         -H "Content-Type: application/json" | jq -r '.result[0].id')

    if [ "$TUNNEL_ID" == "null" ] || [ -z "$TUNNEL_ID" ]; then
        echo "Creating Cloudflare Tunnel 'FeatherPanel'..."
        TUNNEL_CREATE_DATA=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel" \
             -H "X-Auth-Email: $CF_EMAIL" \
             -H "X-Auth-Key: $CF_API_KEY" \
             -H "Content-Type: application/json" \
             --data '{"name":"FeatherPanel"}')
    TUNNEL_ID=$(echo "$TUNNEL_CREATE_DATA" | jq -r '.result.id')
        if [ "$TUNNEL_ID" == "null" ] || [ -z "$TUNNEL_ID" ]; then
            echo "Error: Could not create Cloudflare Tunnel."
            echo "API Response: $TUNNEL_CREATE_DATA"
            return 1
        fi
    fi

    echo "Using Tunnel ID: $TUNNEL_ID"

    CF_TUNNEL_TOKEN=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/token" \
         -H "X-Auth-Email: $CF_EMAIL" \
         -H "X-Auth-Key: $CF_API_KEY" \
         -H "Content-Type: application/json" | jq -r '.result')

    if [ "$CF_TUNNEL_TOKEN" == "null" ] || [ -z "$CF_TUNNEL_TOKEN" ]; then
        echo "Error: Could not get Cloudflare Tunnel token. This might be due to API limitations."
        echo "Please try the semi-automatic mode."
        return 1
    fi

    ZONE_NAME=$(echo "$CF_HOSTNAME" | awk -F. '{print $(NF-1)"."$NF}')
    ZONE_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$ZONE_NAME" \
         -H "X-Auth-Email: $CF_EMAIL" \
         -H "X-Auth-Key: $CF_API_KEY" \
         -H "Content-Type: application/json" | jq -r '.result[0].id')

    if [ "$ZONE_ID" == "null" ] || [ -z "$ZONE_ID" ]; then
        echo "Error: Could not get Cloudflare Zone ID for domain '$ZONE_NAME'."
        return 1
    fi

    echo "Configuring DNS and ingress rules..."
    curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
        -H "X-Auth-Email: $CF_EMAIL" \
        -H "X-Auth-Key: $CF_API_KEY" \
        -H "Content-Type: application/json" \
        --data "$(jq -n --arg host "$CF_HOSTNAME" --arg tunnel "$TUNNEL_ID" '{type:"CNAME",name:$host,content:($tunnel + ".cfargotunnel.com"),proxied:true}')" > /dev/null

    curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/configurations" \
        -H "X-Auth-Email: $CF_EMAIL" \
        -H "X-Auth-Key: $CF_API_KEY" \
        -H "Content-Type: application/json" \
        --data "$(jq -n --arg hostname "$CF_HOSTNAME" '{config:{ingress:[{hostname:$hostname,service:"http://localhost:4831"},{service:"http_status:404"}]}}')" > /dev/null

    echo "Full-automatic Cloudflare Tunnel setup complete."

    # Persist Cloudflare credentials to .env for future uninstall/updates
    ENV_FILE=/var/www/featherpanel/.env
    log_info "Writing Cloudflare settings to $ENV_FILE"
    {
        printf 'CF_EMAIL="%s"\n' "$CF_EMAIL"
        printf 'CF_API_KEY="%s"\n' "$CF_API_KEY"
        printf 'ACCOUNT_ID="%s"\n' "$ACCOUNT_ID"
        printf 'TUNNEL_ID="%s"\n' "$TUNNEL_ID"
        printf 'ZONE_ID="%s"\n' "$ZONE_ID"
        printf 'CF_HOSTNAME="%s"\n' "$CF_HOSTNAME"
        printf 'CF_TUNNEL_TOKEN="%s"\n' "$CF_TUNNEL_TOKEN"
    } | sudo tee "$ENV_FILE" > /dev/null
    sudo chmod 600 "$ENV_FILE"
    log_success "Cloudflare settings saved."
}

setup_cloudflare_tunnel_client() {
    if [ -n "$CF_TUNNEL_TOKEN" ]; then
        echo "Setting up Cloudflare Tunnel..."
            if command -v docker &> /dev/null
            then
                echo "Docker is already installed."
            else
            log_step "Installing Docker engine (this may take a minute)..."
            curl -sSL https://get.docker.com/ | CHANNEL=stable bash >> "$LOG_FILE" 2>&1
            sudo systemctl enable --now docker 2>&1 | tee -a "$LOG_FILE" >/dev/null
            sudo usermod -aG docker "$USER" 2>&1 | tee -a "$LOG_FILE" >/dev/null || true
            log_success "Docker installed. You may need to re-login for group changes to take effect."
            fi
        docker run -d --network host --restart always cloudflare/cloudflared:latest tunnel --no-autoupdate run --token "$CF_TUNNEL_TOKEN" >> "$LOG_FILE" 2>&1
        echo "Cloudflare Tunnel setup complete."
        if [ "$CF_TUNNEL_MODE" == "2" ]; then
            echo -e "\033[0;33mYou have chosen Semi-Automatic Cloudflare Tunnel setup.\033[0m"
            echo -e "\033[0;33mPlease manually create a DNS record for your hostname pointing to the tunnel in your Cloudflare dashboard.\033[0m"
            echo -e "\033[0;33mThe ingress rule should point to http://localhost:4831.\033[0m"
            echo -e "\033[0;33mMore information: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel-api/\033[0m"
        fi
    else
        echo "Skipping Cloudflare Tunnel setup as no token was provided or generated."
    fi
}

# Docker-only flow
uninstall_docker() {
    if [ ! -f /var/www/featherpanel/.installed ]; then
        log_warn "FeatherPanel does not appear to be installed. Nothing to uninstall."
        support_hint
        return 0
    fi
    echo "Uninstalling FeatherPanel (Docker)..."
    uninstall_cloudflare_tunnel
    # Stop and remove any cloudflared containers started by this installer
    if command -v docker >/dev/null 2>&1; then
        log_step "Removing Cloudflare Tunnel docker container(s) if present..."
        # Try by common name
        (docker rm -f cloudflared >/dev/null 2>&1 && log_info "Removed container 'cloudflared'") || true
        # Fallback: remove containers from the official image
        CF_IDS=$(docker ps -aq --filter ancestor=cloudflare/cloudflared:latest || true)
        if [ -n "$CF_IDS" ]; then
            docker rm -f "$CF_IDS" >/dev/null 2>&1 && log_info "Removed cloudflared container(s) by image"
        fi
    fi
    if [ -f /var/www/featherpanel/docker-compose.yml ]; then
        log_step "Stopping and removing Docker containers..."
        (cd /var/www/featherpanel && sudo docker compose down -v) >> "$LOG_FILE" 2>&1 || true
    fi
    # Remove secrets and sensitive files
    if [ -f /var/www/featherpanel/.env ]; then
        echo "Removing .env file containing secrets..."
        sudo rm -f /var/www/featherpanel/.env
    fi
    rm -rf /var/www/featherpanel
    echo "Docker-based uninstallation complete."
}

ensure_env_cloudflare() {
    ENV_FILE=/var/www/featherpanel/.env
    if [ -f "$ENV_FILE" ]; then
        echo ".env already exists at /var/www/featherpanel/.env. Skipping creation."
        return 0
    fi
    echo "Creating /var/www/featherpanel/.env for Cloudflare settings..."
    cat <<EOF | sudo tee "$ENV_FILE" > /dev/null
# Cloudflare settings used by the installer/uninstaller
CF_EMAIL=""
CF_API_KEY=""
CF_HOSTNAME=""
CF_TUNNEL_TOKEN=""
# These will be filled automatically if you choose Full Automatic mode:
ACCOUNT_ID=""
TUNNEL_ID=""
ZONE_ID=""
EOF
    sudo chmod 600 "$ENV_FILE"
    echo ".env created for Cloudflare."
}

if [ -f /etc/os-release ]; then
    # shellcheck source=/dev/null
    . /etc/os-release
    OS=$ID
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "ubuntu-server" ] || [ "$OS" = "debian" ]; then
        echo "Supported OS: $OS"
        
        # Environment overrides for non-interactive mode
        case "${FP_ACTION:-}" in
            install) INST_TYPE="0";;
            uninstall) INST_TYPE="1";;
            update) INST_TYPE="2";;
            *) INST_TYPE="";;
        esac

        while [[ ! "$INST_TYPE" =~ ^[0-2]$ ]]; do
            show_main_menu
            prompt "${BOLD}Enter option${NC} ${BLUE}(0/1/2)${NC}: " INST_TYPE
            if [[ ! "$INST_TYPE" =~ ^[0-2]$ ]]; then
                echo -e "${RED}Invalid input.${NC} Please enter ${YELLOW}0${NC}, ${YELLOW}1${NC} or ${YELLOW}2${NC}."; sleep 1
            fi
        done

        reinstall="n"
CF_TUNNEL_SETUP=""
CF_TUNNEL_TOKEN=""
CF_TUNNEL_MODE=""
CF_API_KEY=""
CF_EMAIL=""
CF_HOSTNAME=""
        confirm="n"

        if [ "$INST_TYPE" = "0" ]; then
            if [ -f /var/www/featherpanel/.installed ]; then
                read -r -p "FeatherPanel appears to be already installed. Do you want to reinstall? (y/n): " reinstall
                if [ "$reinstall" != "y" ]; then
                    echo "Exiting installation."
                    exit 0
                fi
            fi

            # Env override
            if [ -n "${FP_CF_SETUP:-}" ]; then CF_TUNNEL_SETUP="$FP_CF_SETUP"; fi
            while [[ ! "$CF_TUNNEL_SETUP" =~ ^[ynYN]$ ]]; do
                prompt "${BOLD}Set up Cloudflare Tunnel?${NC} ${BLUE}(y/n)${NC}: " CF_TUNNEL_SETUP
                if [[ ! "$CF_TUNNEL_SETUP" =~ ^[ynYN]$ ]]; then
                    echo -e "${RED}Invalid input.${NC} Enter ${YELLOW}y${NC} or ${YELLOW}n${NC}."; sleep 1
                fi
            done

            if [[ "$CF_TUNNEL_SETUP" =~ ^[yY]$ ]]; then
                # Env override
                if [ -n "${FP_CF_MODE:-}" ]; then CF_TUNNEL_MODE="$FP_CF_MODE"; fi
                while [[ ! "$CF_TUNNEL_MODE" =~ ^[12]$ ]]; do
                    show_cf_mode_menu
                    prompt "${BOLD}Enter mode${NC} ${BLUE}(1/2)${NC}: " CF_TUNNEL_MODE
                    if [[ ! "$CF_TUNNEL_MODE" =~ ^[12]$ ]]; then
                        echo -e "${RED}Invalid input.${NC} Enter ${YELLOW}1${NC} or ${YELLOW}2${NC}."; sleep 1
                    fi
                done

                if [ "$CF_TUNNEL_MODE" == "1" ]; then
                    echo "Entering Full Automatic setup for Cloudflare Tunnel."
                    [ -n "${FP_EMAIL:-}" ] && CF_EMAIL="$FP_EMAIL"
                    [ -n "${FP_API_KEY:-}" ] && CF_API_KEY="$FP_API_KEY"
                    [ -n "${FP_HOSTNAME:-}" ] && CF_HOSTNAME="$FP_HOSTNAME"
                    while [ -z "$CF_EMAIL" ]; do
                        prompt "${BOLD}Cloudflare Email${NC}: " CF_EMAIL
                    done
                    while [ -z "$CF_API_KEY" ]; do
                        prompt_secret "${BOLD}Cloudflare Global API Key${NC}: " CF_API_KEY
                    done
                    while [ -z "$CF_HOSTNAME" ]; do
                        prompt "${BOLD}Hostname${NC} ${BLUE}(e.g., panel.example.com)${NC}: " CF_HOSTNAME
                    done
                else
                    echo -e "${YELLOW}Semi-Automatic mode selected.${NC}"
                    [ -n "${FP_TUNNEL_TOKEN:-}" ] && CF_TUNNEL_TOKEN="$FP_TUNNEL_TOKEN"
                    while [ -z "$CF_TUNNEL_TOKEN" ]; do
                        prompt_secret "${BOLD}Cloudflare Tunnel Token${NC}: " CF_TUNNEL_TOKEN
                    done
                fi
            else
                echo -e "\033[0;33mYou have chosen not to use Cloudflare Tunnel. You will need to expose port 4831 or use your own reverse proxy to access FeatherPanel.\033[0m"
            fi

                install_packages curl unzip jq
                if command -v docker &> /dev/null
                then
                log_info "Docker is already installed."
                else
                log_step "Installing Docker engine (this may take a minute)..."
                curl -sSL https://get.docker.com/ | CHANNEL=stable bash >> "$LOG_FILE" 2>&1
            sudo systemctl enable --now docker 2>&1 | tee -a "$LOG_FILE" >/dev/null
            sudo usermod -aG docker "$USER" 2>&1 | tee -a "$LOG_FILE" >/dev/null || true
                log_success "Docker installed. You may need to re-login for group changes to take effect."
                fi
                
            sudo mkdir -p /var/www/featherpanel
            cd /var/www/featherpanel || exit 1

            ensure_env_cloudflare

            if [ ! -f /var/www/featherpanel/docker-compose.yml ]; then
                log_step "Downloading docker-compose.yml for FeatherPanel..."
                curl -fsSL -o /var/www/featherpanel/docker-compose.yml "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/docker-compose.yml" >> "$LOG_FILE" 2>&1 || { log_error "Failed to download docker-compose.yml"; exit 1; }
            fi

            print_banner
            log_step "Starting FeatherPanel stack..."
            sudo docker compose up -d 2>&1 | tee -a "$LOG_FILE" >/dev/null || { log_error "Failed to start FeatherPanel stack"; exit 1; }
            log_success "FeatherPanel stack started."

                if [[ "$CF_TUNNEL_SETUP" =~ ^[yY]$ ]]; then
                    if [ "$CF_TUNNEL_MODE" == "1" ]; then
                        if ! setup_cloudflare_tunnel_full_auto; then
                            CF_TUNNEL_TOKEN=""
                        fi
                    fi
                    setup_cloudflare_tunnel_client
                fi

            sudo touch /var/www/featherpanel/.installed
            log_success "Installation finished. See log at $LOG_FILE"
        elif [ "$INST_TYPE" = "1" ]; then
            if [ ! -f /var/www/featherpanel/.installed ]; then
                echo "FeatherPanel does not appear to be installed. Nothing to uninstall."
                exit 0
            fi
            prompt "Are you sure you want to uninstall the Docker-based installation? (y/n): " confirm
                if [ "$confirm" = "y" ]; then
                    uninstall_docker
                else
                    echo "Uninstallation cancelled."
                    exit 0
                fi
        else
            # Update flow
            if [ ! -f /var/www/featherpanel/.installed ]; then
                echo "FeatherPanel does not appear to be installed. Nothing to update."
                exit 0
            fi
            print_banner
            log_step "Updating FeatherPanel (pulling latest images and compose file)..."
            if [ ! -f /var/www/featherpanel/docker-compose.yml ]; then
                log_info "docker-compose.yml missing, downloading it first..."
                curl -fsSL -o /var/www/featherpanel/docker-compose.yml "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/docker-compose.yml" >> "$LOG_FILE" 2>&1 || { log_error "Failed to download docker-compose.yml"; upload_logs_on_fail; exit 1; }
            else
                log_info "Refreshing docker-compose.yml from upstream..."
                curl -fsSL -o /var/www/featherpanel/docker-compose.yml "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/docker-compose.yml" >> "$LOG_FILE" 2>&1 || log_warn "Could not refresh compose file; keeping existing."
            fi
            (cd /var/www/featherpanel && sudo docker compose pull) >> "$LOG_FILE" 2>&1 || { log_error "Failed pulling images"; upload_logs_on_fail; exit 1; }
            (cd /var/www/featherpanel && sudo docker compose up -d) >> "$LOG_FILE" 2>&1 || { log_error "Failed applying updated stack"; upload_logs_on_fail; exit 1; }
            log_success "FeatherPanel updated successfully."
                    exit 0
                fi

        
    else
        echo "Unsupported OS: $OS"
        exit 1
    fi
else
    echo "Cannot determine OS"
    exit 1
fi