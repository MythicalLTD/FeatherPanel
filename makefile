# FeatherPanel
# ==========================================

FRONTENDV2_DIR = frontendv2
BACKEND_DIR = backend
RUNNER_DIR = runner
MCP_DIR = mcp

# Only these entrypoints define APP_DEBUG — do not scan the whole tree
APP_DEBUG_FILES = $(BACKEND_DIR)/public/index.php $(BACKEND_DIR)/storage/cron/runner.php

PNPM = pnpm
PHP = php
COMPOSER = COMPOSER_ALLOW_SUPERUSER=1 composer
SED = sed
CARGO = cargo
NODE = node

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

SHELL := /bin/bash

.PHONY: help frontend backend mcp mcp-dev mcp-build runner release install \
	clean test lint lint-backend lint-frontend set-prod set-dev \
	permissions readme-stats ncu-frontend deps-update clean-license

# Default target
help:
	@echo -e "${BOLD}${BLUE}FeatherPanel Build System${NC}"
	@echo -e "${CYAN}================================${NC}\n"
	@echo -e "${BOLD}Build:${NC}"
	@echo -e "  ${GREEN}make frontend${NC}     ${ROCKET} Production frontend (+ docs)"
	@echo -e "  ${GREEN}make backend${NC}      ${BUILD} Composer install (optimized)"
	@echo -e "  ${GREEN}make mcp${NC}          ${BUILD} Build MCP server"
	@echo -e "  ${GREEN}make runner${NC}       ${BUILD} Release-build async runner"
	@echo -e "  ${GREEN}make release${NC}      ${PACKAGE} Full release prep (includes frontend ncu -u)"
	@echo -e ""
	@echo -e "${BOLD}Dev / ops:${NC}"
	@echo -e "  ${GREEN}make install${NC}      ${INFO} Install dependencies"
	@echo -e "  ${GREEN}make lint${NC}         ${CHECK} Lint backend + frontend"
	@echo -e "  ${GREEN}make test${NC}         ${CHECK} Run backend tests"
	@echo -e "  ${GREEN}make mcp-dev${NC}      ${SERVER} MCP HTTP server (tsx watch)"
	@echo -e "  ${GREEN}make set-prod${NC}     ${PROD} APP_DEBUG=false on entrypoints"
	@echo -e "  ${GREEN}make set-dev${NC}      ${DEV} APP_DEBUG=true on entrypoints"
	@echo -e "  ${GREEN}make clean${NC}        ${CLEAN} Remove build artifacts"
	@echo -e "  ${GREEN}make deps-update${NC}  ${WARN} Bump frontend + backend + mcp deps"
	@echo -e "  ${GREEN}make permissions${NC}  ${INFO} Export permissions"
	@echo -e "  ${GREEN}make readme-stats${NC} ${INFO} Local README stats (CI: readme-stats.yml)"
	@echo -e "${YELLOW}Use 'make <command>' to execute a command${NC}\n"

# ------------------------------------------
# Core build targets
# ------------------------------------------

frontend:
	@echo -e "\n${BOLD}${BLUE}Frontend Build${NC} ${ROCKET}"
	@echo -e "${CYAN}=================${NC}"
	@cd $(FRONTENDV2_DIR) && $(PNPM) build:with-docs
	@echo -e "${GREEN}${CHECK} Frontend build complete${NC}\n"

backend:
	@echo -e "\n${BOLD}${BLUE}Backend Build${NC} ${BUILD}"
	@echo -e "${CYAN}=================${NC}"
	@cd $(BACKEND_DIR) && $(COMPOSER) install --optimize-autoloader
	@echo -e "${GREEN}${CHECK} Backend build complete${NC}\n"

mcp mcp-build:
	@echo -e "\n${BOLD}${BLUE}MCP Build${NC} ${BUILD}"
	@echo -e "${CYAN}=================${NC}"
	@if [ ! -d $(MCP_DIR)/node_modules ]; then cd $(MCP_DIR) && $(PNPM) install; fi
	@cd $(MCP_DIR) && $(PNPM) run build
	@echo -e "${GREEN}${CHECK} MCP build complete${NC}\n"

runner:
	@echo -e "\n${BOLD}${BLUE}Runner Build${NC} ${BUILD}"
	@echo -e "${CYAN}=================${NC}"
	@cd $(RUNNER_DIR) && $(CARGO) build --release
	@echo -e "${GREEN}${CHECK} Runner built${NC}\n"

# Local MCP HTTP server (Streamable HTTP on :3001)
# Env: FEATHERPANEL_URL (default http://127.0.0.1:4831), optional FEATHERPANEL_API_KEY for stdio only
mcp-dev:
	@echo -e "\n${BOLD}${BLUE}MCP Dev Server${NC} ${SERVER}"
	@echo -e "${CYAN}=================${NC}"
	@echo -e "${GREEN}${INFO} Starting MCP on http://0.0.0.0:$${MCP_PORT:-3001}/mcp${NC}"
	@echo -e "${YELLOW}${INFO} Set FEATHERPANEL_URL to your panel (default http://127.0.0.1:4831)${NC}"
	@cd $(MCP_DIR) && FEATHERPANEL_URL=$${FEATHERPANEL_URL:-http://127.0.0.1:4831} MCP_HOST=$${MCP_HOST:-0.0.0.0} MCP_PORT=$${MCP_PORT:-3001} $(PNPM) run dev

# ------------------------------------------
# Release — ordered, fail-fast; README stats live in CI
# ------------------------------------------
# Frontend ncu -u stays in release (needed).
# Full composer/mcp bumps: `make deps-update`.
# README code stats: `.github/workflows/readme-stats.yml` (or `make readme-stats` locally).

release:
	@echo -e "\n${BOLD}${BLUE}Release Build${NC} ${ROCKET}"
	@echo -e "${CYAN}=================${NC}"
	@echo -e "${YELLOW}${WARN} Release prep (ncu frontend, checks, then builds)${NC}\n"
	@$(MAKE) --no-print-directory permissions
	@$(MAKE) --no-print-directory set-prod
	@$(MAKE) --no-print-directory ncu-frontend
	@$(MAKE) --no-print-directory install
	@$(MAKE) --no-print-directory lint-backend
	@$(MAKE) --no-print-directory test
	@$(MAKE) --no-print-directory frontend
	@$(MAKE) --no-print-directory mcp
	@$(MAKE) --no-print-directory runner
	@echo -e "${GREEN}${ROCKET} Release build successful!${NC}\n"
	@echo -e "${CYAN}${INFO} README stats are updated by CI (readme-stats.yml)${NC}\n"

permissions:
	@echo -e "${PURPLE}${INFO} Exporting permissions...${NC}"
	@$(PHP) app exportPermissions
	@echo -e "${GREEN}${CHECK} Permissions exported${NC}\n"

# Kept for local/manual use — release does not run this (CI owns it)
readme-stats:
	@echo -e "${PURPLE}${INFO} Updating README code stats...${NC}"
	@$(NODE) .github/tools/count.js --update-readme
	@echo -e "${GREEN}${CHECK} README updated${NC}\n"

# ------------------------------------------
# Quality
# ------------------------------------------

lint: lint-backend lint-frontend

lint-backend:
	@echo -e "${PURPLE}${INFO} Backend lint...${NC}"
	@cd $(BACKEND_DIR) && $(COMPOSER) run lint
	@echo -e "${GREEN}${CHECK} Backend lint complete${NC}\n"

lint-frontend:
	@echo -e "${PURPLE}${INFO} Frontend lint...${NC}"
	@cd $(FRONTENDV2_DIR) && $(PNPM) lint
	@echo -e "${GREEN}${CHECK} Frontend lint complete${NC}\n"

test:
	@echo -e "\n${BOLD}${BLUE}Running Tests${NC} ${CHECK}"
	@echo -e "${CYAN}=============${NC}"
	@cd $(BACKEND_DIR) && $(COMPOSER) test
	@echo -e "${GREEN}${CHECK} Backend tests complete${NC}\n"

# ------------------------------------------
# Dependencies
# ------------------------------------------

ncu-frontend:
	@echo -e "${PURPLE}${INFO} Bumping frontend deps (ncu -u)...${NC}"
	@cd $(FRONTENDV2_DIR) && npx --yes npm-check-updates -u
	@cd $(FRONTENDV2_DIR) && $(PNPM) install
	@echo -e "${GREEN}${CHECK} Frontend deps updated${NC}\n"

install:
	@echo -e "\n${BOLD}${BLUE}Installing Dependencies${NC} ${PACKAGE}"
	@echo -e "${CYAN}=======================${NC}"
	@cd $(FRONTENDV2_DIR) && $(PNPM) install
	@cd $(BACKEND_DIR) && $(COMPOSER) install --optimize-autoloader
	@cd $(MCP_DIR) && $(PNPM) install
	@echo -e "${GREEN}${CHECK} Dependencies installed${NC}\n"

# Broader bump (frontend ncu + composer update + mcp) — optional
deps-update:
	@echo -e "\n${BOLD}${BLUE}Updating Dependencies${NC} ${WARN}"
	@echo -e "${CYAN}=======================${NC}"
	@$(MAKE) --no-print-directory ncu-frontend
	@echo -e "${YELLOW}${WARN} Running composer update...${NC}"
	@cd $(BACKEND_DIR) && $(COMPOSER) update
	@cd $(MCP_DIR) && $(PNPM) update
	@echo -e "${GREEN}${CHECK} Dependencies updated — review lockfile diffs before committing${NC}\n"

# ------------------------------------------
# Mode / cleanup
# ------------------------------------------

set-prod:
	@echo -e "\n${BOLD}${BLUE}Setting Production Mode${NC} ${PROD}"
	@echo -e "${CYAN}=======================${NC}"
	@$(SED) -i "s/define('APP_DEBUG', true);/define('APP_DEBUG', false);/g" $(APP_DEBUG_FILES)
	@echo -e "${GREEN}${CHECK} APP_DEBUG=false on entrypoints${NC}\n"

set-dev:
	@echo -e "\n${BOLD}${BLUE}Setting Development Mode${NC} ${DEV}"
	@echo -e "${CYAN}=======================${NC}"
	@$(SED) -i "s/define('APP_DEBUG', false);/define('APP_DEBUG', true);/g" $(APP_DEBUG_FILES)
	@echo -e "${GREEN}${CHECK} APP_DEBUG=true on entrypoints${NC}\n"

clean:
	@echo -e "\n${BOLD}${BLUE}Cleaning Artifacts${NC} ${CLEAN}"
	@echo -e "${CYAN}=======================${NC}"
	@rm -rf $(FRONTENDV2_DIR)/dist $(FRONTENDV2_DIR)/.next $(FRONTENDV2_DIR)/node_modules
	@rm -rf $(MCP_DIR)/dist $(MCP_DIR)/node_modules
	@rm -rf $(RUNNER_DIR)/target/release $(RUNNER_DIR)/target/debug
	@echo -e "${GREEN}${CHECK} Clean complete${NC}\n"

clean-license:
	@echo -e "\n${BOLD}${BLUE}Cleaning License${NC} ${CLEAN}"
	@echo -e "${CYAN}=======================${NC}"
	@rm -rf $(BACKEND_DIR)/storage/caches/licenses/*.json
	@echo -e "${GREEN}${CHECK} License cleaned${NC}\n"
