.PHONY: build run clean test install release docker-build docker-run

# Build in debug mode
build:
	cargo build

# Build in release mode
release:
	cargo build --release

# Run in development mode
run:
	cargo run

# Run tests
test:
	cargo test

# Clean build artifacts
clean:
	cargo clean

# Install to system (requires sudo)
install: release
	sudo cp target/release/featherpanel-mail-worker /usr/local/bin/
	sudo chmod +x /usr/local/bin/featherpanel-mail-worker

# Install systemd service
install-service: install
	sudo cp featherpanel-mail-worker.service /etc/systemd/system/
	sudo systemctl daemon-reload
	sudo systemctl enable featherpanel-mail-worker
	@echo "Service installed. Start with: sudo systemctl start featherpanel-mail-worker"

# Build Docker image
docker-build:
	docker build -t featherpanel-mail-worker .

# Run Docker container
docker-run: docker-build
	docker-compose up -d

# Stop Docker container
docker-stop:
	docker-compose down

# View Docker logs
docker-logs:
	docker-compose logs -f

# Format code
fmt:
	cargo fmt

# Run clippy linter
lint:
	cargo clippy -- -D warnings

# Check code without building
check:
	cargo check

