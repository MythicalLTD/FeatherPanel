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

run_with_spinner() {
    local start_message="$1"
    local success_message="$2"
    shift 2

    log_step "$start_message"

    "$@" >> "$LOG_FILE" 2>&1 &
    local cmd_pid=$!
    local spinner="|/-\\"
    local i=0

    if [ -t 1 ]; then
        printf '  '
    fi

    while kill -0 "$cmd_pid" >/dev/null 2>&1; do
        if [ -t 1 ]; then
            printf '\r[%c] %s' "${spinner:i%${#spinner}:1}" "$start_message"
        fi
        i=$(((i + 1) % ${#spinner}))
        sleep 0.15
    done

    wait "$cmd_pid"
    local exit_code=$?

    if [ -t 1 ]; then
        printf '\r\033[K'
    fi

    if [ $exit_code -eq 0 ]; then
        log_success "$success_message"
        return 0
    fi

    log_error "$start_message failed. Check $LOG_FILE for details."
    return $exit_code
}

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

# Helper function for centered, pretty messages
print_centered() {
    local text="$1"
    local color="${2:-$CYAN}"
    local width=60
    local padding=$(( (width - ${#text}) / 2 ))
    printf "%*s${color}${BOLD}%s${NC}\n" $padding "" "$text"
}

print_info_box() {
    local title="$1"
    shift
    local messages=("$@")
    
    if [ -t 1 ]; then clear; fi
    print_banner
    draw_hr
    print_centered "$title" "$YELLOW"
    draw_hr
    echo ""
    for msg in "${messages[@]}"; do
        echo -e "  ${BLUE}${msg}${NC}"
    done
    echo ""
    draw_hr
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
    if [ -t 1 ]; then clear; fi
    print_banner
    draw_hr
    print_centered "Panel Operations" "$CYAN"
    draw_hr
    echo ""
    echo -e "  ${GREEN}${BOLD}[0]${NC} ${BOLD}Install Panel${NC}"
    echo -e "     ${BLUE}→ Install FeatherPanel web interface using Docker${NC}"
    echo -e "     ${BLUE}→ Choose access method (Cloudflare Tunnel, Nginx, Apache, Direct)${NC}"
    echo ""
    echo -e "  ${RED}${BOLD}[1]${NC} ${BOLD}Uninstall Panel${NC}"
    echo -e "     ${YELLOW}⚠️  WARNING: This will remove all Panel data and containers${NC}"
    echo -e "     ${BLUE}→ Stops and removes Docker containers${NC}"
    echo -e "     ${BLUE}→ Removes installation files and configuration${NC}"
    echo ""
    echo -e "  ${YELLOW}${BOLD}[2]${NC} ${BOLD}Update Panel${NC}"
    echo -e "     ${BLUE}→ Pull latest Docker images${NC}"
    echo -e "     ${BLUE}→ Restart containers with new version${NC}"
    echo ""
    draw_hr
}

show_wings_menu() {
    if [ -t 1 ]; then clear; fi
    print_banner
    draw_hr
    print_centered "Wings Operations" "$CYAN"
    draw_hr
    echo ""
    echo -e "  ${GREEN}${BOLD}[0]${NC} ${BOLD}Install Wings${NC}"
    echo -e "     ${BLUE}→ Install FeatherWings game server daemon${NC}"
    echo -e "     ${BLUE}→ Creates systemd service for automatic startup${NC}"
    echo -e "     ${YELLOW}⚠️  Requires SSL certificate (option 3) before installation${NC}"
    echo ""
    echo -e "  ${RED}${BOLD}[1]${NC} ${BOLD}Uninstall Wings${NC}"
    echo -e "     ${YELLOW}⚠️  WARNING: This will remove Wings and its configuration${NC}"
    echo -e "     ${BLUE}→ Stops and removes systemd service${NC}"
    echo -e "     ${BLUE}→ Removes Wings binary and data (optional)${NC}"
    echo ""
    echo -e "  ${YELLOW}${BOLD}[2]${NC} ${BOLD}Update Wings${NC}"
    echo -e "     ${BLUE}→ Download latest Wings binary${NC}"
    echo -e "     ${BLUE}→ Restart Wings service with new version${NC}"
    echo ""
    echo -e "  ${CYAN}${BOLD}[3]${NC} ${BOLD}Create SSL Certificate${NC}"
    echo -e "     ${BLUE}→ Required before installing Wings${NC}"
    echo -e "     ${BLUE}→ Creates Let's Encrypt certificate for Wings domain${NC}"
    echo ""
    draw_hr
}

show_ssl_menu() {
    if [ -t 1 ]; then clear; fi
    print_banner
    draw_hr
    print_centered "SSL Certificate Operations" "$CYAN"
    draw_hr
    echo ""
    echo -e "  ${GREEN}${BOLD}[0]${NC} ${BOLD}Install Certbot${NC}"
    echo -e "     ${BLUE}→ Install Let's Encrypt client (Certbot)${NC}"
    echo -e "     ${BLUE}→ Auto-detects and installs web server plugins${NC}"
    echo ""
    echo -e "  ${BLUE}${BOLD}[1]${NC} ${BOLD}Create Certificate (HTTP)${NC}"
    echo -e "     ${BLUE}→ Uses HTTP challenge method${NC}"
    echo -e "     ${BLUE}→ Requires port 80 to be available${NC}"
    echo -e "     ${BLUE}→ Works with Nginx, Apache, or standalone mode${NC}"
    echo ""
    echo -e "  ${YELLOW}${BOLD}[2]${NC} ${BOLD}Create Certificate (DNS)${NC}"
    echo -e "     ${BLUE}→ Uses DNS challenge method${NC}"
    echo -e "     ${BLUE}→ Requires manual TXT record creation${NC}"
    echo -e "     ${BLUE}→ Works when port 80 is not available${NC}"
    echo ""
    echo -e "  ${CYAN}${BOLD}[3]${NC} ${BOLD}Setup Auto-Renewal${NC}"
    echo -e "     ${BLUE}→ Configures automatic certificate renewal${NC}"
    echo -e "     ${BLUE}→ Creates cron job for daily renewal checks${NC}"
    echo ""
    echo -e "  ${RED}${BOLD}[4]${NC} ${BOLD}Install acme.sh${NC}"
    echo -e "     ${YELLOW}⚠️  Advanced tool for power users${NC}"
    echo -e "     ${BLUE}→ Alternative SSL certificate management tool${NC}"
    echo ""
    draw_hr
}

show_cf_mode_menu() {
    if [ -t 1 ]; then clear; fi
    print_banner
    draw_hr
    echo -e "${BOLD}Cloudflare Tunnel mode:${NC}"
    echo -e "  ${GREEN}[1]${NC} ${BOLD}Full Automatic${NC} ${BLUE}(API Key; creates tunnel + DNS)${NC}"
    echo -e "  ${YELLOW}[2]${NC} ${BOLD}Semi-Automatic${NC} ${BLUE}(provide Tunnel Token)${NC}"
    draw_hr
}

show_access_method_menu() {
    if [ -t 1 ]; then clear; fi
    print_banner
    draw_hr
    echo -e "${BOLD}Choose access method:${NC}"
    echo -e "  ${GREEN}[1]${NC} ${BOLD}Cloudflare Tunnel${NC} ${BLUE}(HTTPS via Cloudflare, no port forwarding)${NC}"
    echo -e "  ${BLUE}[2]${NC} ${BOLD}Nginx Reverse Proxy${NC} ${BLUE}(Traditional reverse proxy)${NC}"
    echo -e "  ${YELLOW}[3]${NC} ${BOLD}Apache2 Reverse Proxy${NC} ${BLUE}(Traditional reverse proxy)${NC}"
    echo -e "  ${CYAN}[4]${NC} ${BOLD}Direct Access${NC} ${BLUE}(Expose port 4831 directly)${NC}"
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

    # Create unique tunnel name based on hostname to avoid conflicts
    # Use hostname as part of tunnel name, sanitize it (remove dots, special chars)
    TUNNEL_NAME_SANITIZED=$(echo "$CF_HOSTNAME" | sed 's/[^a-zA-Z0-9-]/-/g' | tr '[:upper:]' '[:lower:]')
    TUNNEL_NAME="FeatherPanel-${TUNNEL_NAME_SANITIZED}"
    
    # Check if tunnel with this name already exists
    TUNNEL_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel?name=$TUNNEL_NAME" \
         -H "X-Auth-Email: $CF_EMAIL" \
         -H "X-Auth-Key: $CF_API_KEY" \
         -H "Content-Type: application/json" | jq -r '.result[0].id')

    if [ "$TUNNEL_ID" == "null" ] || [ -z "$TUNNEL_ID" ]; then
        # Check if generic "FeatherPanel" tunnel exists (for backward compatibility)
        TUNNEL_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel?name=FeatherPanel" \
             -H "X-Auth-Email: $CF_EMAIL" \
             -H "X-Auth-Key: $CF_API_KEY" \
             -H "Content-Type: application/json" | jq -r '.result[0].id')
        
        if [ "$TUNNEL_ID" == "null" ] || [ -z "$TUNNEL_ID" ]; then
            # No existing tunnel found, create new one with unique name
            log_info "Creating Cloudflare Tunnel '$TUNNEL_NAME'..."
            TUNNEL_CREATE_DATA=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel" \
                 -H "X-Auth-Email: $CF_EMAIL" \
                 -H "X-Auth-Key: $CF_API_KEY" \
                 -H "Content-Type: application/json" \
                 --data "$(jq -n --arg name "$TUNNEL_NAME" '{name:$name}')")
            TUNNEL_ID=$(echo "$TUNNEL_CREATE_DATA" | jq -r '.result.id')
            if [ "$TUNNEL_ID" == "null" ] || [ -z "$TUNNEL_ID" ]; then
                log_error "Could not create Cloudflare Tunnel."
                log_error "API Response: $TUNNEL_CREATE_DATA"
                return 1
            fi
            log_success "Created new Cloudflare Tunnel: $TUNNEL_NAME"
        else
            # Found generic tunnel, ask if user wants to reuse it or create new one
            log_warn "Found existing Cloudflare Tunnel named 'FeatherPanel'."
            draw_hr
            echo -e "${BOLD}${YELLOW}Tunnel Conflict${NC}"
            draw_hr
            echo -e "${BLUE}An existing tunnel named 'FeatherPanel' was found.${NC}"
            echo -e "${BLUE}Would you like to:${NC}"
            echo -e "  ${GREEN}[1]${NC} Reuse existing tunnel (recommended if this is the same server)"
            echo -e "  ${YELLOW}[2]${NC} Create new tunnel with unique name: $TUNNEL_NAME"
            draw_hr
            local tunnel_choice=""
            while [[ ! "$tunnel_choice" =~ ^[12]$ ]]; do
                prompt "${BOLD}Enter choice${NC} ${BLUE}(1/2)${NC}: " tunnel_choice
                if [[ ! "$tunnel_choice" =~ ^[12]$ ]]; then
                    echo -e "${RED}Invalid input.${NC} Enter ${YELLOW}1${NC} or ${YELLOW}2${NC}."; sleep 1
                fi
            done
            
            if [ "$tunnel_choice" == "2" ]; then
                # Create new tunnel with unique name
                log_info "Creating new Cloudflare Tunnel '$TUNNEL_NAME'..."
                TUNNEL_CREATE_DATA=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel" \
                     -H "X-Auth-Email: $CF_EMAIL" \
                     -H "X-Auth-Key: $CF_API_KEY" \
                     -H "Content-Type: application/json" \
                     --data "$(jq -n --arg name "$TUNNEL_NAME" '{name:$name}')")
                TUNNEL_ID=$(echo "$TUNNEL_CREATE_DATA" | jq -r '.result.id')
                if [ "$TUNNEL_ID" == "null" ] || [ -z "$TUNNEL_ID" ]; then
                    log_error "Could not create Cloudflare Tunnel."
                    log_error "API Response: $TUNNEL_CREATE_DATA"
                    return 1
                fi
                log_success "Created new Cloudflare Tunnel: $TUNNEL_NAME"
            else
                log_info "Reusing existing tunnel 'FeatherPanel'."
                TUNNEL_NAME="FeatherPanel"
            fi
        fi
    else
        log_info "Found existing Cloudflare Tunnel: $TUNNEL_NAME (reusing)"
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
    
    # Check if DNS record already exists
    EXISTING_DNS_RECORD=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=CNAME&name=$CF_HOSTNAME" \
        -H "X-Auth-Email: $CF_EMAIL" \
        -H "X-Auth-Key: $CF_API_KEY" \
        -H "Content-Type: application/json" | jq -r '.result[0].id')
    
    TUNNEL_DOMAIN="${TUNNEL_ID}.cfargotunnel.com"
    
    if [ "$EXISTING_DNS_RECORD" != "null" ] && [ -n "$EXISTING_DNS_RECORD" ]; then
        # Update existing DNS record
        log_info "Updating existing DNS record for $CF_HOSTNAME..."
        curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$EXISTING_DNS_RECORD" \
            -H "X-Auth-Email: $CF_EMAIL" \
            -H "X-Auth-Key: $CF_API_KEY" \
            -H "Content-Type: application/json" \
            --data "$(jq -n --arg host "$CF_HOSTNAME" --arg tunnel "$TUNNEL_DOMAIN" '{type:"CNAME",name:$host,content:$tunnel,proxied:true}')" > /dev/null
    else
        # Create new DNS record
        log_info "Creating DNS record for $CF_HOSTNAME..."
        curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
            -H "X-Auth-Email: $CF_EMAIL" \
            -H "X-Auth-Key: $CF_API_KEY" \
            -H "Content-Type: application/json" \
            --data "$(jq -n --arg host "$CF_HOSTNAME" --arg tunnel "$TUNNEL_DOMAIN" '{type:"CNAME",name:$host,content:$tunnel,proxied:true}')" > /dev/null
    fi

    # Get existing tunnel configuration to merge with new ingress rule
    EXISTING_CONFIG_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/configurations" \
        -H "X-Auth-Email: $CF_EMAIL" \
        -H "X-Auth-Key: $CF_API_KEY" \
        -H "Content-Type: application/json")
    
    EXISTING_INGRESS=$(echo "$EXISTING_CONFIG_RESPONSE" | jq '.result.config.ingress // []')
    
    # Check if config exists and has ingress rules
    if [ -n "$EXISTING_INGRESS" ] && [ "$EXISTING_INGRESS" != "null" ] && [ "$(echo "$EXISTING_INGRESS" | jq 'length')" -gt 0 ]; then
        # Merge existing ingress rules with new one
        log_info "Updating tunnel configuration (merging with existing rules)..."
        
        # Check if hostname already exists in ingress rules
        HOSTNAME_EXISTS=$(echo "$EXISTING_INGRESS" | jq -r --arg hostname "$CF_HOSTNAME" '.[] | select(.hostname == $hostname) | .hostname // empty' | head -n 1)
        
        if [ -n "$HOSTNAME_EXISTS" ] && [ "$HOSTNAME_EXISTS" != "null" ] && [ "$HOSTNAME_EXISTS" != "" ]; then
            # Update existing ingress rule for this hostname
            NEW_INGRESS=$(echo "$EXISTING_INGRESS" | jq --arg hostname "$CF_HOSTNAME" 'map(if .hostname == $hostname then {hostname: $hostname, service: "http://localhost:4831"} else . end)')
        else
            # Remove catch-all if it exists, add new rule, then re-add catch-all
            INGRESS_WITHOUT_CATCHALL=$(echo "$EXISTING_INGRESS" | jq 'map(select(.service != "http_status:404"))')
            NEW_INGRESS=$(echo "$INGRESS_WITHOUT_CATCHALL" | jq --arg hostname "$CF_HOSTNAME" '. + [{hostname: $hostname, service: "http://localhost:4831"}] + [{service: "http_status:404"}]')
        fi
        
        curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/configurations" \
            -H "X-Auth-Email: $CF_EMAIL" \
            -H "X-Auth-Key: $CF_API_KEY" \
            -H "Content-Type: application/json" \
            --data "$(jq -n --argjson ingress "$NEW_INGRESS" '{config:{ingress:$ingress}}')" > /dev/null
    else
        # No existing config, create new one
        log_info "Creating tunnel configuration..."
        curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/configurations" \
            -H "X-Auth-Email: $CF_EMAIL" \
            -H "X-Auth-Key: $CF_API_KEY" \
            -H "Content-Type: application/json" \
            --data "$(jq -n --arg hostname "$CF_HOSTNAME" '{config:{ingress:[{hostname:$hostname,service:"http://localhost:4831"},{service:"http_status:404"}]}}')" > /dev/null
    fi

    log_info "Full-automatic Cloudflare Tunnel setup complete."

    # Persist Cloudflare credentials to .env for future uninstall/updates
    ENV_FILE=/var/www/featherpanel/.env
    log_info "Writing Cloudflare settings to $ENV_FILE"
    {
        printf 'CF_EMAIL="%s"\n' "$CF_EMAIL"
        printf 'CF_API_KEY="%s"\n' "$CF_API_KEY"
        printf 'ACCOUNT_ID="%s"\n' "$ACCOUNT_ID"
        printf 'TUNNEL_ID="%s"\n' "$TUNNEL_ID"
        printf 'TUNNEL_NAME="%s"\n' "$TUNNEL_NAME"
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
        if ! run_with_spinner "Starting Cloudflare Tunnel container" "Cloudflare Tunnel container running." \
            docker run -d --network host --restart always cloudflare/cloudflared:latest tunnel --no-autoupdate run --token "$CF_TUNNEL_TOKEN"; then
            return 1
        fi
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
    
    # Check and install Docker first (Wings requires Docker)
    if command -v docker &> /dev/null
    then
        log_info "Docker is already installed."
    else
        log_step "Installing Docker engine (required for Wings, this may take a minute)..."
        curl -sSL https://get.docker.com/ | CHANNEL=stable bash >> "$LOG_FILE" 2>&1
        sudo systemctl enable --now docker 2>&1 | tee -a "$LOG_FILE" >/dev/null
        sudo usermod -aG docker "$USER" 2>&1 | tee -a "$LOG_FILE" >/dev/null || true
        log_success "Docker installed. You may need to re-login for group changes to take effect."
    fi
    
    # Check kernel version for swap support
    KERNEL_VERSION=$(uname -r | cut -d. -f1-2)
    KERNEL_MAJOR=$(echo "$KERNEL_VERSION" | cut -d. -f1)
    KERNEL_MINOR=$(echo "$KERNEL_VERSION" | cut -d. -f2)
    
    if [ "$KERNEL_MAJOR" -lt 6 ] || { [ "$KERNEL_MAJOR" -eq 6 ] && [ "$KERNEL_MINOR" -lt 1 ]; }; then
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
    local webserver_type="${1:-}"  # Optional parameter: "nginx", "apache", or empty for auto-detect
    log_step "Installing Certbot..."
    
    # Update package list (muted)
    sudo apt-get update -qq >> "$LOG_FILE" 2>&1
    
    # Install base certbot
    install_packages certbot
    
    # Detect which web server plugins to install
    plugins_to_install=()
    
    # If webserver type was provided, use it directly
    if [ -n "$webserver_type" ]; then
        case $webserver_type in
            nginx)
                log_info "Installing Nginx plugin (based on your selection)..."
                plugins_to_install+=("python3-certbot-nginx")
                ;;
            apache)
                log_info "Installing Apache plugin (based on your selection)..."
                plugins_to_install+=("python3-certbot-apache")
                ;;
        esac
    else
        # Auto-detect web server
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
            plugin_choice=""
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
    
    if [ -t 1 ]; then clear; fi
    print_banner
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
                log_info "Stopping Nginx temporarily to free port 80..."
                sudo systemctl stop nginx
                certbot certonly --standalone -d "$domain" --non-interactive --agree-tos --email admin@"$domain" || {
                    log_error "Failed to create certificate with standalone method";
                    sudo systemctl start nginx
                    return 1;
                }
                log_info "Restarting Nginx..."
                sudo systemctl start nginx
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
                log_info "Stopping Apache temporarily to free port 80..."
                sudo systemctl stop apache2
                certbot certonly --standalone -d "$domain" --non-interactive --agree-tos --email admin@"$domain" || {
                    log_error "Failed to create certificate with standalone method";
                    sudo systemctl start apache2
                    return 1;
                }
                log_info "Restarting Apache..."
                sudo systemctl start apache2
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
    local config_updated=false
    if [ -f /etc/nginx/sites-enabled/featherpanel ] && grep -q "$domain" /etc/nginx/sites-enabled/featherpanel 2>/dev/null; then
        log_info "Updating existing Nginx configuration to use SSL..."
        curl -s "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/.github/docker/ssl/nginx.conf" | \
            sed "s/your-domain.com/$domain/g" | \
            sudo tee /etc/nginx/sites-available/featherpanel > /dev/null
        if nginx -t 2>&1 | tee -a "$LOG_FILE" >/dev/null; then
            systemctl reload nginx 2>&1 | tee -a "$LOG_FILE" >/dev/null
            log_success "Nginx SSL configuration updated and reloaded successfully"
            config_updated=true
        else
            log_error "Nginx configuration test failed. Check $LOG_FILE for details."
        fi
    elif [ -f /etc/apache2/sites-enabled/featherpanel.conf ] && grep -q "$domain" /etc/apache2/sites-enabled/featherpanel.conf 2>/dev/null; then
        log_info "Updating existing Apache configuration to use SSL..."
        curl -s "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/.github/docker/ssl/apache2.conf" | \
            sed "s/your-domain.com/$domain/g" | \
            sudo tee /etc/apache2/sites-available/featherpanel.conf > /dev/null
        if apache2ctl configtest 2>&1 | tee -a "$LOG_FILE" >/dev/null; then
            systemctl reload apache2 2>&1 | tee -a "$LOG_FILE" >/dev/null
            log_success "Apache SSL configuration updated and reloaded successfully"
            config_updated=true
        else
            log_error "Apache configuration test failed. Check $LOG_FILE for details."
        fi
    fi
    
    # If no existing config was updated, check if we should set up reverse proxy automatically
    if [ "$config_updated" = false ]; then
        # Check if nginx or apache is installed/running
        local webserver_detected=""
        if command -v nginx >/dev/null 2>&1 || systemctl is-active --quiet nginx 2>/dev/null; then
            webserver_detected="nginx"
        elif command -v apache2 >/dev/null 2>&1 || systemctl is-active --quiet apache2 2>/dev/null; then
            webserver_detected="apache"
        fi
        
        if [ -n "$webserver_detected" ]; then
            if [ -t 1 ]; then clear; fi
            print_banner
            draw_hr
            echo -e "${BOLD}${YELLOW}Reverse Proxy Configuration${NC}"
            draw_hr
            echo -e "${BLUE}A web server ($webserver_detected) is detected but not configured for FeatherPanel.${NC}"
            echo -e "${BLUE}Would you like to automatically configure it with SSL for this domain?${NC}"
            setup_reverse_proxy=""
            prompt "${BOLD}Configure $webserver_detected with SSL?${NC} ${BLUE}(y/n)${NC}: " setup_reverse_proxy
            
            if [[ "$setup_reverse_proxy" =~ ^[yY]$ ]]; then
                if [ "$webserver_detected" = "nginx" ]; then
                    if setup_nginx_reverse_proxy "$domain" "true"; then
                        log_success "Nginx reverse proxy configured with SSL for $domain"
                        config_updated=true
                    fi
                elif [ "$webserver_detected" = "apache" ]; then
                    if setup_apache_reverse_proxy "$domain" "true"; then
                        log_success "Apache reverse proxy configured with SSL for $domain"
                        config_updated=true
                    fi
                fi
            fi
        fi
        
        if [ "$config_updated" = false ]; then
            draw_hr
            log_warn "Reverse proxy not automatically configured."
            log_info "To configure your web server manually:"
            log_info "  - Certificate: /etc/letsencrypt/live/$domain/fullchain.pem"
            log_info "  - Private Key: /etc/letsencrypt/live/$domain/privkey.pem"
            log_info "  - Configure your web server to proxy to http://localhost:4831"
            draw_hr
        fi
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
    
    if [ -t 1 ]; then clear; fi
    print_banner
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
    local config_updated=false
    if [ -f /etc/nginx/sites-enabled/featherpanel ] && grep -q "$domain" /etc/nginx/sites-enabled/featherpanel 2>/dev/null; then
        log_info "Updating existing Nginx configuration to use SSL..."
        curl -s "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/.github/docker/ssl/nginx.conf" | \
            sed "s/your-domain.com/$domain/g" | \
            sudo tee /etc/nginx/sites-available/featherpanel > /dev/null
        if nginx -t 2>&1 | tee -a "$LOG_FILE" >/dev/null; then
            systemctl reload nginx 2>&1 | tee -a "$LOG_FILE" >/dev/null
            log_success "Nginx SSL configuration updated and reloaded successfully"
            config_updated=true
        else
            log_error "Nginx configuration test failed. Check $LOG_FILE for details."
        fi
    elif [ -f /etc/apache2/sites-enabled/featherpanel.conf ] && grep -q "$domain" /etc/apache2/sites-enabled/featherpanel.conf 2>/dev/null; then
        log_info "Updating existing Apache configuration to use SSL..."
        curl -s "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/.github/docker/ssl/apache2.conf" | \
            sed "s/your-domain.com/$domain/g" | \
            sudo tee /etc/apache2/sites-available/featherpanel.conf > /dev/null
        if apache2ctl configtest 2>&1 | tee -a "$LOG_FILE" >/dev/null; then
            systemctl reload apache2 2>&1 | tee -a "$LOG_FILE" >/dev/null
            log_success "Apache SSL configuration updated and reloaded successfully"
            config_updated=true
        else
            log_error "Apache configuration test failed. Check $LOG_FILE for details."
        fi
    fi
    
    # If no existing config was updated, check if we should set up reverse proxy automatically
    if [ "$config_updated" = false ]; then
        # Check if nginx or apache is installed/running
        local webserver_detected=""
        if command -v nginx >/dev/null 2>&1 || systemctl is-active --quiet nginx 2>/dev/null; then
            webserver_detected="nginx"
        elif command -v apache2 >/dev/null 2>&1 || systemctl is-active --quiet apache2 2>/dev/null; then
            webserver_detected="apache"
        fi
        
        if [ -n "$webserver_detected" ]; then
            if [ -t 1 ]; then clear; fi
            print_banner
            draw_hr
            echo -e "${BOLD}${YELLOW}Reverse Proxy Configuration${NC}"
            draw_hr
            echo -e "${BLUE}A web server ($webserver_detected) is detected but not configured for FeatherPanel.${NC}"
            echo -e "${BLUE}Would you like to automatically configure it with SSL for this domain?${NC}"
            setup_reverse_proxy=""
            prompt "${BOLD}Configure $webserver_detected with SSL?${NC} ${BLUE}(y/n)${NC}: " setup_reverse_proxy
            
            if [[ "$setup_reverse_proxy" =~ ^[yY]$ ]]; then
                if [ "$webserver_detected" = "nginx" ]; then
                    if setup_nginx_reverse_proxy "$domain" "true"; then
                        log_success "Nginx reverse proxy configured with SSL for $domain"
                        config_updated=true
                    fi
                elif [ "$webserver_detected" = "apache" ]; then
                    if setup_apache_reverse_proxy "$domain" "true"; then
                        log_success "Apache reverse proxy configured with SSL for $domain"
                        config_updated=true
                    fi
                fi
            fi
        fi
        
        if [ "$config_updated" = false ]; then
            draw_hr
            log_warn "Reverse proxy not automatically configured."
            log_info "To configure your web server manually:"
            log_info "  - Certificate: /etc/letsencrypt/live/$domain/fullchain.pem"
            log_info "  - Private Key: /etc/letsencrypt/live/$domain/privkey.pem"
            log_info "  - Configure your web server to proxy to http://localhost:4831"
            draw_hr
        fi
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
    
    if [ -t 1 ]; then clear; fi
    print_banner
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
    challenge_method=""
    prompt "${BOLD}Enter choice${NC} ${BLUE}(1/2)${NC}: " challenge_method
    
    case $challenge_method in
        1)
            log_info "Using HTTP challenge (standalone mode)..."
            
            # Check if any web server is running on port 80 and stop it temporarily
            local stopped_service=""
            if systemctl is-active --quiet nginx; then
                log_info "Stopping Nginx temporarily to free port 80..."
                sudo systemctl stop nginx
                stopped_service="nginx"
            elif systemctl is-active --quiet apache2; then
                log_info "Stopping Apache temporarily to free port 80..."
                sudo systemctl stop apache2
                stopped_service="apache2"
            fi
            
            certbot certonly --standalone -d "$domain" --non-interactive --agree-tos --email admin@"$domain" || {
                log_error "Failed to create certificate with HTTP challenge";
                # Restart the web server if we stopped it
                if [ -n "$stopped_service" ]; then
                    log_info "Restarting $stopped_service..."
                    sudo systemctl start "$stopped_service"
                fi
                return 1;
            }
            
            # Restart the web server if we stopped it
            if [ -n "$stopped_service" ]; then
                log_info "Restarting $stopped_service..."
                sudo systemctl start "$stopped_service"
            fi
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
        update_cron=""
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
    
    install_packages nginx
    systemctl enable nginx 2>&1 | tee -a "$LOG_FILE" >/dev/null || true
    systemctl start nginx 2>&1 | tee -a "$LOG_FILE" >/dev/null || true

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
    if nginx -t 2>&1 | tee -a "$LOG_FILE" >/dev/null; then
        log_success "Nginx configuration is valid"
        if ! run_with_spinner "Reloading Nginx" "Nginx reloaded." sudo systemctl reload nginx; then
            return 1
        fi
    else
        log_error "Nginx configuration test failed"
        return 1
    fi
}

setup_apache_reverse_proxy() {
    local domain="$1"
    local has_ssl="$2"
    
    install_packages apache2
    systemctl enable apache2 2>&1 | tee -a "$LOG_FILE" >/dev/null || true
    systemctl start apache2 2>&1 | tee -a "$LOG_FILE" >/dev/null || true

    # Enable required Apache modules
    log_info "Enabling required Apache modules..."
    a2enmod ssl proxy proxy_http proxy_wstunnel rewrite 2>&1 | tee -a "$LOG_FILE" >/dev/null || true
    
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
    a2ensite featherpanel 2>&1 | tee -a "$LOG_FILE" >/dev/null || true
    
    # Test apache configuration
    if apache2ctl configtest 2>&1 | tee -a "$LOG_FILE" >/dev/null; then
        log_success "Apache configuration is valid"
        if ! run_with_spinner "Reloading Apache" "Apache reloaded." sudo systemctl reload apache2; then
            return 1
        fi
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

install_featherpanel_command() {
    log_step "Installing global 'featherpanel' command..."
    
    # Create the featherpanel command script
    cat <<'EOF' | sudo tee /usr/local/bin/featherpanel > /dev/null
#!/bin/bash
# FeatherPanel CLI wrapper
# Executes commands in the FeatherPanel backend container

# Handle special "run-script" command
if [ "$1" = "run-script" ]; then
    echo "Running featherpanel installer script..."
    curl -sSL https://get.featherpanel.com/beta.sh | bash
    exit $?
fi

CONTAINER_NAME="featherpanel_backend"

# Check if container exists and is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Error: FeatherPanel backend container '${CONTAINER_NAME}' is not running." >&2
    echo "Please ensure FeatherPanel is installed and running." >&2
    exit 1
fi

# Use -it if stdin is a TTY, otherwise use -i only
if [ -t 0 ]; then
    docker exec -it "${CONTAINER_NAME}" php cli "$@"
else
    docker exec -i "${CONTAINER_NAME}" php cli "$@"
fi
EOF
    
    # Make it executable
    sudo chmod +x /usr/local/bin/featherpanel
    
    log_success "Global 'featherpanel' command installed successfully."
    log_info "You can now use 'featherpanel <command>' to run CLI commands."
    log_info "Example: featherpanel help"
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
    
    # Remove global featherpanel command
    if [ -f /usr/local/bin/featherpanel ]; then
        log_info "Removing global 'featherpanel' command..."
        sudo rm -f /usr/local/bin/featherpanel
    fi
    
    rm -rf /var/www/featherpanel
    echo "Docker-based uninstallation complete."
}

ensure_env_cloudflare() {
    ENV_FILE=/var/www/featherpanel/.env
    if [ -f "$ENV_FILE" ]; then
        log_info ".env already exists at /var/www/featherpanel/.env. Skipping creation."
        return 0
    fi
    log_info "Creating /var/www/featherpanel/.env for Cloudflare settings..."
    cat <<EOF | sudo tee "$ENV_FILE" > /dev/null
# Cloudflare settings used by the installer/uninstaller
CF_EMAIL=""
CF_API_KEY=""
CF_HOSTNAME=""
CF_TUNNEL_TOKEN=""
# These will be filled automatically if you choose Full Automatic mode:
ACCOUNT_ID=""
TUNNEL_ID=""
TUNNEL_NAME=""
ZONE_ID=""
EOF
    sudo chmod 600 "$ENV_FILE"
    log_info ".env created for Cloudflare."
}

# Function to check EOL dates and warn users
check_eol_status() {
    local os="$1"
    local version="$2"
    local current_date=$(date +%s)
    local eol_date=""
    local eol_extended_date=""
    local eol_name=""
    local eol_extended_name=""
    local status="supported"
    
    # Define EOL dates (Unix timestamps)
    # Use GNU date format (works on Debian/Ubuntu)
    case "$os" in
        debian)
            case "$version" in
                11)
                    eol_date=$(date -d "2024-08-14" +%s 2>/dev/null || echo "")
                    eol_extended_date=$(date -d "2026-08-31" +%s 2>/dev/null || echo "")
                    eol_name="Standard Support"
                    eol_extended_name="Extended LTS Support"
                    ;;
                12)
                    eol_date=$(date -d "2026-06-10" +%s 2>/dev/null || echo "")
                    eol_extended_date=$(date -d "2028-06-30" +%s 2>/dev/null || echo "")
                    eol_name="Standard Support"
                    eol_extended_name="Extended LTS Support"
                    ;;
                13)
                    eol_date=$(date -d "2028-08-09" +%s 2>/dev/null || echo "")
                    eol_extended_date=$(date -d "2030-06-30" +%s 2>/dev/null || echo "")
                    eol_name="Standard Support"
                    eol_extended_name="Extended LTS Support"
                    ;;
            esac
            ;;
        ubuntu|ubuntu-server)
            case "$version" in
                22.04)
                    eol_date=$(date -d "2027-04-01" +%s 2>/dev/null || echo "")
                    eol_extended_date=$(date -d "2032-04-01" +%s 2>/dev/null || echo "")
                    eol_name="Standard LTS Support"
                    eol_extended_name="Extended Security Maintenance"
                    ;;
                24.04)
                    eol_date=$(date -d "2029-04-01" +%s 2>/dev/null || echo "")
                    eol_extended_date=$(date -d "2034-04-01" +%s 2>/dev/null || echo "")
                    eol_name="Standard LTS Support"
                    eol_extended_name="Extended Security Maintenance"
                    ;;
                25.04)
                    eol_date=$(date -d "2026-01-01" +%s 2>/dev/null || echo "")
                    eol_extended_date=""
                    eol_name="Standard Support"
                    eol_extended_name=""
                    ;;
            esac
            ;;
    esac
    
    # Check EOL status (only if dates were successfully parsed)
    if [ -n "$eol_date" ] && [ "$eol_date" != "" ] && [ "$eol_date" -gt 0 ] 2>/dev/null; then
        if [ "$current_date" -ge "$eol_date" ] 2>/dev/null; then
            # Past standard EOL
            if [ -n "$eol_extended_date" ] && [ "$eol_extended_date" != "" ] && [ "$eol_extended_date" -gt 0 ] 2>/dev/null; then
                if [ "$current_date" -lt "$eol_extended_date" ] 2>/dev/null; then
                    status="extended"
                else
                    status="eol"
                fi
            else
                status="eol"
            fi
        else
            # Calculate days until EOL
            days_until_eol=$(( (eol_date - current_date) / 86400 )) 2>/dev/null || days_until_eol=999999
            if [ "$days_until_eol" -lt 90 ] && [ "$days_until_eol" -gt 0 ]; then
                status="warning"
            fi
        fi
    fi
    
    # Return status via global variables (bash limitation)
    EOL_STATUS="$status"
    EOL_DATE="$eol_date"
    EOL_EXTENDED_DATE="$eol_extended_date"
    EOL_NAME="$eol_name"
    EOL_EXTENDED_NAME="$eol_extended_name"
}

if [ -f /etc/os-release ]; then
    # shellcheck source=/dev/null
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
    
    # Check if OS and version are supported
    SUPPORTED=false
    if [ "$OS" = "debian" ]; then
        if [ "$OS_VERSION" = "11" ] || [ "$OS_VERSION" = "12" ] || [ "$OS_VERSION" = "13" ]; then
            SUPPORTED=true
        fi
    elif [ "$OS" = "ubuntu" ] || [ "$OS" = "ubuntu-server" ]; then
        # Support Ubuntu 22.04 LTS (Jammy), 24.04 LTS (Noble), and 25.04
        if [ "$OS_VERSION" = "22.04" ] || [ "$OS_VERSION" = "24.04" ] || [ "$OS_VERSION" = "25.04" ]; then
            SUPPORTED=true
        fi
    fi
    
    if [ "$SUPPORTED" = false ]; then
        log_error "Unsupported OS or version: $OS $OS_VERSION"
        echo -e "${RED}${BOLD}This installer only supports:${NC}"
        echo -e "  ${GREEN}•${NC} Debian 11, 12, or 13"
        echo -e "  ${GREEN}•${NC} Ubuntu 22.04 LTS, 24.04 LTS, or 25.04"
        echo -e ""
        echo -e "${YELLOW}Your system: $OS $OS_VERSION${NC}"
        support_hint
        exit 1
    fi
    
    # Check EOL status for supported OS
    check_eol_status "$OS" "$OS_VERSION"
    
    # Display EOL warnings if needed
    if [ "$EOL_STATUS" = "eol" ]; then
        echo ""
        draw_hr
        echo -e "${RED}${BOLD}⚠️  CRITICAL WARNING: End of Life Operating System${NC}"
        draw_hr
        echo -e "${YELLOW}Your system ($OS $OS_VERSION) has reached End of Life (EOL).${NC}"
        echo -e "${YELLOW}This means:${NC}"
        echo -e "  ${RED}•${NC} No security updates or patches are available"
        echo -e "  ${RED}•${NC} Your system is vulnerable to security issues"
        echo -e "  ${RED}•${NC} FeatherPanel may not work correctly"
        echo ""
        echo -e "${BOLD}${RED}We strongly recommend upgrading to a supported OS version.${NC}"
        echo ""
        draw_hr
        eol_continue=""
        prompt "${BOLD}${RED}Do you want to continue anyway?${NC} ${BLUE}(NOT RECOMMENDED - type 'yes' to continue)${NC}: " eol_continue
        if [ "$eol_continue" != "yes" ]; then
            echo -e "${GREEN}Installation cancelled. Please upgrade your OS first.${NC}"
            exit 0
        fi
        log_warn "User chose to continue with EOL OS: $OS $OS_VERSION"
    elif [ "$EOL_STATUS" = "extended" ]; then
        echo ""
        draw_hr
        echo -e "${YELLOW}${BOLD}⚠️  Warning: Extended Support Period${NC}"
        draw_hr
        echo -e "${YELLOW}Your system ($OS $OS_VERSION) is past standard support but still in extended support.${NC}"
        echo -e "${BLUE}Extended support provides security updates but limited feature updates.${NC}"
        echo -e "${BLUE}Consider upgrading to a newer version when possible.${NC}"
        echo ""
        draw_hr
        sleep 2
    elif [ "$EOL_STATUS" = "warning" ]; then
        echo ""
        draw_hr
        echo -e "${YELLOW}${BOLD}⚠️  Notice: Approaching End of Life${NC}"
        draw_hr
        if [ -n "$EOL_EXTENDED_DATE" ]; then
            echo -e "${YELLOW}Your system ($OS $OS_VERSION) will reach End of Life soon.${NC}"
            echo -e "${BLUE}Standard support ends soon, but extended support is available.${NC}"
        else
            echo -e "${YELLOW}Your system ($OS $OS_VERSION) will reach End of Life soon.${NC}"
            echo -e "${BLUE}Consider upgrading to a newer version.${NC}"
        fi
        echo ""
        draw_hr
        sleep 2
    fi
    
    log_success "Supported OS detected: $OS $OS_VERSION"
        
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
                echo ""
                prompt "${BOLD}${CYAN}Select operation${NC} ${BLUE}(0/1/2)${NC}: " INST_TYPE
                if [[ ! "$INST_TYPE" =~ ^[0-2]$ ]]; then
                    echo ""
                    echo -e "${RED}${BOLD}✗ Invalid input!${NC}"
                    echo -e "${YELLOW}Please enter ${BOLD}0${NC} (Install), ${BOLD}1${NC} (Uninstall), or ${BOLD}2${NC} (Update)${NC}"
                    echo ""
                    sleep 2
                fi
            done
            
            # Add confirmation for destructive operations
            if [ "$INST_TYPE" = "1" ]; then
                echo ""
                draw_hr
                echo -e "${RED}${BOLD}⚠️  WARNING: Uninstall Operation${NC}"
                draw_hr
                echo -e "${YELLOW}This will permanently delete:${NC}"
                echo -e "  ${RED}•${NC} All FeatherPanel Docker containers"
                echo -e "  ${RED}•${NC} All Panel data and configuration"
                echo -e "  ${RED}•${NC} Installation files"
                echo ""
                draw_hr
                confirm_uninstall=""
                prompt "${BOLD}${RED}Are you absolutely sure you want to uninstall?${NC} ${BLUE}(type 'yes' to confirm)${NC}: " confirm_uninstall
                if [ "$confirm_uninstall" != "yes" ]; then
                    echo -e "${GREEN}Uninstallation cancelled.${NC}"
                    exit 0
                fi
            fi
        elif [ "$COMPONENT_TYPE" = "1" ]; then
            # Wings operations
            while [[ ! "$INST_TYPE" =~ ^[0-3]$ ]]; do
                show_wings_menu
                echo ""
                prompt "${BOLD}${CYAN}Select operation${NC} ${BLUE}(0/1/2/3)${NC}: " INST_TYPE
                if [[ ! "$INST_TYPE" =~ ^[0-3]$ ]]; then
                    echo ""
                    echo -e "${RED}${BOLD}✗ Invalid input!${NC}"
                    echo -e "${YELLOW}Please enter ${BOLD}0${NC} (Install), ${BOLD}1${NC} (Uninstall), ${BOLD}2${NC} (Update), or ${BOLD}3${NC} (SSL)${NC}"
                    echo ""
                    sleep 2
                fi
            done
            
            # Add confirmation for destructive operations
            if [ "$INST_TYPE" = "1" ]; then
                echo ""
                draw_hr
                echo -e "${RED}${BOLD}⚠️  WARNING: Uninstall Operation${NC}"
                draw_hr
                echo -e "${YELLOW}This will permanently delete:${NC}"
                echo -e "  ${RED}•${NC} FeatherWings systemd service"
                echo -e "  ${RED}•${NC} Wings binary"
                echo -e "  ${RED}•${NC} Configuration and data (optional)"
                echo ""
                draw_hr
                confirm_uninstall=""
                prompt "${BOLD}${RED}Are you absolutely sure you want to uninstall?${NC} ${BLUE}(type 'yes' to confirm)${NC}: " confirm_uninstall
                if [ "$confirm_uninstall" != "yes" ]; then
                    echo -e "${GREEN}Uninstallation cancelled.${NC}"
                    exit 0
                fi
            fi
        else
            # SSL operations
            while [[ ! "$INST_TYPE" =~ ^[0-4]$ ]]; do
                show_ssl_menu
                echo ""
                prompt "${BOLD}${CYAN}Select operation${NC} ${BLUE}(0/1/2/3/4)${NC}: " INST_TYPE
                if [[ ! "$INST_TYPE" =~ ^[0-4]$ ]]; then
                    echo ""
                    echo -e "${RED}${BOLD}✗ Invalid input!${NC}"
                    echo -e "${YELLOW}Please enter ${BOLD}0${NC} (Install Certbot), ${BOLD}1${NC} (HTTP Cert), ${BOLD}2${NC} (DNS Cert), ${BOLD}3${NC} (Auto-Renewal), or ${BOLD}4${NC} (acme.sh)${NC}"
                    echo ""
                    sleep 2
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
        has_ssl="false"
        panel_domain=""

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

            # Check for ARM architecture
            ARCH=$(uname -m)
            if [[ "$ARCH" == "aarch64" ]] || [[ "$ARCH" == "arm64" ]] || [[ "$ARCH" == "armv7l" ]] || [[ "$ARCH" == "armv6l" ]]; then
                if [ -t 1 ]; then clear; fi
                print_banner
                draw_hr
                echo -e "${BOLD}${YELLOW}ARM Architecture Detected${NC}"
                draw_hr
                echo -e "${RED}${BOLD}WARNING:${NC} FeatherPanel (web interface) does not support ARM architecture due to dependency limitations."
                echo -e ""
                echo -e "${BLUE}However, FeatherWings (game server daemon) fully supports ARM architecture.${NC}"
                echo -e ""
                echo -e "${YELLOW}What you can do:${NC}"
                echo -e "  ${GREEN}•${NC} Install FeatherWings on this ARM server (fully supported)"
                echo -e "  ${GREEN}•${NC} Install FeatherPanel on an x86_64/amd64 server and connect Wings to it"
                echo -e ""
                draw_hr
                continue_anyway=""
                prompt "${BOLD}Do you want to continue anyway?${NC} ${BLUE}(y/n)${NC}: " continue_anyway
                if [[ ! "$continue_anyway" =~ ^[yY]$ ]]; then
                    echo -e "${YELLOW}Installation cancelled.${NC}"
                    echo -e "${BLUE}Consider installing FeatherWings instead, or use an x86_64/amd64 server for the Panel.${NC}"
                    exit 0
                fi
                log_warn "User chose to continue with Panel installation on ARM architecture (may not work)"
            fi

            # Unified access method selection
            ACCESS_METHOD=""
            # Env override for access method
            if [ -n "${FP_ACCESS_METHOD:-}" ]; then
                ACCESS_METHOD="$FP_ACCESS_METHOD"
            fi
            
            while [[ ! "$ACCESS_METHOD" =~ ^[1-4]$ ]]; do
                show_access_method_menu
                prompt "${BOLD}Enter access method${NC} ${BLUE}(1/2/3/4)${NC}: " ACCESS_METHOD
                if [[ ! "$ACCESS_METHOD" =~ ^[1-4]$ ]]; then
                    echo -e "${RED}Invalid input.${NC} Please enter ${YELLOW}1${NC}, ${YELLOW}2${NC}, ${YELLOW}3${NC} or ${YELLOW}4${NC}."; sleep 1
                fi
            done

            case $ACCESS_METHOD in
                1)
                    # Cloudflare Tunnel
                    CF_TUNNEL_SETUP="y"
                    REVERSE_PROXY_TYPE="none"
                    
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
                        # Show Cloudflare Zero Trust requirements
                        print_info_box "Cloudflare Zero Trust Requirements" \
                            "⚠️  IMPORTANT: Before proceeding, ensure you have:" \
                            "" \
                            "  ${GREEN}✓${NC} Set up Cloudflare Zero Trust in your Cloudflare dashboard" \
                            "  ${GREEN}✓${NC} Added a valid billing address to your Cloudflare account" \
                            "  ${GREEN}✓${NC} Verified your Cloudflare account email" \
                            "" \
                            "${YELLOW}Note:${NC} Cloudflare Tunnels require Zero Trust to be enabled" \
                            "${YELLOW}Note:${NC} A valid billing address is required for tunnel creation"
                        
                        cf_ready=""
                        prompt "${BOLD}${CYAN}Have you set up Cloudflare Zero Trust and added a billing address?${NC} ${BLUE}(y/n)${NC}: " cf_ready
                        if [[ ! "$cf_ready" =~ ^[yY]$ ]]; then
                            echo -e "${YELLOW}Please set up Cloudflare Zero Trust and add a billing address first.${NC}"
                            echo -e "${BLUE}Visit: https://one.dash.cloudflare.com/${NC}"
                            echo -e "${BLUE}Then run this installer again.${NC}"
                            exit 0
                        fi
                        
                        echo ""
                        log_info "Entering Full Automatic setup for Cloudflare Tunnel."
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
                    ;;
                2)
                    # Nginx Reverse Proxy
                    CF_TUNNEL_SETUP="n"
                    REVERSE_PROXY_TYPE="nginx"
                    log_info "Nginx reverse proxy selected."
                    
                    # Get domain immediately
                    if [ -t 1 ]; then clear; fi
                    print_banner
                    draw_hr
                    echo -e "${BOLD}${CYAN}Domain Configuration${NC}"
                    draw_hr
                    while [ -z "$panel_domain" ]; do
                        prompt "${BOLD}Enter Panel domain name${NC} ${BLUE}(e.g., panel.example.com or subdomain.example.com)${NC}: " panel_domain
                        if [ -z "$panel_domain" ]; then
                            echo -e "${RED}Domain name cannot be empty.${NC}"
                        fi
                    done
                    log_info "Domain set to: $panel_domain"
                    ;;
                3)
                    # Apache2 Reverse Proxy
                    CF_TUNNEL_SETUP="n"
                    REVERSE_PROXY_TYPE="apache"
                    log_info "Apache2 reverse proxy selected."
                    
                    # Get domain immediately
                    if [ -t 1 ]; then clear; fi
                    print_banner
                    draw_hr
                    echo -e "${BOLD}${CYAN}Domain Configuration${NC}"
                    draw_hr
                    while [ -z "$panel_domain" ]; do
                        prompt "${BOLD}Enter Panel domain name${NC} ${BLUE}(e.g., panel.example.com or subdomain.example.com)${NC}: " panel_domain
                        if [ -z "$panel_domain" ]; then
                            echo -e "${RED}Domain name cannot be empty.${NC}"
                        fi
                    done
                    log_info "Domain set to: $panel_domain"
                    ;;
                4)
                    # Direct Access
                    CF_TUNNEL_SETUP="n"
                    REVERSE_PROXY_TYPE="none"
                    log_info "Direct access selected. Port 4831 will be exposed directly."
                    ;;
            esac

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

            # Only create Cloudflare .env if Cloudflare Tunnel is selected
            if [[ "$CF_TUNNEL_SETUP" =~ ^[yY]$ ]]; then
                ensure_env_cloudflare
            fi

            if [ ! -f /var/www/featherpanel/docker-compose.yml ]; then
                if ! run_with_spinner "Downloading docker-compose.yml for FeatherPanel" "docker-compose.yml downloaded." \
                    curl -fsSL -o /var/www/featherpanel/docker-compose.yml "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/docker-compose.yml"; then
                    exit 1
                fi
            fi

            print_banner
            
            # Check architecture before starting containers
            ARCH=$(uname -m)
            if [[ "$ARCH" == "aarch64" ]] || [[ "$ARCH" == "arm64" ]] || [[ "$ARCH" == "armv7l" ]] || [[ "$ARCH" == "armv6l" ]]; then
                log_error "ARM architecture detected: $ARCH"
                echo ""
                draw_hr
                echo -e "${RED}${BOLD}⚠️  CRITICAL: ARM Architecture Not Supported${NC}"
                draw_hr
                echo -e "${YELLOW}FeatherPanel Docker images do not support ARM architecture.${NC}"
                echo -e "${YELLOW}The containers will fail to start with 'exec format error'.${NC}"
                echo ""
                echo -e "${BLUE}What you can do:${NC}"
                echo -e "  ${GREEN}•${NC} Install FeatherWings on this ARM server (fully supported)"
                echo -e "  ${GREEN}•${NC} Install FeatherPanel on an x86_64/amd64 server"
                echo -e "  ${GREEN}•${NC} Use FeatherWings on ARM and connect to Panel on x86_64"
                echo ""
                draw_hr
                echo -e "${RED}Installation cannot continue. Please use an x86_64/amd64 system for the Panel.${NC}"
                exit 1
            fi
            
            if ! run_with_spinner "Starting FeatherPanel stack" "FeatherPanel stack started." sudo docker compose up -d; then
                log_error "Failed to start FeatherPanel stack"
                echo ""
                draw_hr
                echo -e "${RED}${BOLD}Container Start Failure${NC}"
                draw_hr
                
                # Check Docker logs for common errors
                log_info "Checking Docker container logs..."
                if command -v docker >/dev/null 2>&1; then
                    cd /var/www/featherpanel || true
                    CONTAINER_LOGS=$(sudo docker compose logs --tail=50 2>&1 || sudo docker-compose logs --tail=50 2>&1 || echo "")
                    
                    if echo "$CONTAINER_LOGS" | grep -qi "exec format error"; then
                        echo -e "${RED}${BOLD}Detected: Exec Format Error${NC}"
                        echo -e "${YELLOW}This typically means the Docker image architecture doesn't match your system.${NC}"
                        ARCH=$(uname -m)
                        echo -e "${YELLOW}Your system architecture: ${BOLD}$ARCH${NC}"
                        echo -e "${YELLOW}FeatherPanel Docker images only support x86_64/amd64 architecture.${NC}"
                        echo ""
                        echo -e "${BLUE}Solution:${NC} Use an x86_64/amd64 system for FeatherPanel installation."
                    elif echo "$CONTAINER_LOGS" | grep -qi "no space left"; then
                        echo -e "${RED}${BOLD}Detected: No Space Left on Device${NC}"
                        echo -e "${YELLOW}Your system is out of disk space.${NC}"
                        echo -e "${BLUE}Solution:${NC} Free up disk space and try again."
                    elif echo "$CONTAINER_LOGS" | grep -qi "permission denied"; then
                        echo -e "${RED}${BOLD}Detected: Permission Denied${NC}"
                        echo -e "${YELLOW}Docker permission issue detected.${NC}"
                        echo -e "${BLUE}Solution:${NC} Ensure Docker is properly configured and you have permissions."
                    else
                        echo -e "${YELLOW}Container logs (last 20 lines):${NC}"
                        echo "$CONTAINER_LOGS" | tail -20
                    fi
                fi
                
                echo ""
                draw_hr
                echo -e "${BLUE}For more details, check:${NC}"
                echo -e "  ${CYAN}•${NC} Docker logs: ${BOLD}sudo docker compose -f /var/www/featherpanel/docker-compose.yml logs${NC}"
                echo -e "  ${CYAN}•${NC} Container status: ${BOLD}sudo docker compose -f /var/www/featherpanel/docker-compose.yml ps${NC}"
                echo -e "  ${CYAN}•${NC} Installation log: ${BOLD}$LOG_FILE${NC}"
                draw_hr
                upload_logs_on_fail
                exit 1
            fi
            
            # Verify containers are actually running
            sleep 2
            if ! sudo docker compose -f /var/www/featherpanel/docker-compose.yml ps | grep -q "Up"; then
                log_error "Containers started but are not running"
                echo ""
                draw_hr
                echo -e "${RED}${BOLD}Container Status Check Failed${NC}"
                draw_hr
                log_info "Container status:"
                sudo docker compose -f /var/www/featherpanel/docker-compose.yml ps
                echo ""
                log_info "Recent container logs:"
                sudo docker compose -f /var/www/featherpanel/docker-compose.yml logs --tail=30
                echo ""
                draw_hr
                upload_logs_on_fail
                exit 1
            fi

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
                
                # Domain should already be set from earlier prompt, but check just in case
                if [ -z "$panel_domain" ]; then
                    if [ -t 1 ]; then clear; fi
                    print_banner
                    draw_hr
                    echo -e "${BOLD}${CYAN}Domain Configuration${NC}"
                    draw_hr
                    while [ -z "$panel_domain" ]; do
                        prompt "${BOLD}Enter Panel domain name${NC} ${BLUE}(e.g., panel.example.com or subdomain.example.com)${NC}: " panel_domain
                        if [ -z "$panel_domain" ]; then
                            echo -e "${RED}Domain name cannot be empty.${NC}"
                        fi
                    done
                fi
                
                log_info "Using domain: $panel_domain"
                log_info "This will be the main domain for your FeatherPanel (not a subdirectory like /panel)."
                
                # Ask if user wants to set up SSL certificate
                setup_ssl_during_install=""
                if [ -t 1 ]; then clear; fi
                print_banner
                draw_hr
                echo -e "${BOLD}${YELLOW}SSL Certificate Setup${NC}"
                draw_hr
                echo -e "${BLUE}Would you like to create an SSL certificate for $panel_domain now?${NC}"
                echo -e "${BLUE}This will set up HTTPS access automatically.${NC}"
                prompt "${BOLD}Create SSL certificate?${NC} ${BLUE}(y/n)${NC}: " setup_ssl_during_install
                
                ssl_created=false
                has_ssl="false"
                
                if [[ "$setup_ssl_during_install" =~ ^[yY]$ ]]; then
                    # Check if certbot is installed
                    if ! command -v certbot >/dev/null 2>&1; then
                        log_info "Certbot is not installed. Installing Certbot..."
                        # Pass the reverse proxy type to auto-install the correct plugin
                        install_certbot "$REVERSE_PROXY_TYPE"
                    fi
                    
                    # Get public IP addresses for DNS guidance
                    log_info "Detecting your server's public IP addresses..."
                    PUBLIC_IPV4=$(curl -s --max-time 10 ifconfig.me 2>/dev/null || curl -s --max-time 10 ipinfo.io/ip 2>/dev/null || echo "")
                    PUBLIC_IPV6=$(curl -s --max-time 10 -6 ifconfig.co 2>/dev/null || echo "")
                    
                    if [ -t 1 ]; then clear; fi
                    print_banner
                    draw_hr
                    echo -e "${BOLD}${YELLOW}DNS Setup Required${NC}"
                    draw_hr
                    echo -e "${BLUE}Before creating the SSL certificate, you must create DNS records:${NC}"
                    echo -e ""
                    echo -e "${GREEN}Create an A record:${NC}"
                    echo -e "  ${BOLD}Name:${NC} $panel_domain"
                    if [ -n "$PUBLIC_IPV4" ]; then
                        echo -e "  ${BOLD}Value:${NC} $PUBLIC_IPV4"
                    else
                        echo -e "  ${BOLD}Value:${NC} ${YELLOW}YOUR_SERVER_IPV4${NC}"
                    fi
                    echo -e "  ${BOLD}TTL:${NC} 300 (or Auto)"
                    echo -e ""
                    
                    if [ -n "$PUBLIC_IPV6" ]; then
                        echo -e "${GREEN}Create an AAAA record (IPv6 support):${NC}"
                        echo -e "  ${BOLD}Name:${NC} $panel_domain"
                        echo -e "  ${BOLD}Value:${NC} $PUBLIC_IPV6"
                        echo -e "  ${BOLD}TTL:${NC} 300 (or Auto)"
                        echo -e ""
                    fi
                    
                    echo -e "${YELLOW}Please create these DNS records in your domain's DNS management panel.${NC}"
                    echo -e "${YELLOW}DNS propagation can take 5-60 minutes depending on your DNS provider.${NC}"
                    echo -e ""
                    prompt "${BOLD}Press Enter when you have created the DNS records${NC} ${BLUE}(and waited for propagation)${NC}: " ready_to_continue
                    
                    # Try to create SSL certificate using HTTP/Standalone method
                    log_step "Creating SSL certificate for $panel_domain..."
                    
                    # Check if web server is running (we'll stop it temporarily if needed)
                    webserver=""
                    if systemctl is-active --quiet nginx; then
                        webserver="nginx"
                    elif systemctl is-active --quiet apache2; then
                        webserver="apache"
                    else
                        webserver="standalone"
                    fi
                    
                    # Create certificate
                    case $webserver in
                        nginx)
                            if dpkg -l | grep -q "^ii.*python3-certbot-nginx"; then
                                log_info "Using Nginx plugin for certificate creation..."
                                if certbot certonly --nginx -d "$panel_domain" --non-interactive --agree-tos --email admin@"$panel_domain" >> "$LOG_FILE" 2>&1; then
                                    ssl_created=true
                                    has_ssl="true"
                                fi
                            else
                                log_warn "Nginx plugin not installed. Using standalone method..."
                                log_info "Stopping Nginx temporarily to free port 80..."
                                sudo systemctl stop nginx
                                if certbot certonly --standalone -d "$panel_domain" --non-interactive --agree-tos --email admin@"$panel_domain" >> "$LOG_FILE" 2>&1; then
                                    ssl_created=true
                                    has_ssl="true"
                                fi
                                log_info "Restarting Nginx..."
                                sudo systemctl start nginx
                            fi
                            ;;
                        apache)
                            if dpkg -l | grep -q "^ii.*python3-certbot-apache"; then
                                log_info "Using Apache plugin for certificate creation..."
                                if certbot certonly --apache -d "$panel_domain" --non-interactive --agree-tos --email admin@"$panel_domain" >> "$LOG_FILE" 2>&1; then
                                    ssl_created=true
                                    has_ssl="true"
                                fi
                            else
                                log_warn "Apache plugin not installed. Using standalone method..."
                                log_info "Stopping Apache temporarily to free port 80..."
                                sudo systemctl stop apache2
                                if certbot certonly --standalone -d "$panel_domain" --non-interactive --agree-tos --email admin@"$panel_domain" >> "$LOG_FILE" 2>&1; then
                                    ssl_created=true
                                    has_ssl="true"
                                fi
                                log_info "Restarting Apache..."
                                sudo systemctl start apache2
                            fi
                            ;;
                        standalone)
                            log_info "Using standalone method for certificate creation..."
                            if certbot certonly --standalone -d "$panel_domain" --non-interactive --agree-tos --email admin@"$panel_domain" >> "$LOG_FILE" 2>&1; then
                                ssl_created=true
                                has_ssl="true"
                            fi
                            ;;
                    esac
                    
                    if [ "$ssl_created" = true ]; then
                        log_success "SSL certificate created successfully for $panel_domain"
                    else
                        log_warn "SSL certificate creation failed. Continuing with HTTP-only setup."
                        log_info "You can create an SSL certificate later using the SSL Certificate menu."
                        has_ssl="false"
                    fi
                fi
                
                # Set up reverse proxy with or without SSL
                if [ "$REVERSE_PROXY_TYPE" = "nginx" ]; then
                    if setup_nginx_reverse_proxy "$panel_domain" "$has_ssl"; then
                        if [ "$has_ssl" = "true" ]; then
                            log_success "Nginx reverse proxy configured with SSL for $panel_domain"
                        else
                            log_success "Nginx reverse proxy configured for $panel_domain"
                        fi
                    fi
                elif [ "$REVERSE_PROXY_TYPE" = "apache" ]; then
                    if setup_apache_reverse_proxy "$panel_domain" "$has_ssl"; then
                        if [ "$has_ssl" = "true" ]; then
                            log_success "Apache reverse proxy configured with SSL for $panel_domain"
                        else
                            log_success "Apache reverse proxy configured for $panel_domain"
                        fi
                    fi
                fi
                
                # Ensure Panel is running
                if ! sudo docker compose -f /var/www/featherpanel/docker-compose.yml ps | grep -q "Up"; then
                    log_info "Ensuring FeatherPanel containers are running..."
                    
                    # Check architecture
                    ARCH=$(uname -m)
                    if [[ "$ARCH" == "aarch64" ]] || [[ "$ARCH" == "arm64" ]] || [[ "$ARCH" == "armv7l" ]] || [[ "$ARCH" == "armv6l" ]]; then
                        log_error "ARM architecture detected: $ARCH"
                        echo ""
                        draw_hr
                        echo -e "${RED}${BOLD}⚠️  CRITICAL: ARM Architecture Not Supported${NC}"
                        draw_hr
                        echo -e "${YELLOW}FeatherPanel Docker images do not support ARM architecture.${NC}"
                        echo -e "${YELLOW}The containers will fail to start with 'exec format error'.${NC}"
                        echo ""
                        echo -e "${BLUE}What you can do:${NC}"
                        echo -e "  ${GREEN}•${NC} Install FeatherWings on this ARM server (fully supported)"
                        echo -e "  ${GREEN}•${NC} Install FeatherPanel on an x86_64/amd64 server"
                        echo ""
                        draw_hr
                        log_warn "Cannot start FeatherPanel on ARM architecture. Reverse proxy configured but Panel will not run."
                    else
                        if ! run_with_spinner "Starting FeatherPanel stack" "FeatherPanel stack started." \
                            bash -c "cd /var/www/featherpanel && sudo docker compose up -d"; then
                            log_error "Failed to start FeatherPanel stack"
                            echo ""
                            draw_hr
                            echo -e "${RED}${BOLD}Container Start Failure${NC}"
                            draw_hr
                            
                            # Check Docker logs for common errors
                            log_info "Checking Docker container logs..."
                            cd /var/www/featherpanel || true
                            CONTAINER_LOGS=$(sudo docker compose logs --tail=50 2>&1 || sudo docker-compose logs --tail=50 2>&1 || echo "")
                            
                            if echo "$CONTAINER_LOGS" | grep -qi "exec format error"; then
                                echo -e "${RED}${BOLD}Detected: Exec Format Error${NC}"
                                echo -e "${YELLOW}This typically means the Docker image architecture doesn't match your system.${NC}"
                                echo -e "${YELLOW}Your system architecture: ${BOLD}$ARCH${NC}"
                                echo -e "${YELLOW}FeatherPanel Docker images only support x86_64/amd64 architecture.${NC}"
                            elif echo "$CONTAINER_LOGS" | grep -qi "no space left"; then
                                echo -e "${RED}${BOLD}Detected: No Space Left on Device${NC}"
                                echo -e "${YELLOW}Your system is out of disk space.${NC}"
                            else
                                echo -e "${YELLOW}Container logs (last 20 lines):${NC}"
                                echo "$CONTAINER_LOGS" | tail -20
                            fi
                            
                            echo ""
                            draw_hr
                            log_warn "Failed to start FeatherPanel. Reverse proxy is configured but Panel is not running."
                            log_info "Check logs: sudo docker compose -f /var/www/featherpanel/docker-compose.yml logs"
                        else
                            # Verify containers are actually running
                            sleep 2
                            if ! sudo docker compose -f /var/www/featherpanel/docker-compose.yml ps | grep -q "Up"; then
                                log_error "Containers started but are not running"
                                log_info "Container status:"
                                sudo docker compose -f /var/www/featherpanel/docker-compose.yml ps
                                log_warn "Panel containers failed to start. Check Docker logs for details."
                            fi
                        fi
                    fi
                else
                    log_info "FeatherPanel containers are already running."
                fi
                
                draw_hr
                if [ "$has_ssl" = "true" ]; then
                    log_info "Reverse proxy configured with SSL. You can access FeatherPanel at https://$panel_domain"
                else
                    log_info "Reverse proxy configured. You can access FeatherPanel at http://$panel_domain"
                    log_info "To add SSL later, use the SSL Certificate options in the main menu."
                fi
                draw_hr
                fi

            sudo touch /var/www/featherpanel/.installed
            
            # Install global featherpanel command
            install_featherpanel_command
            
            # Get public IP for access information
            PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "Unable to detect")
            
            if [ -t 1 ]; then clear; fi
            print_banner
            draw_hr
            print_centered "🎉 Installation Complete!" "$GREEN"
            draw_hr
            echo ""
            
            log_success "Panel installation completed successfully!"
            log_warn "IMPORTANT: The Panel may take up to 5 minutes to fully initialize."
            log_info "Please wait at least 5 minutes before trying to access the Panel."
            
            echo ""
            draw_hr
            print_centered "Panel Access Information" "$CYAN"
            draw_hr
            echo ""
            
            if [[ "$CF_TUNNEL_SETUP" =~ ^[yY]$ ]]; then
                echo -e "  ${GREEN}${BOLD}✓${NC} ${BOLD}Cloudflare Tunnel:${NC} ${CYAN}https://$CF_HOSTNAME${NC}"
                echo -e "     ${BLUE}• Secure HTTPS access via Cloudflare${NC}"
                echo -e "     ${BLUE}• No port forwarding required${NC}"
            elif [ -n "$REVERSE_PROXY_TYPE" ] && [ "$REVERSE_PROXY_TYPE" != "none" ]; then
                if [ "${has_ssl:-false}" = "true" ]; then
                    echo -e "  ${GREEN}${BOLD}✓${NC} ${BOLD}Reverse Proxy with SSL:${NC} ${CYAN}https://$panel_domain${NC}"
                    echo -e "     ${BLUE}• Secure HTTPS access enabled${NC}"
                    echo -e "     ${BLUE}• SSL certificate configured automatically${NC}"
                else
                    echo -e "  ${GREEN}${BOLD}✓${NC} ${BOLD}Reverse Proxy:${NC} ${CYAN}http://$panel_domain${NC}"
                    echo -e "     ${BLUE}• Add SSL certificate later via SSL menu${NC}"
                fi
                echo -e "     ${BLUE}• Configure DNS to point to your server${NC}"
            else
                echo -e "  ${GREEN}${BOLD}✓${NC} ${BOLD}Direct Access:${NC}"
                echo -e "     ${BLUE}• Local: ${CYAN}http://localhost:4831${NC}"
                if [ "$PUBLIC_IP" != "Unable to detect" ]; then
                    echo -e "     ${BLUE}• Public: ${CYAN}http://$PUBLIC_IP:4831${NC}"
                    echo -e "     ${YELLOW}• Ensure port 4831 is open in firewall${NC}"
                else
                    echo -e "     ${BLUE}• Public: ${CYAN}http://YOUR_SERVER_IP:4831${NC}"
                    echo -e "     ${YELLOW}• Replace YOUR_SERVER_IP with your actual server IP${NC}"
                    echo -e "     ${YELLOW}• Ensure port 4831 is open in firewall${NC}"
                fi
            fi
            
            echo ""
            draw_hr
            print_centered "👤 Administrator Account" "$YELLOW"
            draw_hr
            echo ""
            echo -e "  ${BOLD}${CYAN}IMPORTANT:${NC} ${YELLOW}The first user to register will automatically become the administrator.${NC}"
            echo -e "  ${BLUE}Make sure you are the first person to create an account!${NC}"
            echo ""
            draw_hr
            print_centered "📋 Next Steps" "$CYAN"
            draw_hr
            echo ""
            echo -e "  ${GREEN}1.${NC} ${BLUE}Wait 5 minutes${NC} for the Panel to fully initialize"
            echo -e "  ${GREEN}2.${NC} ${BLUE}Open the Panel URL${NC} in your web browser"
            echo -e "  ${GREEN}3.${NC} ${BLUE}Register the first account${NC} (this will be the administrator)"
            echo -e "  ${GREEN}4.${NC} ${BLUE}Complete the initial setup${NC} in the Panel interface"
            if [[ ! "$CF_TUNNEL_SETUP" =~ ^[yY]$ ]] && { [ -z "$REVERSE_PROXY_TYPE" ] || [ "$REVERSE_PROXY_TYPE" = "none" ]; }; then
                echo -e "  ${GREEN}5.${NC} ${BLUE}Consider adding SSL certificate${NC} via SSL menu for security"
            fi
            echo ""
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
            log_step "Updating FeatherPanel components..."
            if [ ! -f /var/www/featherpanel/docker-compose.yml ]; then
                if ! run_with_spinner "Downloading docker-compose.yml for FeatherPanel" "docker-compose.yml downloaded." \
                    curl -fsSL -o /var/www/featherpanel/docker-compose.yml "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/docker-compose.yml"; then
                    upload_logs_on_fail
                    exit 1
                fi
            else
                if ! run_with_spinner "Refreshing docker-compose.yml from upstream" "docker-compose.yml refreshed." \
                    curl -fsSL -o /var/www/featherpanel/docker-compose.yml "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/docker-compose.yml"; then
                    log_warn "Could not refresh compose file; keeping existing copy."
                fi
            fi

            if ! run_with_spinner "Pulling FeatherPanel Docker images" "Docker images updated." bash -c "cd /var/www/featherpanel && sudo docker compose pull"; then
                upload_logs_on_fail
                exit 1
            fi

            if ! run_with_spinner "Stopping existing FeatherPanel containers" "Existing containers stopped." bash -c "cd /var/www/featherpanel && sudo docker compose down"; then
                upload_logs_on_fail
                exit 1
            fi

            # Check architecture before starting containers
            ARCH=$(uname -m)
            if [[ "$ARCH" == "aarch64" ]] || [[ "$ARCH" == "arm64" ]] || [[ "$ARCH" == "armv7l" ]] || [[ "$ARCH" == "armv6l" ]]; then
                log_error "ARM architecture detected: $ARCH"
                echo ""
                draw_hr
                echo -e "${RED}${BOLD}⚠️  CRITICAL: ARM Architecture Not Supported${NC}"
                draw_hr
                echo -e "${YELLOW}FeatherPanel Docker images do not support ARM architecture.${NC}"
                echo -e "${YELLOW}The containers will fail to start with 'exec format error'.${NC}"
                echo ""
                echo -e "${BLUE}What you can do:${NC}"
                echo -e "  ${GREEN}•${NC} Install FeatherWings on this ARM server (fully supported)"
                echo -e "  ${GREEN}•${NC} Install FeatherPanel on an x86_64/amd64 server"
                echo -e "  ${GREEN}•${NC} Use FeatherWings on ARM and connect to Panel on x86_64"
                echo ""
                draw_hr
                echo -e "${RED}Update cannot continue. Please use an x86_64/amd64 system for the Panel.${NC}"
                upload_logs_on_fail
                exit 1
            fi
            
            if ! run_with_spinner "Starting FeatherPanel stack" "FeatherPanel stack started." bash -c "cd /var/www/featherpanel && sudo docker compose up -d"; then
                log_error "Failed to start FeatherPanel stack"
                echo ""
                draw_hr
                echo -e "${RED}${BOLD}Container Start Failure${NC}"
                draw_hr
                
                # Check Docker logs for common errors
                log_info "Checking Docker container logs..."
                cd /var/www/featherpanel || true
                CONTAINER_LOGS=$(sudo docker compose logs --tail=50 2>&1 || sudo docker-compose logs --tail=50 2>&1 || echo "")
                
                if echo "$CONTAINER_LOGS" | grep -qi "exec format error"; then
                    echo -e "${RED}${BOLD}Detected: Exec Format Error${NC}"
                    echo -e "${YELLOW}This typically means the Docker image architecture doesn't match your system.${NC}"
                    ARCH=$(uname -m)
                    echo -e "${YELLOW}Your system architecture: ${BOLD}$ARCH${NC}"
                    echo -e "${YELLOW}FeatherPanel Docker images only support x86_64/amd64 architecture.${NC}"
                    echo ""
                    echo -e "${BLUE}Solution:${NC} Use an x86_64/amd64 system for FeatherPanel installation."
                elif echo "$CONTAINER_LOGS" | grep -qi "no space left"; then
                    echo -e "${RED}${BOLD}Detected: No Space Left on Device${NC}"
                    echo -e "${YELLOW}Your system is out of disk space.${NC}"
                    echo -e "${BLUE}Solution:${NC} Free up disk space and try again."
                elif echo "$CONTAINER_LOGS" | grep -qi "permission denied"; then
                    echo -e "${RED}${BOLD}Detected: Permission Denied${NC}"
                    echo -e "${YELLOW}Docker permission issue detected.${NC}"
                    echo -e "${BLUE}Solution:${NC} Ensure Docker is properly configured and you have permissions."
                else
                    echo -e "${YELLOW}Container logs (last 20 lines):${NC}"
                    echo "$CONTAINER_LOGS" | tail -20
                fi
                
                echo ""
                draw_hr
                echo -e "${BLUE}For more details, check:${NC}"
                echo -e "  ${CYAN}•${NC} Docker logs: ${BOLD}sudo docker compose -f /var/www/featherpanel/docker-compose.yml logs${NC}"
                echo -e "  ${CYAN}•${NC} Container status: ${BOLD}sudo docker compose -f /var/www/featherpanel/docker-compose.yml ps${NC}"
                echo -e "  ${CYAN}•${NC} Installation log: ${BOLD}$LOG_FILE${NC}"
                draw_hr
                upload_logs_on_fail
                exit 1
            fi
            
            # Verify containers are actually running
            sleep 2
            if ! sudo docker compose -f /var/www/featherpanel/docker-compose.yml ps | grep -q "Up"; then
                log_error "Containers started but are not running"
                echo ""
                draw_hr
                echo -e "${RED}${BOLD}Container Status Check Failed${NC}"
                draw_hr
                log_info "Container status:"
                sudo docker compose -f /var/www/featherpanel/docker-compose.yml ps
                echo ""
                log_info "Recent container logs:"
                sudo docker compose -f /var/www/featherpanel/docker-compose.yml logs --tail=30
                echo ""
                draw_hr
                upload_logs_on_fail
                exit 1
            fi

            # Always ensure global featherpanel command is installed/updated
            install_featherpanel_command

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
            continue_without_cert=""
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
    log_error "Cannot determine OS - /etc/os-release not found"
    echo -e "${RED}${BOLD}This installer only supports:${NC}"
    echo -e "  ${GREEN}•${NC} Debian 11, 12, or 13"
    echo -e "  ${GREEN}•${NC} Ubuntu 22.04 LTS, 24.04 LTS, or 25.04"
    support_hint
    exit 1
fi