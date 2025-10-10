#!/bin/bash
# FeatherPanel/FeatherWings Docker Installation Script
# Docker-only installer/uninstaller for Ubuntu/Debian

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}This installer must be run as root or with sudo.${NC}"
    echo "Please run: sudo $0"
    exit 1
fi

LOG_DIR=/var/www/featherpanel
LOG_FILE=$LOG_DIR/install.log

# Colors (use real ANSI escapes)
NC=$'\033[0m'; RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[0;33m'; BLUE=$'\033[0;34m'; CYAN=$'\033[0;36m'; MAGENTA=$'\033[0;35m'; BOLD=$'\033[1m'

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
        log_info "Uploading logs to mclo.gs for diagnostics..."
        RESPONSE=$(curl -s -X POST --data-urlencode "content@${LOG_FILE}" "https://api.mclo.gs/1/log")
        
        # Parse JSON response
        SUCCESS=$(echo "$RESPONSE" | grep -o '"success":[^,]*' | cut -d':' -f2 | tr -d '"' 2>/dev/null)
        if [ "$SUCCESS" = "true" ]; then
            URL=$(echo "$RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4 | sed 's/\\\//\//g' 2>/dev/null)
            RAW=$(echo "$RESPONSE" | grep -o '"raw":"[^"]*"' | cut -d'"' -f4 | sed 's/\\\//\//g' 2>/dev/null)
            log_success "Logs uploaded successfully!"
            echo -e "${GREEN}Logs URL:${NC} $URL"
            echo -e "${GREEN}Raw URL:${NC} $RAW"
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
	echo -e "${CYAN}${BOLD}${NC}  🌐 Website:  ${BLUE}www.mythical.systems${NC}           ${CYAN}${BOLD}${NC}"
	echo -e "${CYAN}${BOLD}${NC}  💻 Github:   ${BLUE}github.com/mythicalltd/featherpanel${NC}    ${CYAN}${BOLD}${NC}"
	echo -e "${CYAN}${BOLD}${NC}  💬 Discord:  ${BLUE}discord.mythical.systems${NC}                ${CYAN}${BOLD}${NC}"
	echo -e "${CYAN}${BOLD}${NC}  📚 Docs:     ${BLUE}docs.mythical.systems${NC}                   ${CYAN}${BOLD}${NC}"
echo -e "${CYAN}${BOLD}└────────────────────────────────────────────────────────────┘${NC}"
}

draw_hr() {
    echo -e "${CYAN}────────────────────────────────────────────────────────${NC}"
}

show_main_menu() {
    if [ -t 1 ]; then clear; fi
    print_banner
    draw_hr
    echo -e "${BOLD}Choose a component:${NC}"
    echo -e "  ${GREEN}[0]${NC} ${BOLD}Panel${NC} ${BLUE}(Web Interface)${NC}"
    echo -e "  ${BLUE}[1]${NC} ${BOLD}Wings${NC} ${BLUE}(Game Server Daemon)${NC}"
    echo -e "  ${YELLOW}[2]${NC} ${BOLD}SSL Certificates${NC} ${BLUE}(Let's Encrypt)${NC}"
    draw_hr
}

show_panel_menu() {
    draw_hr
    echo -e "${BOLD}Panel Operations:${NC}"
    echo -e "  ${GREEN}[0]${NC} ${BOLD}Install${NC} ${BLUE}(Docker)${NC}"
    echo -e "  ${RED}[1]${NC} ${BOLD}Uninstall${NC} ${BLUE}(Docker)${NC}"
    echo -e "  ${YELLOW}[2]${NC} ${BOLD}Update${NC} ${BLUE}(pull & restart)${NC}"
    draw_hr
}

show_wings_menu() {
    draw_hr
    echo -e "${BOLD}Wings Operations:${NC}"
    echo -e "  ${GREEN}[0]${NC} ${BOLD}Install${NC} ${BLUE}(System Service)${NC}"
    echo -e "  ${RED}[1]${NC} ${BOLD}Uninstall${NC} ${BLUE}(System Service)${NC}"
    echo -e "  ${YELLOW}[2]${NC} ${BOLD}Update${NC} ${BLUE}(pull latest)${NC}"
    echo -e "  ${CYAN}[3]${NC} ${BOLD}Create SSL Certificate${NC} ${BLUE}(Required before Wings install)${NC}"
    draw_hr
}

show_ssl_menu() {
    draw_hr
    echo -e "${BOLD}SSL Certificate Operations:${NC}"
    echo -e "  ${GREEN}[0]${NC} ${BOLD}Install Certbot${NC} ${BLUE}(Let's Encrypt client)${NC}"
    echo -e "  ${BLUE}[1]${NC} ${BOLD}Create Certificate${NC} ${BLUE}(HTTP/Standalone)${NC}"
    echo -e "  ${YELLOW}[2]${NC} ${BOLD}Create Certificate (DNS)${NC} ${BLUE}(Cloudflare/Manual)${NC}"
    echo -e "  ${CYAN}[3]${NC} ${BOLD}Setup Auto-Renewal${NC} ${BLUE}(Cron job)${NC}"
    echo -e "  ${RED}[4]${NC} ${BOLD}Install acme.sh${NC} ${BLUE}(Advanced users)${NC}"
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
        draw_hr
        echo -e "${BOLD}Multiple Cloudflare accounts found. Please choose one:${NC}"
        draw_hr
        
        # Display accounts with colored menu
        local index=1
        echo "$ACCOUNTS_DATA" | jq -r '.result[] | "\(.id)|\(.name)"' | while IFS='|' read -r id name; do
            echo -e "  ${GREEN}[$index]${NC} ${BOLD}$name${NC} ${BLUE}($id)${NC}"
            index=$((index + 1))
        done
        
        draw_hr
        prompt "${BOLD}Enter account number${NC} ${BLUE}(1-$ACCOUNT_COUNT)${NC}: " ACCOUNT_CHOICE
        
        # Validate choice
        if [[ ! "$ACCOUNT_CHOICE" =~ ^[0-9]+$ ]] || [ "$ACCOUNT_CHOICE" -lt 1 ] || [ "$ACCOUNT_CHOICE" -gt "$ACCOUNT_COUNT" ]; then
            echo -e "${RED}Invalid choice. Using first account.${NC}"
            ACCOUNT_ID=$(echo "$ACCOUNTS_DATA" | jq -r '.result[0].id')
        else
    ACCOUNT_ID=$(echo "$ACCOUNTS_DATA" | jq -r ".result[$((ACCOUNT_CHOICE-1))].id")
        fi
    else
    ACCOUNT_ID=$(echo "$ACCOUNTS_DATA" | jq -r '.result[0].id')
        log_info "Using Cloudflare account: $(echo "$ACCOUNTS_DATA" | jq -r '.result[0].name')"
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

    log_info "Using Tunnel ID: $TUNNEL_ID"

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

    log_info "Configuring DNS and ingress rules..."
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

    log_info "Full-automatic Cloudflare Tunnel setup complete."

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
        log_info "Setting up Cloudflare Tunnel..."
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
        docker run -d --network host --restart always cloudflare/cloudflared:latest tunnel --no-autoupdate run --token "$CF_TUNNEL_TOKEN" >> "$LOG_FILE" 2>&1
        log_info "Cloudflare Tunnel setup complete."
        if [ "$CF_TUNNEL_MODE" == "2" ]; then
            echo -e "\033[0;33mYou have chosen Semi-Automatic Cloudflare Tunnel setup.\033[0m"
            echo -e "\033[0;33mPlease manually create a DNS record for your hostname pointing to the tunnel in your Cloudflare dashboard.\033[0m"
            echo -e "\033[0;33mThe ingress rule should point to http://localhost:4831.\033[0m"
            echo -e "\033[0;33mMore information: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel-api/\033[0m"
        fi
    else
        log_info "Skipping Cloudflare Tunnel setup as no token was provided or generated."
    fi
}

# Wings installation functions
install_wings() {
    log_step "Installing FeatherWings daemon..."
    
    # Check kernel version for swap support
    KERNEL_VERSION=$(uname -r | cut -d. -f1-2)
    KERNEL_MAJOR=$(echo "$KERNEL_VERSION" | cut -d. -f1)
    KERNEL_MINOR=$(echo "$KERNEL_VERSION" | cut -d. -f2)
    
    if [ "$KERNEL_MAJOR" -lt 6 ] || ([ "$KERNEL_MAJOR" -eq 6 ] && [ "$KERNEL_MINOR" -lt 1 ]); then
        log_warn "Kernel version $KERNEL_VERSION detected (older than 6.1)"
        log_info "For Docker swap support, you may need to enable swap in GRUB:"
        log_info "Add 'swapaccount=1' to GRUB_CMDLINE_LINUX_DEFAULT in /etc/default/grub"
        log_info "Then run: sudo update-grub && sudo reboot"
    else
        log_info "Kernel version $KERNEL_VERSION detected (6.1+) - swap enabled by default"
    fi
    
    # Create directory structure
    log_info "Creating FeatherWings directory structure..."
    sudo mkdir -p /etc/featherpanel
    sudo mkdir -p /var/lib/featherpanel/volumes
    sudo mkdir -p /var/lib/featherpanel/archives
    sudo mkdir -p /var/lib/featherpanel/backups
    sudo mkdir -p /var/log/featherpanel
    sudo mkdir -p /tmp/featherpanel
    sudo mkdir -p /var/run/featherwings
    
    # Download and install featherwings binary
    log_info "Downloading FeatherWings binary..."
    sudo curl -L -o /usr/local/bin/featherwings "https://github.com/MythicalLTD/FeatherWings/releases/latest/download/wings_linux_$([[ "$(uname -m)" == "x86_64" ]] && echo "amd64" || echo "arm64")"
    sudo chmod +x /usr/local/bin/featherwings
    
    # Create systemd service
    cat <<EOF | sudo tee /etc/systemd/system/featherwings.service > /dev/null
[Unit]
Description=FeatherWings Daemon
After=docker.service
Requires=docker.service
PartOf=docker.service

[Service]
User=root
WorkingDirectory=/etc/featherpanel
ExecStart=/usr/local/bin/featherwings
Restart=always
RestartSec=5
StartLimitInterval=180
StartLimitBurst=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Enable but don't start yet (needs configuration)
    sudo systemctl daemon-reload
    sudo systemctl enable featherwings
    
    log_success "FeatherWings daemon installed successfully."
    log_warn "This is a CANARY release of FeatherWings - not recommended for production use."
    log_info "Next steps:"
    log_info "1. Create a node in your FeatherPanel admin panel"
    log_info "2. Copy the configuration from the node to /etc/featherpanel/config.yml"
    log_info "3. Start FeatherWings with: sudo systemctl start featherwings"
    log_info "4. Or run in debug mode first: sudo featherwings --debug"
}

uninstall_wings() {
    log_step "Uninstalling FeatherWings daemon..."
    
    # Stop and disable service
    sudo systemctl stop featherwings >/dev/null 2>&1 || true
    sudo systemctl disable featherwings >/dev/null 2>&1 || true
    
    # Remove service file
    sudo rm -f /etc/systemd/system/featherwings.service
    sudo systemctl daemon-reload
    
    # Remove binary
    sudo rm -f /usr/local/bin/featherwings
    
    # Remove configuration (ask first)
    if [ -d /etc/featherpanel ]; then
        log_info "Remove FeatherWings configuration directory (/etc/featherpanel)? (y/n): "
        read -r remove_config
        if [[ "$remove_config" =~ ^[yY]$ ]]; then
            sudo rm -rf /etc/featherpanel
        fi
    fi
    
    # Remove data directories (ask first)
    if [ -d /var/lib/featherpanel ]; then
        log_info "Remove FeatherWings data directory (/var/lib/featherpanel)? (y/n): "
        read -r remove_data
        if [[ "$remove_data" =~ ^[yY]$ ]]; then
            sudo rm -rf /var/lib/featherpanel
        fi
    fi
    
    # Remove logs
    sudo rm -rf /var/log/featherpanel
    
    
    log_success "FeatherWings daemon uninstalled successfully."
}

update_wings() {
    log_step "Updating FeatherWings daemon..."
    
    if [ ! -f /usr/local/bin/featherwings ]; then
        log_error "FeatherWings is not installed. Please install it first."
        return 1
    fi
    
    # Stop featherwings service
    sudo systemctl stop featherwings
    
    # Download latest FeatherWings binary
    log_info "Downloading latest FeatherWings binary..."
    sudo curl -L -o /usr/local/bin/featherwings "https://github.com/MythicalLTD/FeatherWings/releases/latest/download/wings_linux_$([[ "$(uname -m)" == "x86_64" ]] && echo "amd64" || echo "arm64")"
    sudo chmod +x /usr/local/bin/featherwings
    
    # Restart service
    sudo systemctl start featherwings
    
    log_success "FeatherWings daemon updated successfully."
}

# SSL Certificate functions
install_certbot() {
    log_step "Installing Certbot..."
    
    # Update package list
    sudo apt-get update
    
    # Install base certbot
    install_packages certbot
    
    # Detect which web server plugins to install
    local plugins_to_install=()
    
    # Check for Nginx
    if systemctl is-active --quiet nginx 2>/dev/null || systemctl is-enabled --quiet nginx 2>/dev/null || dpkg -l | grep -q "^ii.*nginx"; then
        log_info "Nginx detected, installing Nginx plugin..."
        plugins_to_install+=("python3-certbot-nginx")
    fi
    
    # Check for Apache
    if systemctl is-active --quiet apache2 2>/dev/null || systemctl is-enabled --quiet apache2 2>/dev/null || dpkg -l | grep -q "^ii.*apache2"; then
        log_info "Apache detected, installing Apache plugin..."
        plugins_to_install+=("python3-certbot-apache")
    fi
    
    # If no web server detected, ask user what they want
    if [ ${#plugins_to_install[@]} -eq 0 ]; then
        log_info "No web server detected. You can install plugins for future use."
        log_info "Which web server plugin would you like to install? (optional)"
        log_info "  [1] Nginx plugin"
        log_info "  [2] Apache plugin" 
        log_info "  [3] Both plugins (Not recommended)"
        log_info "  [4] Skip plugins (standalone only)"
        prompt "${BOLD}Enter choice${NC} ${BLUE}(1/2/3/4)${NC}: " plugin_choice
        
        case $plugin_choice in
            1)
                plugins_to_install+=("python3-certbot-nginx")
                log_info "Installing Nginx plugin..."
                ;;
            2)
                plugins_to_install+=("python3-certbot-apache")
                log_info "Installing Apache plugin..."
                ;;
            3)
                plugins_to_install+=("python3-certbot-nginx" "python3-certbot-apache")
                log_info "Installing both Nginx and Apache plugins..."
                ;;
            4)
                log_info "Skipping web server plugins. You can use standalone mode."
                ;;
            *)
                log_warn "Invalid choice. Skipping web server plugins."
                ;;
        esac
    fi
    
    # Install selected plugins
    if [ ${#plugins_to_install[@]} -gt 0 ]; then
        install_packages "${plugins_to_install[@]}"
        log_success "Certbot installed successfully with web server plugins."
    else
        log_success "Certbot installed successfully (standalone mode available)."
    fi
    
    log_info "Certbot is now available for SSL certificate management."
}

create_ssl_certificate_http() {
    log_step "Creating SSL Certificate (HTTP/Standalone method)..."
    
    if ! command -v certbot >/dev/null 2>&1; then
        log_error "Certbot is not installed. Please install it first."
        return 1
    fi
    
    # Get domain from user
    local domain=""
    while [ -z "$domain" ]; do
        prompt "${BOLD}Enter domain name${NC} ${BLUE}(e.g., panel.example.com)${NC}: " domain
    done
    
    # Get public IP addresses for DNS guidance
    log_info "Detecting your server's public IP addresses..."
    PUBLIC_IPV4=$(curl -s --max-time 10 ifconfig.me 2>/dev/null || curl -s --max-time 10 ipinfo.io/ip 2>/dev/null || echo "")
    PUBLIC_IPV6=$(curl -s --max-time 10 -6 ifconfig.co 2>/dev/null || echo "")
    
    draw_hr
    echo -e "${BOLD}${YELLOW}DNS Setup Required${NC}"
    draw_hr
    echo -e "${BLUE}Before creating the SSL certificate, you must create DNS records:${NC}"
    echo -e ""
    echo -e "${GREEN}Create an A record:${NC}"
    echo -e "  ${BOLD}Name:${NC} $domain"
    if [ -n "$PUBLIC_IPV4" ]; then
        echo -e "  ${BOLD}Value:${NC} $PUBLIC_IPV4"
    else
        echo -e "  ${BOLD}Value:${NC} ${YELLOW}YOUR_SERVER_IPV4${NC}"
    fi
    echo -e "  ${BOLD}TTL:${NC} 300 (or Auto)"
    echo -e ""
    
    if [ -n "$PUBLIC_IPV6" ]; then
        echo -e "${GREEN}Create an AAAA record (IPv6 support):${NC}"
        echo -e "  ${BOLD}Name:${NC} $domain"
        echo -e "  ${BOLD}Value:${NC} $PUBLIC_IPV6"
        echo -e "  ${BOLD}TTL:${NC} 300 (or Auto)"
        echo -e ""
    else
        echo -e "${YELLOW}IPv6 not detected or not available on this server.${NC}"
        echo -e ""
    fi
    
    echo -e "${YELLOW}Please create these DNS records in your domain's DNS management panel.${NC}"
    echo -e "${YELLOW}DNS propagation can take 5-60 minutes depending on your DNS provider.${NC}"
    echo -e ""
    prompt "${BOLD}Press Enter when you have created the DNS records${NC} ${BLUE}(and waited for propagation)${NC}: " ready_to_continue
    
    log_info "This will be the main domain for your Panel (not a subdirectory like /panel)."
    
    # Check if web server is running
    local webserver=""
    if systemctl is-active --quiet nginx; then
        webserver="nginx"
    elif systemctl is-active --quiet apache2; then
        webserver="apache"
    else
        webserver="standalone"
    fi
    
    log_info "Detected web server: $webserver"
    
    # Create certificate based on detected web server
    case $webserver in
        nginx)
            # Check if Nginx plugin is available
            if dpkg -l | grep -q "^ii.*python3-certbot-nginx"; then
                log_info "Using Nginx plugin for certificate creation..."
                certbot certonly --nginx -d "$domain" --non-interactive --agree-tos --email admin@"$domain" || {
                    log_error "Failed to create certificate with Nginx plugin";
                    return 1;
                }
            else
                log_warn "Nginx plugin not installed. Falling back to standalone method."
                log_warn "Make sure port 80 is not in use by other services."
                certbot certonly --standalone -d "$domain" --non-interactive --agree-tos --email admin@"$domain" || {
                    log_error "Failed to create certificate with standalone method";
                    return 1;
                }
            fi
            ;;
        apache)
            # Check if Apache plugin is available
            if dpkg -l | grep -q "^ii.*python3-certbot-apache"; then
                log_info "Using Apache plugin for certificate creation..."
                certbot certonly --apache -d "$domain" --non-interactive --agree-tos --email admin@"$domain" || {
                    log_error "Failed to create certificate with Apache plugin";
                    return 1;
                }
            else
                log_warn "Apache plugin not installed. Falling back to standalone method."
                log_warn "Make sure port 80 is not in use by other services."
                certbot certonly --standalone -d "$domain" --non-interactive --agree-tos --email admin@"$domain" || {
                    log_error "Failed to create certificate with standalone method";
                    return 1;
                }
            fi
            ;;
        standalone)
            log_info "Using standalone method for certificate creation..."
            log_warn "Make sure port 80 is not in use by other services."
            certbot certonly --standalone -d "$domain" --non-interactive --agree-tos --email admin@"$domain" || {
                log_error "Failed to create certificate with standalone method";
                return 1;
            }
            ;;
    esac
    
    log_success "SSL certificate created successfully for $domain"
    log_info "Certificate location: /etc/letsencrypt/live/$domain/"
    
    # Check if reverse proxy is already configured for this domain
    if [ -f /etc/nginx/sites-enabled/featherpanel ] && grep -q "$domain" /etc/nginx/sites-enabled/featherpanel 2>/dev/null; then
        log_info "Updating Nginx configuration to use SSL..."
        curl -s "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/.github/docker/ssl/nginx.conf" | \
            sed "s/your-domain.com/$domain/g" | \
            sudo tee /etc/nginx/sites-available/featherpanel > /dev/null
        sudo nginx -t && log_success "Nginx SSL configuration updated successfully"
    elif [ -f /etc/apache2/sites-enabled/featherpanel.conf ] && grep -q "$domain" /etc/apache2/sites-enabled/featherpanel.conf 2>/dev/null; then
        log_info "Updating Apache configuration to use SSL..."
        curl -s "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/.github/docker/ssl/apache2.conf" | \
            sed "s/your-domain.com/$domain/g" | \
            sudo tee /etc/apache2/sites-available/featherpanel.conf > /dev/null
        sudo apache2ctl configtest && log_success "Apache SSL configuration updated successfully"
    else
        log_info "You can now configure your web server to use these certificates."
    fi
}

create_ssl_certificate_dns() {
    log_step "Creating SSL Certificate (DNS challenge method)..."
    
    if ! command -v certbot >/dev/null 2>&1; then
        log_error "Certbot is not installed. Please install it first."
        return 1
    fi
    
    # Get domain from user
    local domain=""
    while [ -z "$domain" ]; do
        prompt "${BOLD}Enter domain name${NC} ${BLUE}(e.g., panel.example.com)${NC}: " domain
    done
    
    # Get public IP addresses for DNS guidance
    log_info "Detecting your server's public IP addresses..."
    PUBLIC_IPV4=$(curl -s --max-time 10 ifconfig.me 2>/dev/null || curl -s --max-time 10 ipinfo.io/ip 2>/dev/null || echo "")
    PUBLIC_IPV6=$(curl -s --max-time 10 -6 ifconfig.co 2>/dev/null || echo "")
    
    draw_hr
    echo -e "${BOLD}${YELLOW}DNS Setup Required${NC}"
    draw_hr
    echo -e "${BLUE}Before creating the SSL certificate, you must create DNS records:${NC}"
    echo -e ""
    echo -e "${GREEN}Create an A record:${NC}"
    echo -e "  ${BOLD}Name:${NC} $domain"
    if [ -n "$PUBLIC_IPV4" ]; then
        echo -e "  ${BOLD}Value:${NC} $PUBLIC_IPV4"
    else
        echo -e "  ${BOLD}Value:${NC} ${YELLOW}YOUR_SERVER_IPV4${NC}"
    fi
    echo -e "  ${BOLD}TTL:${NC} 300 (or Auto)"
    echo -e ""
    
    if [ -n "$PUBLIC_IPV6" ]; then
        echo -e "${GREEN}Create an AAAA record (IPv6 support):${NC}"
        echo -e "  ${BOLD}Name:${NC} $domain"
        echo -e "  ${BOLD}Value:${NC} $PUBLIC_IPV6"
        echo -e "  ${BOLD}TTL:${NC} 300 (or Auto)"
        echo -e ""
    else
        echo -e "${YELLOW}IPv6 not detected or not available on this server.${NC}"
        echo -e ""
    fi
    
    echo -e "${YELLOW}Please create these DNS records in your domain's DNS management panel.${NC}"
    echo -e "${YELLOW}DNS propagation can take 5-60 minutes depending on your DNS provider.${NC}"
    echo -e ""
    prompt "${BOLD}Press Enter when you have created the DNS records${NC} ${BLUE}(and waited for propagation)${NC}: " ready_to_continue
    
    log_info "This will be the main domain for your Panel (not a subdirectory like /panel)."
    
    log_info "Using DNS challenge method for certificate creation..."
    log_warn "This method requires you to manually create TXT DNS records."
    log_info "Certbot will pause and wait for you to create the DNS record."
    
    log_info "Press Enter to continue when you're ready to start the DNS challenge..."
    read -r
    
    # Run certbot in interactive mode for DNS challenge
    certbot -d "$domain" --manual --preferred-challenges dns certonly --agree-tos --email admin@"$domain" || {
        log_error "Failed to create certificate with DNS challenge";
        return 1;
    }
    
    log_success "SSL certificate created successfully for $domain"
    log_info "Certificate location: /etc/letsencrypt/live/$domain/"
    
    # Check if reverse proxy is already configured for this domain
    if [ -f /etc/nginx/sites-enabled/featherpanel ] && grep -q "$domain" /etc/nginx/sites-enabled/featherpanel 2>/dev/null; then
        log_info "Updating Nginx configuration to use SSL..."
        curl -s "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/.github/docker/ssl/nginx.conf" | \
            sed "s/your-domain.com/$domain/g" | \
            sudo tee /etc/nginx/sites-available/featherpanel > /dev/null
        sudo nginx -t && log_success "Nginx SSL configuration updated successfully"
    elif [ -f /etc/apache2/sites-enabled/featherpanel.conf ] && grep -q "$domain" /etc/apache2/sites-enabled/featherpanel.conf 2>/dev/null; then
        log_info "Updating Apache configuration to use SSL..."
        curl -s "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/.github/docker/ssl/apache2.conf" | \
            sed "s/your-domain.com/$domain/g" | \
            sudo tee /etc/apache2/sites-available/featherpanel.conf > /dev/null
        sudo apache2ctl configtest && log_success "Apache SSL configuration updated successfully"
    else
        log_info "You can now configure your web server to use these certificates."
    fi
}

create_wings_ssl_certificate() {
    log_step "Creating SSL Certificate for Wings (DNS challenge method)..."
    
    if ! command -v certbot >/dev/null 2>&1; then
        log_info "Certbot is not installed. Installing Certbot (standalone mode) for Wings..."
        sudo apt-get update
        install_packages certbot
        log_success "Certbot installed successfully for Wings SSL certificates."
    fi
    
    # Get domain from user
    local domain=""
    while [ -z "$domain" ]; do
        prompt "${BOLD}Enter Wings domain name${NC} ${BLUE}(e.g., node.example.com)${NC}: " domain
    done
    
    # Get public IP addresses for DNS guidance
    log_info "Detecting your server's public IP addresses..."
    PUBLIC_IPV4=$(curl -s --max-time 10 ifconfig.me 2>/dev/null || curl -s --max-time 10 ipinfo.io/ip 2>/dev/null || echo "")
    PUBLIC_IPV6=$(curl -s --max-time 10 -6 ifconfig.co 2>/dev/null || echo "")
    
    draw_hr
    echo -e "${BOLD}${YELLOW}DNS Setup Required${NC}"
    draw_hr
    echo -e "${BLUE}Before creating the SSL certificate, you must create DNS records:${NC}"
    echo -e ""
    echo -e "${GREEN}Create an A record:${NC}"
    echo -e "  ${BOLD}Name:${NC} $domain"
    if [ -n "$PUBLIC_IPV4" ]; then
        echo -e "  ${BOLD}Value:${NC} $PUBLIC_IPV4"
    else
        echo -e "  ${BOLD}Value:${NC} ${YELLOW}YOUR_SERVER_IPV4${NC}"
    fi
    echo -e "  ${BOLD}TTL:${NC} 300 (or Auto)"
    echo -e ""
    
    if [ -n "$PUBLIC_IPV6" ]; then
        echo -e "${GREEN}Create an AAAA record (IPv6 support):${NC}"
        echo -e "  ${BOLD}Name:${NC} $domain"
        echo -e "  ${BOLD}Value:${NC} $PUBLIC_IPV6"
        echo -e "  ${BOLD}TTL:${NC} 300 (or Auto)"
        echo -e ""
    else
        echo -e "${YELLOW}IPv6 not detected or not available on this server.${NC}"
        echo -e ""
    fi
    
    echo -e "${YELLOW}Please create these DNS records in your domain's DNS management panel.${NC}"
    echo -e "${YELLOW}DNS propagation can take 5-60 minutes depending on your DNS provider.${NC}"
    echo -e ""
    prompt "${BOLD}Press Enter when you have created the DNS records${NC} ${BLUE}(and waited for propagation)${NC}: " ready_to_continue
    
    log_info "Creating SSL certificate for Wings daemon..."
    log_info "Wings requires SSL certificates for secure communication with the panel."
    log_info "This will be the main domain for your Wings node (not a subdirectory)."
    
    draw_hr
    echo -e "${BOLD}Choose certificate challenge method:${NC}"
    echo -e "  ${GREEN}[1]${NC} ${BOLD}HTTP Challenge${NC} ${BLUE}(Standalone - requires port 80)${NC}"
    echo -e "  ${YELLOW}[2]${NC} ${BOLD}DNS Challenge${NC} ${BLUE}(Manual TXT record)${NC}"
    draw_hr
    prompt "${BOLD}Enter choice${NC} ${BLUE}(1/2)${NC}: " challenge_method
    
    case $challenge_method in
        1)
            log_info "Using HTTP challenge (standalone mode)..."
            log_warn "Make sure port 80 is not in use by other services."
            certbot certonly --standalone -d "$domain" --non-interactive --agree-tos --email admin@"$domain" || {
                log_error "Failed to create certificate with HTTP challenge";
                return 1;
            }
            ;;
        2)
            log_info "Using DNS challenge method..."
            log_warn "This method requires you to manually create TXT DNS records."
            log_info "Certbot will pause and wait for you to create the DNS record."
            log_info "Press Enter to continue when you're ready to start the DNS challenge..."
            read -r
            
            certbot -d "$domain" --manual --preferred-challenges dns certonly --agree-tos --email admin@"$domain" || {
                log_error "Failed to create certificate with DNS challenge";
                return 1;
            }
            ;;
        *)
            log_error "Invalid choice. Please select 1 or 2."
            return 1
            ;;
    esac
    
    # Set proper permissions for FeatherWings (running as root)
    sudo chown -R root:root /etc/letsencrypt/live/"$domain" 2>/dev/null || true
    sudo chown -R root:root /etc/letsencrypt/archive/"$domain" 2>/dev/null || true
    
    log_success "SSL certificate created successfully for FeatherWings ($domain)"
    log_info "Certificate location: /etc/letsencrypt/live/$domain/"
    log_info "You can now configure FeatherWings to use these certificates in /etc/featherpanel/config.yml"
    log_info "Certificate paths:"
    log_info "  - Certificate: /etc/letsencrypt/live/$domain/fullchain.pem"
    log_info "  - Private Key: /etc/letsencrypt/live/$domain/privkey.pem"
}

setup_ssl_auto_renewal() {
    log_step "Setting up SSL certificate auto-renewal..."
    
    if ! command -v certbot >/dev/null 2>&1; then
        log_error "Certbot is not installed. Please install it first."
        return 1
    fi
    
    # Get web server type for restart command
    local restart_command=""
    if systemctl is-active --quiet nginx; then
        restart_command="systemctl restart nginx"
    elif systemctl is-active --quiet apache2; then
        restart_command="systemctl restart apache2"
    elif systemctl is-active --quiet featherwings; then
        restart_command="systemctl restart featherwings"
    else
        restart_command="systemctl reload-or-restart nginx"
    fi
    
    log_info "Detected service for restart: $restart_command"
    
    # Add cron job for auto-renewal
    local cron_job="0 23 * * * certbot renew --quiet --deploy-hook \"$restart_command\""
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "certbot renew"; then
        log_warn "SSL auto-renewal cron job already exists."
        echo "Current cron jobs:"
        crontab -l 2>/dev/null | grep "certbot renew"
        prompt "Do you want to update the existing cron job? (y/n): " update_cron
        if [[ "$update_cron" =~ ^[yY]$ ]]; then
            # Remove old certbot cron jobs
            crontab -l 2>/dev/null | grep -v "certbot renew" | crontab -
            # Add new one
            (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
            log_success "SSL auto-renewal cron job updated."
        fi
    else
        # Add new cron job
        (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
        log_success "SSL auto-renewal cron job added."
    fi
    
    log_info "Certificates will be checked for renewal daily at 23:00 (11 PM)"
    log_info "If renewed, the following command will be executed: $restart_command"
}


setup_nginx_reverse_proxy() {
    local domain="$1"
    local has_ssl="$2"
    
    # Create config directory if it doesn't exist
    sudo mkdir -p /etc/nginx/sites-available
    sudo mkdir -p /etc/nginx/sites-enabled
    
    # Download and customize nginx config
    if [ "$has_ssl" = "true" ]; then
        log_info "Downloading SSL-enabled Nginx configuration..."
        curl -s "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/.github/docker/ssl/nginx.conf" | \
            sed "s/your-domain.com/$domain/g" | \
            sudo tee /etc/nginx/sites-available/featherpanel > /dev/null
    else
        log_info "Downloading HTTP-only Nginx configuration..."
        curl -s "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/.github/docker/plaintext/nginx.conf" | \
            sed "s/your-domain.com/$domain/g" | \
            sudo tee /etc/nginx/sites-available/featherpanel > /dev/null
    fi
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/featherpanel /etc/nginx/sites-enabled/
    
    # Test nginx configuration
    if sudo nginx -t; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration test failed"
        return 1
    fi
}

setup_apache_reverse_proxy() {
    local domain="$1"
    local has_ssl="$2"
    
    # Enable required Apache modules
    log_info "Enabling required Apache modules..."
    sudo a2enmod ssl proxy proxy_http proxy_wstunnel rewrite
    
    # Create config directory if it doesn't exist
    sudo mkdir -p /etc/apache2/sites-available
    
    # Download and customize apache config
    if [ "$has_ssl" = "true" ]; then
        log_info "Downloading SSL-enabled Apache configuration..."
        curl -s "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/.github/docker/ssl/apache2.conf" | \
            sed "s/your-domain.com/$domain/g" | \
            sudo tee /etc/apache2/sites-available/featherpanel.conf > /dev/null
    else
        log_info "Downloading HTTP-only Apache configuration..."
        curl -s "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/.github/docker/plaintext/apache2.conf" | \
            sed "s/your-domain.com/$domain/g" | \
            sudo tee /etc/apache2/sites-available/featherpanel.conf > /dev/null
    fi
    
    # Enable the site
    sudo a2ensite featherpanel
    
    # Test apache configuration
    if sudo apache2ctl configtest; then
        log_success "Apache configuration is valid"
    else
        log_error "Apache configuration test failed"
        return 1
    fi
}

install_acme_sh() {
    log_step "Installing acme.sh (Advanced SSL certificate tool)..."
    
    # Install acme.sh
    curl https://get.acme.sh | sh -s email=admin@example.com || {
        log_error "Failed to install acme.sh";
        return 1;
    }
    
    # Source acme.sh for current session
    source ~/.bashrc
    
    log_success "acme.sh installed successfully."
    log_info "acme.sh is now available for advanced SSL certificate management."
    log_info "For Cloudflare DNS challenge, use: acme.sh --issue --dns dns_cf -d yourdomain.com"
    log_info "For more information, visit: https://github.com/acmesh-official/acme.sh"
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
        case "${FP_COMPONENT:-}" in
            panel) COMPONENT_TYPE="0";;
            wings) COMPONENT_TYPE="1";;
            ssl) COMPONENT_TYPE="2";;
            *) COMPONENT_TYPE="";;
        esac

        while [[ ! "$COMPONENT_TYPE" =~ ^[0-2]$ ]]; do
            show_main_menu
            prompt "${BOLD}Enter component${NC} ${BLUE}(0/1/2)${NC}: " COMPONENT_TYPE
            if [[ ! "$COMPONENT_TYPE" =~ ^[0-2]$ ]]; then
                echo -e "${RED}Invalid input.${NC} Please enter ${YELLOW}0${NC}, ${YELLOW}1${NC} or ${YELLOW}2${NC}."; sleep 1
            fi
        done

        # Show appropriate menu based on component selection
        if [ "$COMPONENT_TYPE" = "0" ]; then
            # Panel operations
            while [[ ! "$INST_TYPE" =~ ^[0-2]$ ]]; do
                show_panel_menu
                prompt "${BOLD}Enter Panel operation${NC} ${BLUE}(0/1/2)${NC}: " INST_TYPE
            if [[ ! "$INST_TYPE" =~ ^[0-2]$ ]]; then
                echo -e "${RED}Invalid input.${NC} Please enter ${YELLOW}0${NC}, ${YELLOW}1${NC} or ${YELLOW}2${NC}."; sleep 1
            fi
        done
        elif [ "$COMPONENT_TYPE" = "1" ]; then
            # Wings operations
            while [[ ! "$INST_TYPE" =~ ^[0-3]$ ]]; do
                show_wings_menu
                prompt "${BOLD}Enter Wings operation${NC} ${BLUE}(0/1/2/3)${NC}: " INST_TYPE
                if [[ ! "$INST_TYPE" =~ ^[0-3]$ ]]; then
                    echo -e "${RED}Invalid input.${NC} Please enter ${YELLOW}0${NC}, ${YELLOW}1${NC}, ${YELLOW}2${NC} or ${YELLOW}3${NC}."; sleep 1
                fi
            done
        else
            # SSL operations
            while [[ ! "$INST_TYPE" =~ ^[0-4]$ ]]; do
                show_ssl_menu
                prompt "${BOLD}Enter SSL operation${NC} ${BLUE}(0/1/2/3/4)${NC}: " INST_TYPE
                if [[ ! "$INST_TYPE" =~ ^[0-4]$ ]]; then
                    echo -e "${RED}Invalid input.${NC} Please enter ${YELLOW}0${NC}, ${YELLOW}1${NC}, ${YELLOW}2${NC}, ${YELLOW}3${NC} or ${YELLOW}4${NC}."; sleep 1
                fi
            done
        fi

        # Environment overrides for non-interactive mode
        case "${FP_ACTION:-}" in
            install) INST_TYPE="0";;
            uninstall) INST_TYPE="1";;
            update) INST_TYPE="2";;
            *) ;;
        esac

        reinstall="n"
CF_TUNNEL_SETUP=""
CF_TUNNEL_TOKEN=""
CF_TUNNEL_MODE=""
CF_API_KEY=""
CF_EMAIL=""
CF_HOSTNAME=""
        confirm="n"

        # Handle operations based on component and action
        if [ "$COMPONENT_TYPE" = "0" ] && [ "$INST_TYPE" = "0" ]; then
            # Panel Install
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
                echo -e "\033[0;33mYou have chosen not to use Cloudflare Tunnel.\033[0m"
                
                # Ask about reverse proxy setup
                echo "Would you like to set up a reverse proxy for FeatherPanel?"
                echo "  [1] Nginx"
                echo "  [2] Apache2"
                echo "  [3] Skip reverse proxy (expose port 4831 directly)"
                prompt "${BOLD}Enter choice${NC} ${BLUE}(1/2/3)${NC}: " REVERSE_PROXY_CHOICE
                
                case $REVERSE_PROXY_CHOICE in
                    1)
                        log_info "Nginx reverse proxy selected."
                        REVERSE_PROXY_TYPE="nginx"
                        ;;
                    2)
                        log_info "Apache2 reverse proxy selected."
                        REVERSE_PROXY_TYPE="apache"
                        ;;
                    3)
                        log_info "No reverse proxy selected. Port 4831 will be exposed directly."
                        REVERSE_PROXY_TYPE="none"
                        ;;
                    *)
                        log_warn "Invalid choice. Skipping reverse proxy setup."
                        REVERSE_PROXY_TYPE="none"
                        ;;
                esac
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

            # Setup reverse proxy if selected and not using Cloudflare Tunnel
            if [ -n "$REVERSE_PROXY_TYPE" ] && [ "$REVERSE_PROXY_TYPE" != "none" ]; then
                log_step "Setting up reverse proxy..."
                
                # Get domain for reverse proxy
                local panel_domain=""
                while [ -z "$panel_domain" ]; do
                    prompt "${BOLD}Enter Panel domain name${NC} ${BLUE}(e.g., panel.example.com)${NC}: " panel_domain
                done
                
                log_info "This will be the main domain for your FeatherPanel (not a subdirectory like /panel)."
                
                if [ "$REVERSE_PROXY_TYPE" = "nginx" ]; then
                    setup_nginx_reverse_proxy "$panel_domain" "false"
                elif [ "$REVERSE_PROXY_TYPE" = "apache" ]; then
                    setup_apache_reverse_proxy "$panel_domain" "false"
                fi
                
                log_info "Reverse proxy configured. You can access FeatherPanel at http://$panel_domain"
                log_info "To add SSL, use the SSL Certificate options after installation."
                fi

            sudo touch /var/www/featherpanel/.installed
            
            # Get public IP for access information
            PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "Unable to detect")
            
            log_success "Panel installation completed successfully!"
            log_warn "IMPORTANT: The Panel may take up to 5 minutes to fully initialize."
            log_info "Please wait at least 5 minutes before trying to access the Panel."
            
            draw_hr
            echo -e "${BOLD}${GREEN}Panel Access Information:${NC}"
            draw_hr
            
            if [[ "$CF_TUNNEL_SETUP" =~ ^[yY]$ ]]; then
                echo -e "${GREEN}✓ Cloudflare Tunnel:${NC} https://$CF_HOSTNAME"
                echo -e "${BLUE}  • Secure HTTPS access via Cloudflare${NC}"
                echo -e "${BLUE}  • No port forwarding required${NC}"
            elif [ -n "$REVERSE_PROXY_TYPE" ] && [ "$REVERSE_PROXY_TYPE" != "none" ]; then
                echo -e "${GREEN}✓ Reverse Proxy:${NC} http://$panel_domain"
                echo -e "${BLUE}  • Add SSL certificate later via SSL menu${NC}"
                echo -e "${BLUE}  • Configure DNS to point to your server${NC}"
            else
                echo -e "${GREEN}✓ Direct Access:${NC}"
                echo -e "${BLUE}  • Local: http://localhost:4831${NC}"
                if [ "$PUBLIC_IP" != "Unable to detect" ]; then
                    echo -e "${BLUE}  • Public: http://$PUBLIC_IP:4831${NC}"
                    echo -e "${YELLOW}  • Ensure port 4831 is open in firewall${NC}"
                else
                    echo -e "${BLUE}  • Public: http://YOUR_SERVER_IP:4831${NC}"
                    echo -e "${YELLOW}  • Replace YOUR_SERVER_IP with your actual server IP${NC}"
                    echo -e "${YELLOW}  • Ensure port 4831 is open in firewall${NC}"
                fi
            fi
            
            draw_hr
            echo -e "${BOLD}${YELLOW}Next Steps:${NC}"
            echo -e "1. ${BLUE}Wait 5 minutes${NC} for the Panel to fully initialize"
            echo -e "2. ${BLUE}Open the Panel URL${NC} in your web browser"
            echo -e "3. ${BLUE}Complete the initial setup${NC} in the Panel interface"
            if [[ ! "$CF_TUNNEL_SETUP" =~ ^[yY]$ ]] && ([ -z "$REVERSE_PROXY_TYPE" ] || [ "$REVERSE_PROXY_TYPE" = "none" ]); then
                echo -e "4. ${BLUE}Consider adding SSL certificate${NC} via SSL menu for security"
            fi
            draw_hr
            
            log_info "Installation log saved at: $LOG_FILE"
        elif [ "$COMPONENT_TYPE" = "0" ] && [ "$INST_TYPE" = "1" ]; then
            # Panel Uninstall
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
        elif [ "$COMPONENT_TYPE" = "0" ] && [ "$INST_TYPE" = "2" ]; then
            # Panel Update
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
            (cd /var/www/featherpanel && sudo docker compose down) >> "$LOG_FILE" 2>&1 || { log_error "Failed applying updated stack"; upload_logs_on_fail; exit 1; }
            (cd /var/www/featherpanel && sudo docker compose up -d) >> "$LOG_FILE" 2>&1 || { log_error "Failed applying updated stack"; upload_logs_on_fail; exit 1; }
            log_success "FeatherPanel updated successfully."
                    exit 0
        elif [ "$COMPONENT_TYPE" = "1" ] && [ "$INST_TYPE" = "0" ]; then
            # Wings Install
            if [ -f /usr/local/bin/featherwings ]; then
                read -r -p "FeatherWings appears to be already installed. Do you want to reinstall? (y/n): " reinstall
                if [ "$reinstall" != "y" ]; then
                    echo "Exiting installation."
                    exit 0
                fi
            fi
            
            # Check if SSL certificate exists
            echo "Wings requires SSL certificates for secure communication with the panel."
            echo "Please create an SSL certificate first using Wings SSL Certificate option (3)."
            echo ""
            echo "Available certificates:"
            if [ -d "/etc/letsencrypt/live" ]; then
                # Only show directories that contain actual certificate files (not README or other files)
                FOUND_CERTS=false
                for domain_dir in /etc/letsencrypt/live/*; do
                    if [ -d "$domain_dir" ] && [ -f "$domain_dir/fullchain.pem" ] && [ -f "$domain_dir/privkey.pem" ]; then
                        domain=$(basename "$domain_dir")
                        echo "  - $domain"
                        FOUND_CERTS=true
                    fi
                done
                if [ "$FOUND_CERTS" = false ]; then
                    echo "  No valid certificates found"
                fi
            else
                echo "  No certificates found"
            fi
            echo ""
            prompt "Do you want to continue with Wings installation? (y/n): " continue_without_cert
            
            if [[ ! "$continue_without_cert" =~ ^[yY]$ ]]; then
                echo "Please create an SSL certificate first, then run Wings installation again."
                exit 0
            fi
            
            install_packages curl jq
            install_wings
            log_success "Wings installation finished. See log at $LOG_FILE"
            log_warn "Remember to configure FeatherWings with SSL certificates in /etc/featherpanel/config.yml"
        elif [ "$COMPONENT_TYPE" = "1" ] && [ "$INST_TYPE" = "1" ]; then
            # Wings Uninstall
            if [ ! -f /usr/local/bin/featherwings ]; then
                echo "FeatherWings does not appear to be installed. Nothing to uninstall."
                exit 0
            fi
            prompt "Are you sure you want to uninstall FeatherWings? (y/n): " confirm
            if [ "$confirm" = "y" ]; then
                uninstall_wings
            else
                echo "Uninstallation cancelled."
                exit 0
            fi
        elif [ "$COMPONENT_TYPE" = "1" ] && [ "$INST_TYPE" = "2" ]; then
            # Wings Update
            if [ ! -f /usr/local/bin/featherwings ]; then
                echo "FeatherWings does not appear to be installed. Nothing to update."
                exit 0
            fi
            print_banner
            update_wings
            log_success "Wings updated successfully."
            exit 0
        elif [ "$COMPONENT_TYPE" = "1" ] && [ "$INST_TYPE" = "3" ]; then
            # Wings SSL Certificate
            if create_wings_ssl_certificate; then
                log_success "Wings SSL certificate creation finished. See log at $LOG_FILE"
            else
                log_error "Wings SSL certificate creation failed. See log at $LOG_FILE"
                draw_hr
                echo -e "${YELLOW}SSL Certificate Creation Failed${NC}"
                echo -e "${BLUE}To fix this issue:${NC}"
                echo -e "1. Go back to main menu and select ${GREEN}SSL Certificates${NC}"
                echo -e "2. Choose ${GREEN}Install Certbot${NC} first"
                echo -e "3. Then return here to create the SSL certificate"
                draw_hr
                exit 1
            fi
        elif [ "$COMPONENT_TYPE" = "2" ] && [ "$INST_TYPE" = "0" ]; then
            # SSL - Install Certbot
            install_certbot
            log_success "SSL certificate tools installation finished. See log at $LOG_FILE"
        elif [ "$COMPONENT_TYPE" = "2" ] && [ "$INST_TYPE" = "1" ]; then
            # SSL - Create Certificate (HTTP/Standalone)
            if create_ssl_certificate_http; then
                log_success "SSL certificate creation finished. See log at $LOG_FILE"
            else
                log_error "SSL certificate creation failed. See log at $LOG_FILE"
                exit 1
            fi
        elif [ "$COMPONENT_TYPE" = "2" ] && [ "$INST_TYPE" = "2" ]; then
            # SSL - Create Certificate (DNS)
            if create_ssl_certificate_dns; then
                log_success "SSL certificate creation finished. See log at $LOG_FILE"
            else
                log_error "SSL certificate creation failed. See log at $LOG_FILE"
                exit 1
            fi
        elif [ "$COMPONENT_TYPE" = "2" ] && [ "$INST_TYPE" = "3" ]; then
            # SSL - Setup Auto-Renewal
            if setup_ssl_auto_renewal; then
                log_success "SSL auto-renewal setup finished. See log at $LOG_FILE"
            else
                log_error "SSL auto-renewal setup failed. See log at $LOG_FILE"
                exit 1
            fi
        elif [ "$COMPONENT_TYPE" = "2" ] && [ "$INST_TYPE" = "4" ]; then
            # SSL - Install acme.sh
            install_acme_sh
            log_success "acme.sh installation finished. See log at $LOG_FILE"
        else
            log_error "Invalid component or operation selected."
            exit 1
        fi
        
    else
        echo "Unsupported OS: $OS"
        exit 1
    fi
else
    echo "Cannot determine OS"
    exit 1
fi