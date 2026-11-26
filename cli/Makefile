# ===========================================================================
# FeatherCli Release Build Script (Linux Makefile)
# ===========================================================================
# This script builds FeatherCli for multiple Linux architectures,
# and packages them with proper naming and metadata.
# ===========================================================================

# === CONFIGURATION ===
PROJECT            ?= FeatherCli.csproj
OUTPUT_DIR         ?= publish
CONFIG             ?= Release
APP_NAME           ?= FeatherCli
VERSION            ?= 1.0.0
DATE_FMT           = $(shell date +%Y-%m-%d)
BUILD_TIME         = $(shell date +%H:%M:%S)
PUBLISHER          ?= MythicalSystems

# === CODE SIGNING (NOT AUTOMATED IN THIS SCRIPT) ===
SIGN_CERT          ?=
SIGN_PASSWORD      ?=
SIGN_TIMESTAMP     ?= http://timestamp.sectigo.com
ENABLE_SIGNING     ?= false

# === ARCHITECTURES TO BUILD ===
# For cross-platform builds, uncomment the platforms you want:
RIDS := linux-x64 linux-arm linux-arm64 win-x64 win-arm64 osx-x64 osx-arm64

# For Linux-only: RIDS := linux-x64 linux-arm linux-arm64
# For Windows-only: RIDS := win-x64 win-arm64
# For macOS-only: RIDS := osx-x64 osx-arm64

all: info clean build summary

.PHONY: all info clean build summary

info:
	@echo ""
	@echo "=================================================================="
	@echo "  FeatherCli Release Builder v$(VERSION)"
	@echo "=================================================================="
	@echo "  Building:   $(APP_NAME) v$(VERSION)"
	@echo "  Date:       $(DATE_FMT)"
	@echo "  Time:       $(BUILD_TIME)"
	@echo "  Config:     $(CONFIG)"
	@echo "  Publisher:  $(PUBLISHER)"
	@echo "  Architectures: $(RIDS)"
	@echo "=================================================================="
	@echo ""

check-dotnet:
	@command -v dotnet >/dev/null 2>&1 || (echo "[ERROR] .NET SDK not found. Please install .NET 8.0 SDK or later." && exit 1)

clean:
	@echo "[*] Cleaning output directory..."
	@if [ -d "$(OUTPUT_DIR)" ]; then rm -rf "$(OUTPUT_DIR)"; fi
	@mkdir -p "$(OUTPUT_DIR)"

build: check-dotnet
	@echo ""
	@echo "[*] Starting builds for: $(RIDS)"
	@for rid in $(RIDS); do \
		echo ""; \
		echo "======================================"; \
		echo "Building for $$rid..."; \
		echo "======================================"; \
		case $$rid in \
			linux-x64)   ARCH_NAME="Linux x64" ;; \
			linux-arm)   ARCH_NAME="Linux ARMv7" ;; \
			linux-arm64) ARCH_NAME="Linux ARM64" ;; \
			win-x64)     ARCH_NAME="Windows x64" ;; \
			win-arm64)   ARCH_NAME="Windows ARM64" ;; \
			osx-x64)     ARCH_NAME="macOS Intel" ;; \
			osx-arm64)   ARCH_NAME="macOS ARM64" ;; \
			*)           ARCH_NAME="$$rid" ;; \
		esac; \
		mkdir -p "$(OUTPUT_DIR)/$$rid"; \
		echo "Building $(APP_NAME) for $$ARCH_NAME..."; \
		dotnet publish $(PROJECT) -c $(CONFIG) -r $$rid --self-contained true \
			/p:PublishSingleFile=true \
			/p:PublishTrimmed=false \
			/p:EnableCompressionInSingleFile=true \
			/p:IncludeNativeLibrariesForSelfExtract=true \
			/p:AssemblyTitle="$(APP_NAME)" \
			/p:AssemblyDescription="Advanced Minecraft launcher for $$ARCH_NAME Linux systems" \
			/p:AssemblyProduct="$(APP_NAME)" \
			/p:AssemblyCompany="$(PUBLISHER)" \
			/p:AssemblyCopyright="Copyright © 2025 $(PUBLISHER). All rights reserved." \
			/p:AssemblyVersion="$(VERSION).0" \
			/p:FileVersion="$(VERSION).0" \
			/p:Version="$(VERSION)" \
			/p:PublisherName="$(PUBLISHER)" \
			--output "$(OUTPUT_DIR)/$$rid" \
			--verbosity quiet ; \
		status=$$?; \
		if [ $$status -ne 0 ]; then \
			echo "[ERROR] Build failed for $$rid"; \
			exit 1; \
		fi; \
		case $$rid in \
			win-*) EXEC="$(APP_NAME).exe" ;; \
			*)     EXEC="$(APP_NAME)" ;; \
		esac; \
		if echo $$rid | grep -q "^win-"; then \
			NEW_EXEC="$(APP_NAME)-$$rid-v$(VERSION).exe"; \
		else \
			NEW_EXEC="$(APP_NAME)-$$rid-v$(VERSION)"; \
		fi; \
		if [ -f "$(OUTPUT_DIR)/$$rid/$$EXEC" ]; then \
			echo "[*] Renaming executable: $$NEW_EXEC"; \
			mv "$(OUTPUT_DIR)/$$rid/$$EXEC" "$(OUTPUT_DIR)/$$rid/$$NEW_EXEC"; \
			if [ ! -z "$$(echo $$rid | grep -v "^win-")" ]; then \
				chmod +x "$(OUTPUT_DIR)/$$rid/$$NEW_EXEC"; \
			fi; \
			SIZE=$$(stat -c%s "$(OUTPUT_DIR)/$$rid/$$NEW_EXEC"); \
			SIZE_MB=$$(expr $$SIZE / 1024 / 1024); \
			echo "[OK] Build completed: $$SIZE_MB MB"; \
		else \
			echo "[ERROR] Executable not found after build for $$rid"; \
		fi \
	done

summary:
	@echo ""; \
	echo "=================================================================="; \
	echo "  BUILD SUMMARY"; \
	echo "=================================================================="; \
	BUILD_INFO="$(OUTPUT_DIR)/build-info.txt"; \
	echo "FeatherCli Build Information" > $$BUILD_INFO; \
	echo "=================================" >> $$BUILD_INFO; \
	echo "Version: $(VERSION)" >> $$BUILD_INFO; \
	echo "Build Date: $(DATE_FMT)" >> $$BUILD_INFO; \
	echo "Build Time: $(BUILD_TIME)" >> $$BUILD_INFO; \
	echo "Configuration: $(CONFIG)" >> $$BUILD_INFO; \
	echo "Publisher: $(PUBLISHER)" >> $$BUILD_INFO; \
	echo "" >> $$BUILD_INFO; \
	echo "Built Architectures:" >> $$BUILD_INFO; \
	for rid in $(RIDS); do \
		case $$rid in \
			linux-x64)   ARCH_NAME="Linux x64" ;; \
			linux-arm)   ARCH_NAME="Linux ARMv7" ;; \
			linux-arm64) ARCH_NAME="Linux ARM64" ;; \
			win-x64)     ARCH_NAME="Windows x64" ;; \
			win-arm64)   ARCH_NAME="Windows ARM64" ;; \
			osx-x64)     ARCH_NAME="macOS Intel" ;; \
			osx-arm64)   ARCH_NAME="macOS ARM64" ;; \
			*)           ARCH_NAME="$$rid" ;; \
		esac; \
		if echo $$rid | grep -q "^win-"; then \
			EXE="$(OUTPUT_DIR)/$$rid/$(APP_NAME)-$$rid-v$(VERSION).exe"; \
		else \
			EXE="$(OUTPUT_DIR)/$$rid/$(APP_NAME)-$$rid-v$(VERSION)"; \
		fi; \
		if [ -f "$$EXE" ]; then \
			SIZE=$$(stat -c%s "$$EXE"); \
			SIZE_MB=$$(expr $$SIZE / 1024 / 1024); \
			echo "  [OK] $$rid ($$ARCH_NAME): $$SIZE_MB MB"; \
			echo "  - $$rid ($$ARCH_NAME): $$SIZE_MB MB" >> $$BUILD_INFO; \
		else \
			echo "  [FAILED] $$rid ($$ARCH_NAME): FAILED"; \
			echo "  - $$rid ($$ARCH_NAME): FAILED" >> $$BUILD_INFO; \
		fi \
	done; \
	echo "" >> $$BUILD_INFO; \
	echo "Code Signing: $(ENABLE_SIGNING)" >> $$BUILD_INFO; \
	echo "" >> $$BUILD_INFO; \
	echo "Installation Instructions:" >> $$BUILD_INFO; \
	echo "1. Download the appropriate version for your system:" >> $$BUILD_INFO; \
	echo "   - linux-x64: For x64 (amd64) Linux systems" >> $$BUILD_INFO; \
	echo "   - linux-arm: For ARMv7 (32-bit ARM) Linux systems" >> $$BUILD_INFO; \
	echo "   - linux-arm64: For ARM64 Linux systems" >> $$BUILD_INFO; \
	echo "   - win-x64: For Windows x64 systems" >> $$BUILD_INFO; \
	echo "   - win-arm64: For Windows ARM64 systems" >> $$BUILD_INFO; \
	echo "   - osx-x64: For macOS Intel systems" >> $$BUILD_INFO; \
	echo "   - osx-arm64: For macOS Apple Silicon systems" >> $$BUILD_INFO; \
	echo "2. For Linux/macOS: Mark the binary as executable: chmod +x $(APP_NAME)-RID-v$(VERSION)" >> $$BUILD_INFO; \
	echo "3. Run the executable - no installation required!" >> $$BUILD_INFO; \
	echo "4. The application is portable and self-contained" >> $$BUILD_INFO; \
	echo ""; \
	echo "Output Directory: $(OUTPUT_DIR)"; \
	echo "Build Info: $${BUILD_INFO}"; \
	echo ""; \
	if [ "$(ENABLE_SIGNING)" != "true" ]; then \
		echo "[NOTE] Code signing not enabled. To enable:"; \
		echo "   1. Obtain a code signing certificate"; \
		echo "   2. Set SIGN_CERT, SIGN_PASSWORD, and SIGN_TIMESTAMP variables"; \
		echo "   3. Set ENABLE_SIGNING=true"; \
	fi; \
	echo "=================================================================="; \
	echo "ALL BUILDS COMPLETED SUCCESSFULLY!"; \
	echo "=================================================================="; \
	echo ""; \
	echo "Files created:"; \
	for rid in $(RIDS); do \
		if echo $$rid | grep -q "^win-"; then \
			EXEC="$(OUTPUT_DIR)/$$rid/$(APP_NAME)-$$rid-v$(VERSION).exe"; \
		else \
			EXEC="$(OUTPUT_DIR)/$$rid/$(APP_NAME)-$$rid-v$(VERSION)"; \
		fi; \
		if [ -f "$$EXEC" ]; then echo "  [FILE] $$(basename $$EXEC)"; fi; \
	done; \
	echo "  [FILE] build-info.txt"; \
	echo ""; \
	echo "Ready for distribution!"

