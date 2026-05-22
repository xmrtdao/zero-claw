#!/bin/bash
# Build Monero WASM for wasm-edge-compute worker
# Prerequisites: wasm-pack, rust

set -euo pipefail

echo "=== Building Monero WASM ==="
MONERO_JS_REPO="https://github.com/monero-ecosystem/monero-javascript"

if [ ! -d "monero-javascript" ]; then
    echo "[1/4] Cloning monero-javascript..."
    git clone $MONERO_JS_REPO
fi

cd monero-javascript
echo "[2/4] Installing dependencies..."
npm install

echo "[3/4] Building WASM..."
npx wasm-pack build --target web

echo "[4/4] Copying WASM..."
cp pkg/monero_wasm.wasm ../deploy/wasm/

echo "Done! WASM at deploy/wasm/monero_wasm.wasm"
echo "Upload to Cloudflare Dashboard -> Workers -> wasm-edge-compute -> Settings -> WASM"
