#!/bin/bash

# FeatherPanel Mail Worker Build Script
set -e

echo "======================================"
echo "FeatherPanel Mail Worker Build Script"
echo "======================================"
echo ""

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "Error: Rust is not installed!"
    echo "Please install Rust from https://rustup.rs/"
    exit 1
fi

echo "✓ Rust is installed"
echo ""

# Check if .env exists, if not copy from example
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✓ .env created"
    echo "⚠ Please edit .env with your database credentials"
    echo ""
fi

# Build in release mode
echo "Building in release mode..."
cargo build --release

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Build successful!"
    echo ""
    echo "Binary location: target/release/featherpanel-mail-worker"
    echo ""
    echo "To run the worker:"
    echo "  ./target/release/featherpanel-mail-worker"
    echo ""
    echo "To install as a system service:"
    echo "  sudo make install-service"
    echo ""
else
    echo "✗ Build failed!"
    exit 1
fi

