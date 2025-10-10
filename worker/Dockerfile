# Multi-stage build for smaller final image
FROM rust:1.83-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy manifests
COPY Cargo.toml ./

# Copy source code
COPY src ./src

# Build the application
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m -u 1000 worker

# Copy binary from builder
COPY --from=builder /app/target/release/featherpanel-mail-worker /usr/local/bin/

# Set ownership
RUN chown worker:worker /usr/local/bin/featherpanel-mail-worker

# Switch to app user
USER worker

# Set working directory
WORKDIR /home/worker

# Run the binary
CMD ["featherpanel-mail-worker"]

