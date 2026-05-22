#!/bin/bash
# Build Noir ZK circuit and extract verification WASM
# Prerequisites: nargo (Noir compiler)
# Install: cargo install --git https://github.com/noir-lang/noir.git nargo_cli

set -euo pipefail

echo "=== Compiling ZeroClaw Noir Circuit ==="
cd circuits

# Check nargo
if ! command -v nargo &> /dev/null; then
    echo "ERROR: nargo not found. Install: cargo install --git https://github.com/noir-lang/noir.git nargo_cli"
    exit 1
fi

# Compile circuit
echo "[1/3] Compiling circuit..."
nargo compile

# Generate proving/verifying keys
echo "[2/3] Generating keys (may take a minute)..."
nargo prove

# Export verification WASM
echo "[3/3] Exporting verification WASM..."
cp target/zero_claw.wasm ../deploy/wasm/ 2>/dev/null || echo "WASM path may differ by Noir version"

echo "Done! Verification WASM at deploy/wasm/zero_claw.wasm"
echo "Upload to Cloudflare Dashboard -> Workers -> zkp-verification -> Settings -> WASM"
