# FeatherPanel
# ==========================================

# Directory configurations
FRONTEND_DIR = frontend
BACKEND_DIR = backend

# Commands
PNPM = pnpm
NPM = npm
PHP = php
COMPOSER = COMPOSER_ALLOW_SUPERUSER=1 composer
SED = sed

# Colors and formatting
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
PURPLE = \033[0;35m
CYAN = \033[0;36m
WHITE = \033[1;37m
BOLD = \033[1m
NC = \033[0m

# Emoji indicators
CHECK = ✓
WARN = ⚠
INFO = ℹ
ROCKET = 🚀
CLEAN = 🧹
PACKAGE = 📦
BUILD = 🔨
SERVER = 🌐
PROD = 🛡️
DEV = 🔍

# Make sure we use bash
SHELL := /bin/bash

.PHONY: help frontend backend dev release install clean test set-prod set-dev

# Default target
help:
	@echo -e "${BOLD}${BLUE}FeatherPanel Build System${NC}"
	@echo -e "${CYAN}================================${NC}\n"
	@echo -e "${BOLD}Available commands:${NC}"
	@echo -e "  ${GREEN}make frontend${NC}    ${ROCKET} Builds the frontend for production"
	@echo -e "  ${GREEN}make backend${NC}     ${BUILD} Builds the backend components"
	@echo -e "  ${GREEN}make release${NC}     ${PACKAGE} Prepares a full release build"
	@echo -e "  ${GREEN}make install${NC}     ${INFO} Installs all dependencies"
	@echo -e "  ${GREEN}make clean${NC}       ${CLEAN} Cleans all build artifacts"
	@echo -e "  ${GREEN}make test${NC}        ${CHECK} Runs all tests"
	@echo -e "  ${GREEN}make set-prod${NC}    ${PROD} Sets APP_DEBUG to false for production\n"
	@echo -e "  ${GREEN}make set-dev${NC}     ${DEV} Sets APP_DEBUG to true for development"
	@echo -e "  ${GREEN}make get-frontend${NC} ${DEV} Uses the official frontend repository instead of the local one"
	@echo -e "  ${GREEN}make download-addon-phpmyadmin${NC} ${PACKAGE} Downloads and sets up phpMyAdmin in frontend/dist/pma"
	@echo -e "${YELLOW}Use 'make <command>' to execute a command${NC}\n"

# Frontend tasks
frontend:
	@echo -e "\n${BOLD}${BLUE}Frontend Build${NC} ${ROCKET}"
	@echo -e "${CYAN}=================${NC}"
	@echo -e "${GREEN}${INFO} Building frontend for production...${NC}"
	@cd $(FRONTEND_DIR) && $(PNPM) build
	@echo -e "${GREEN}${CHECK} Frontend build complete!${NC}\n"

# Backend tasks
backend:
	@echo -e "\n${BOLD}${BLUE}Backend Build${NC} ${BUILD}"
	@echo -e "${CYAN}=================${NC}"
	@echo -e "${GREEN}${INFO} Building backend components...${NC}"
	@cd $(BACKEND_DIR) && $(COMPOSER) install
	@cd $(BACKEND_DIR) && $(COMPOSER) dump-autoload
	@echo -e "${GREEN}${CHECK} Backend build complete!${NC}\n"

clean-license:
	@echo -e "\n${BOLD}${BLUE}Cleaning License${NC} ${CLEAN}"
	@echo -e "${CYAN}=======================${NC}"
	@echo -e "${YELLOW}${WARN} Cleaning license...${NC}"
	@rm -rf /var/www/featherpanel/backend/storage/caches/licenses/*.json 
	@echo -e "${GREEN}${CHECK} License cleaned${NC}\n"

# Release build
release:
	@echo -e "\n${BOLD}${BLUE}Release Build${NC} ${ROCKET}"
	@echo -e "${CYAN}=================${NC}"
	@echo -e "${YELLOW}${WARN} Starting comprehensive release build...${NC}\n"

	@echo -e "${PURPLE}${INFO} Exporting permissions...${NC}"
	@php app exportPermissions
	@echo -e "${GREEN}${CHECK} Permissions exported${NC}\n"

	
	@echo -e "${PURPLE}${INFO} Frontend checks...${NC}"

	@cd $(BACKEND_DIR) && $(COMPOSER) run lint
	@cd $(FRONTEND_DIR) && $(PNPM) lint
	@echo -e "${GREEN}${CHECK} Frontend checks complete${NC}\n"
	
	@echo -e "${PURPLE}${INFO} Updating dependencies...${NC}"
	@cd $(FRONTEND_DIR) && $(PNPM) upgrade
	@cd $(BACKEND_DIR) && $(COMPOSER) update
	@echo -e "${GREEN}${CHECK} Dependencies updated${NC}\n"
	
	@echo -e "${PURPLE}${INFO} Building applications...${NC}"
	@cd $(FRONTEND_DIR) && $(PNPM) build
	@cd $(BACKEND_DIR) && $(COMPOSER) dump-autoload
	@cd $(BACKEND_DIR) && $(COMPOSER) install --optimize-autoloader
	@echo -e "${GREEN}${CHECK} Build complete${NC}\n"
	
	@echo -e "${GREEN}${ROCKET} Release build successful!${NC}\n"
lint: 
	@cd $(BACKEND_DIR) && $(COMPOSER) run lint
	@cd $(FRONTEND_DIR) && $(PNPM) lint
	@echo -e "${GREEN}${CHECK} Linting complete${NC}\n"
# Install dependencies
install:
	@echo -e "\n${BOLD}${BLUE}Installing Dependencies${NC} ${PACKAGE}"
	@echo -e "${CYAN}=======================${NC}"
	@echo -e "${GREEN}${INFO} Installing frontend packages...${NC}"
	@cd $(FRONTEND_DIR) && $(PNPM) install
	@echo -e "${GREEN}${CHECK} Frontend packages installed${NC}\n"
	@echo -e "${GREEN}${INFO} Installing backend packages...${NC}"
	@cd $(BACKEND_DIR) && $(COMPOSER) install
	@echo -e "${GREEN}${CHECK} Backend packages installed${NC}\n"

# Clean build artifacts
clean:
	@echo -e "\n${BOLD}${BLUE}Cleaning Artifacts${NC} ${CLEAN}"
	@echo -e "${CYAN}=======================${NC}"
	@echo -e "${YELLOW}${WARN} Removing artifacts and caches...${NC}"
	@cd $(FRONTEND_DIR) && rm -rf dist node_modules/
	@echo -e "${GREEN}${CHECK} Clean complete!${NC}\n"

# Run tests
test:
	@echo -e "\n${BOLD}${BLUE}Running Tests${NC} ${CHECK}"
	@echo -e "${CYAN}=============${NC}"
	@echo -e "${GREEN}${INFO} Running backend tests...${NC}"
	@cd $(BACKEND_DIR) && $(COMPOSER) test
	@echo -e "${GREEN}${CHECK} All tests complete!${NC}\n"

# Set production mode
set-prod:
	@echo -e "\n${BOLD}${BLUE}Setting Production Mode${NC} ${PROD}"
	@echo -e "${CYAN}=======================${NC}"
	@echo -e "${GREEN}${INFO} Setting APP_DEBUG to false...${NC}"
	@find $(BACKEND_DIR) -type f -name "*.php" -exec $(SED) -i 's/define('\''APP_DEBUG'\'', true);/define('\''APP_DEBUG'\'', false);/g' {} +
	@echo -e "${GREEN}${CHECK} Production mode set successfully!${NC}\n"

set-dev:
	@echo -e "\n${BOLD}${BLUE}Setting Development Mode${NC} ${DEV}"
	@echo -e "${CYAN}=======================${NC}"
	@echo -e "${GREEN}${INFO} Setting APP_DEBUG to true...${NC}"
	@find $(BACKEND_DIR) -type f -name "*.php" -exec $(SED) -i 's/define('\''APP_DEBUG'\'', false);/define('\''APP_DEBUG'\'', true);/g' {} +
	@echo -e "${GREEN}${CHECK} Development mode set successfully!${NC}\n"

download-addon-phpmyadmin: 
	@echo -e "\n${BOLD}${BLUE}Downloading phpMyAdmin${NC} ${PACKAGE}"
	@echo -e "${CYAN}=========================${NC}"
	@echo -e "${YELLOW}${WARN} Checking for existing phpMyAdmin installation...${NC}"
	@if [ -d "$(FRONTEND_DIR)/dist/pma" ]; then \
		echo -e "${YELLOW}${WARN} Removing existing phpMyAdmin installation...${NC}"; \
		rm -rf $(FRONTEND_DIR)/dist/pma; \
		echo -e "${GREEN}${CHECK} Existing installation removed${NC}"; \
	else \
		echo -e "${GREEN}${INFO} No existing installation found${NC}"; \
	fi
	@echo -e "${GREEN}${INFO} Downloading phpMyAdmin 5.2.2...${NC}"
	@cd $(FRONTEND_DIR)/dist && wget -q https://files.phpmyadmin.net/phpMyAdmin/5.2.2/phpMyAdmin-5.2.2-all-languages.zip
	@echo -e "${GREEN}${CHECK} Download complete${NC}\n"
	@echo -e "${GREEN}${INFO} Extracting phpMyAdmin...${NC}"
	@cd $(FRONTEND_DIR)/dist && unzip -q phpMyAdmin-5.2.2-all-languages.zip
	@echo -e "${GREEN}${CHECK} Extraction complete${NC}\n"
	@echo -e "${GREEN}${INFO} Renaming directory to 'pma'...${NC}"
	@cd $(FRONTEND_DIR)/dist && mv phpMyAdmin-5.2.2-all-languages pma
	@echo -e "${GREEN}${CHECK} Directory renamed to 'pma'${NC}\n"
	@echo -e "${GREEN}${INFO} Cleaning up zip file...${NC}"
	@cd $(FRONTEND_DIR)/dist && rm phpMyAdmin-5.2.2-all-languages.zip
	@echo -e "${GREEN}${CHECK} Cleanup complete${NC}\n"
	@echo -e "${GREEN}${INFO} Configuring phpMyAdmin...${NC}"
	@cd $(FRONTEND_DIR)/dist/pma && cp config.sample.inc.php config.inc.php
	@cd $(FRONTEND_DIR)/dist/pma && $(SED) -i 's/$cfg\['\''blowfish_secret'\''\] = '\'''\'';/$cfg\['\''blowfish_secret'\''\] = '\''$(shell openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)'\'';/' config.inc.php
	@cd $(FRONTEND_DIR)/dist/pma && echo '$$cfg["ThemeDefault"] = "darkwolf";' >> config.inc.php
	@cd $(FRONTEND_DIR)/dist/pma && echo '$$cfg["AllowArbitraryServer"] = true;' >> config.inc.php
	@echo -e "${GREEN}${CHECK} Configuration complete${NC}\n"
	@echo -e "${GREEN}${INFO} Downloading darkwolf theme...${NC}"
	@cd $(FRONTEND_DIR)/dist/pma/themes && wget -q https://files.phpmyadmin.net/themes/darkwolf/5.2/darkwolf-5.2.zip
	@echo -e "${GREEN}${CHECK} Theme download complete${NC}\n"
	@echo -e "${GREEN}${INFO} Installing darkwolf theme...${NC}"
	@cd $(FRONTEND_DIR)/dist/pma/themes && unzip -q darkwolf-5.2.zip
	@cd $(FRONTEND_DIR)/dist/pma/themes && if [ ! -d "darkwolf" ]; then mv darkwolf-5.2 darkwolf; fi
	@echo -e "${GREEN}${CHECK} Theme installation complete${NC}\n"
	@echo -e "${GREEN}${INFO} Cleaning up theme files...${NC}"
	@cd $(FRONTEND_DIR)/dist/pma/themes && rm darkwolf-5.2.zip
	@echo -e "${GREEN}${CHECK} Theme cleanup complete${NC}\n"
	@echo -e "${GREEN}${ROCKET} phpMyAdmin setup complete!${NC}\n" 