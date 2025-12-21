#!/bin/bash

# Headless script to install and launch VS Code for backend development in production
# This enables remote development access via VS Code Tunnel

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Print warning banner
echo -e "\n${RED}${BOLD}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}${BOLD}║                     ⚠️   WOAH BUDDY - READ THIS FIRST!   ⚠️                  ║${NC}"
echo -e "${RED}${BOLD}╚════════════════════════════════════════════════════════════════════════════╝${NC}\n"
echo -e "${YELLOW}${BOLD}What you are about to do is RISKY and can break your panel!${NC}"
echo -e "${YELLOW}But who am I to tell you what to do? 🤷\n${NC}"
echo -e "${CYAN}${BOLD}IMPORTANT WARNINGS:${NC}"
echo -e "${CYAN}  • Your changes here will be WIPED on your next update or server restart${NC}"
echo -e "${CYAN}  • Only edit files inside these SAFE directories (they persist):${NC}"
echo -e "${GREEN}    - /var/www/html/public/attachments${NC}"
echo -e "${GREEN}    - /var/www/html/storage/config${NC}"
echo -e "${GREEN}    - /var/www/html/storage/backups${NC}"
echo -e "${CYAN}  • Addons developed here are also WIPED on updates${NC}"
echo -e "${CYAN}  • Make sure to export them via the developer interface before updates!\n${NC}"
echo -e "${YELLOW}This script will:${NC}"
echo -e "  1. Install VS Code (code package)${NC}"
echo -e "  2. Set APP_DEBUG to true (development mode)${NC}"
echo -e "  3. Launch VS Code Tunnel for remote access${NC}\n"
echo -e "${BOLD}Press Ctrl+C now to cancel, or wait 10 seconds to continue...${NC}\n"

# Give user 10 seconds to cancel
sleep 10

echo -e "\n${BLUE}${BOLD}========================================${NC}"
echo -e "${BLUE}${BOLD}  Installing VS Code for Development${NC}"
echo -e "${BLUE}${BOLD}========================================${NC}\n"

# Ensure sudo is available
echo -e "${CYAN}[1/5]${NC} Updating package lists and installing prerequisites..."
apt-get update > /dev/null 2>&1
apt-get install -y sudo curl wget gpg apt-transport-https > /dev/null 2>&1

# Configure Microsoft repository
echo -e "${CYAN}[2/5]${NC} Configuring Microsoft VS Code repository..."
echo "code code/add-microsoft-repo boolean true" | sudo debconf-set-selections > /dev/null 2>&1

# Add Microsoft GPG key
echo -e "${CYAN}[3/5]${NC} Adding Microsoft GPG key..."
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo install -D -o root -g root -m 644 microsoft.gpg /usr/share/keyrings/microsoft.gpg
rm -f microsoft.gpg

# Add VS Code repository
sudo tee /etc/apt/sources.list.d/vscode.sources > /dev/null <<EOF
Types: deb
URIs: https://packages.microsoft.com/repos/code
Suites: stable
Components: main
Architectures: amd64,arm64,armhf
Signed-By: /usr/share/keyrings/microsoft.gpg
EOF

# Install VS Code
echo -e "${CYAN}[4/5]${NC} Installing VS Code (this may take a minute)..."
sudo apt update -y > /dev/null 2>&1
sudo apt install code -y > /dev/null 2>&1

# Fix permissions - ensure /var/www/html remains owned by www-data:www-data
echo -e "${CYAN}[4.5/6]${NC} Restoring file permissions..."
chown -R www-data:www-data /var/www/html > /dev/null 2>&1 || true

# Set development mode (APP_DEBUG = true)
echo -e "${CYAN}[5/6]${NC} Setting development mode (APP_DEBUG = true)..."
BACKEND_DIR="/var/www/html"
if [ -d "$BACKEND_DIR" ]; then
    find "$BACKEND_DIR" -type f -name "*.php" -exec sed -i "s/define('APP_DEBUG', false);/define('APP_DEBUG', true);/g" {} + 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Development mode enabled"
else
    echo -e "${YELLOW}⚠${NC}  Backend directory not found, skipping APP_DEBUG setting"
fi

# Set developer mode setting in panel
echo -e "${CYAN}[6/6]${NC} Setting app_developer_mode in panel configuration..."
CLI_PATH=""
if [ -f "$BACKEND_DIR/cli" ]; then
    CLI_PATH="$BACKEND_DIR/cli"
elif [ -f "/var/www/featherpanel/backend/cli" ]; then
    CLI_PATH="/var/www/featherpanel/backend/cli"
fi

if [ -n "$CLI_PATH" ]; then
    cd "$(dirname "$CLI_PATH")"
    php cli saas setsetting app_developer_mode true > /dev/null 2>&1 && echo -e "${GREEN}✓${NC} Developer mode setting enabled" || echo -e "${YELLOW}⚠${NC}  Could not set developer mode setting (may need database connection)"
else
    echo -e "${YELLOW}⚠${NC}  CLI not found, skipping developer mode setting"
fi

echo -e "\n${GREEN}${BOLD}========================================${NC}"
echo -e "${GREEN}${BOLD}  Installation Complete!${NC}"
echo -e "${GREEN}${BOLD}========================================${NC}\n"
echo -e "${CYAN}VS Code Tunnel will start in the background.${NC}"
echo -e "${CYAN}You'll need to authenticate with your Microsoft/GitHub account.${NC}"
echo -e "${CYAN}After authentication, you'll receive a URL to access VS Code remotely.\n${NC}"
echo -e "${YELLOW}Remember: Only edit files in safe directories!${NC}\n"

# Create PID file directory and set ownership
PID_DIR="/tmp/featherpanel-dev"
mkdir -p "$PID_DIR"
PID_FILE="$PID_DIR/vscode-tunnel.pid"
LOG_FILE="$PID_DIR/vscode-tunnel.log"

# Ensure PID directory is accessible by www-data
chown -R www-data:www-data "$PID_DIR" 2>/dev/null || true
chmod 755 "$PID_DIR" 2>/dev/null || true

# Launch VS Code Tunnel - show output for authentication
echo -e "${CYAN}Starting VS Code Tunnel...${NC}"
echo -e "${YELLOW}You'll see the authentication output below.${NC}"
echo -e "${YELLOW}Look for the GitHub/Microsoft authentication URL in the output!${NC}\n"

# Create VS Code data directory in persistent config volume
# This will persist across updates and restarts!
VSCODE_DATA_DIR="/var/www/html/storage/config/vscode"
VSCODE_CLI_DIR="$VSCODE_DATA_DIR/cli"
echo -e "${CYAN}Setting up VS Code data directory (persistent location)...${NC}"
mkdir -p "$VSCODE_CLI_DIR" 2>/dev/null || true
chown -R www-data:www-data "$VSCODE_DATA_DIR" 2>/dev/null || true
chmod -R 755 "$VSCODE_DATA_DIR" 2>/dev/null || true

# Also create config directory for VS Code settings
VSCODE_CONFIG_DIR="/var/www/html/storage/config/vscode/.config"
mkdir -p "$VSCODE_CONFIG_DIR" 2>/dev/null || true
chown -R www-data:www-data "$VSCODE_CONFIG_DIR" 2>/dev/null || true

# Set HOME to the config directory so VS Code uses the persistent location
WWW_DATA_HOME="/var/www/html/storage/config"

# Run code tunnel with output visible - use tee to show AND log
# Run in foreground so output is visible to PHP's proc_open
# The script will "block" here, but that's fine - PHP streams the output
if command -v tee > /dev/null 2>&1; then
    # Write PID before starting (we'll update it after)
    echo "starting" > "$PID_FILE"
    
    # Set HOME environment variable for www-data and VSCODE_CLI_DATA_DIR
    # This ensures VS Code can write its config files
    VSCODE_ENV="HOME=$WWW_DATA_HOME VSCODE_CLI_DATA_DIR=$VSCODE_DATA_DIR"
    
    # Run code tunnel with tee - output goes to stdout (visible) AND log file
    # This runs in foreground so output is captured by PHP proc_open
    if [ "$EUID" -eq 0 ] || [ -n "$SUDO_USER" ]; then
        # We're root or have sudo, run as www-data with proper environment
        sudo -u www-data bash -c "$VSCODE_ENV code tunnel 2>&1 | tee \"$LOG_FILE\"" &
        TUNNEL_PID=$!
        # Get the actual code tunnel PID (child of the bash process)
        sleep 1
        ACTUAL_PID=$(pgrep -P "$TUNNEL_PID" 2>/dev/null | head -n 1 || pgrep -f "^code tunnel" | head -n 1 || echo "$TUNNEL_PID")
        echo $ACTUAL_PID > "$PID_FILE"
    else
        # Run as current user
        eval "$VSCODE_ENV code tunnel 2>&1 | tee \"$LOG_FILE\"" &
        TUNNEL_PID=$!
        sleep 1
        ACTUAL_PID=$(pgrep -P "$TUNNEL_PID" 2>/dev/null | head -n 1 || pgrep -f "^code tunnel" | head -n 1 || echo "$TUNNEL_PID")
        echo $ACTUAL_PID > "$PID_FILE"
        chown www-data:www-data "$PID_FILE" "$LOG_FILE" 2>/dev/null || true
    fi
    
    # Note: The process is backgrounded but output goes through tee to stdout
    # PHP's proc_open will capture this output and display it
else
    # Fallback if tee not available
    echo -e "${YELLOW}Note: Output will be logged. Starting tunnel...${NC}"
    VSCODE_ENV="HOME=$WWW_DATA_HOME VSCODE_CLI_DATA_DIR=$VSCODE_DATA_DIR"
    if [ "$EUID" -eq 0 ] || [ -n "$SUDO_USER" ]; then
        sudo -u www-data bash -c "$VSCODE_ENV code tunnel > \"$LOG_FILE\" 2>&1 & echo \$!" 2>/dev/null > /tmp/tunnel_pid.tmp
        TUNNEL_PID=$(cat /tmp/tunnel_pid.tmp 2>/dev/null | head -n 1 || echo "")
        rm -f /tmp/tunnel_pid.tmp
        echo $TUNNEL_PID > "$PID_FILE"
    else
        eval "$VSCODE_ENV code tunnel > \"$LOG_FILE\" 2>&1 &"
        TUNNEL_PID=$!
        echo $TUNNEL_PID > "$PID_FILE"
        chown www-data:www-data "$PID_FILE" "$LOG_FILE" 2>/dev/null || true
    fi
    
    # Show initial output
    sleep 3
    if [ -f "$LOG_FILE" ]; then
        echo -e "\n${CYAN}Initial tunnel output (check $LOG_FILE for full output):${NC}"
        tail -n 30 "$LOG_FILE" 2>/dev/null || true
        echo -e "\n${YELLOW}To see live output, run: tail -f $LOG_FILE${NC}"
    fi
fi

# Ensure PID and log files are accessible
chmod 644 "$PID_FILE" "$LOG_FILE" 2>/dev/null || true
chown www-data:www-data "$PID_FILE" "$LOG_FILE" 2>/dev/null || true

# Final permission restoration to ensure www-data ownership is maintained
chown -R www-data:www-data /var/www/html > /dev/null 2>&1 || true
chmod -R 777 /var/www/html > /dev/null 2>&1 || true

# Get final PID for display
FINAL_PID=$(cat "$PID_FILE" 2>/dev/null || echo "unknown")
echo -e "\n${GREEN}✓${NC} VS Code Tunnel process started (PID: $FINAL_PID)"
echo -e "${CYAN}The tunnel is running. Check the output above for the authentication URL.${NC}"
echo -e "${CYAN}Full logs: $LOG_FILE${NC}"
echo -e "${CYAN}To view logs in real-time: tail -f $LOG_FILE${NC}"
echo -e "${CYAN}To stop the tunnel: featherpanel developer stop${NC}\n"