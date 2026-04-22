# syntax=docker/dockerfile:1.7

# Build stage
FROM rust:1.93-slim as builder

WORKDIR /build

# Install dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Pre-build dependencies in a stable layer.
# This keeps dependency compilation cached when only app source changes.
RUN mkdir -p src && \
    printf "fn main() {}\n" > src/main.rs

# Cache Cargo registry/git and target directory across builds.
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/build/target \
    cargo build --release

# Copy source
COPY src ./src

# Build release binary
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/build/target \
    cargo build --release && \
    cp /build/target/release/async-runner /build/async-runner

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/* \
    && printf '\n# Prefer IPv4 when both A and AAAA exist (container often has no IPv6 route)\nprecedence ::ffff:0:0/96 100\n' >> /etc/gai.conf

# Copy binary from builder
COPY --from=builder /build/async-runner /app/runner

# Create non-root user
RUN useradd -m -u 1000 runner && chown -R runner:runner /app
USER runner

CMD ["/app/runner"]
