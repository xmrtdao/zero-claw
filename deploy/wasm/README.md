# WASM Modules for Cloudflare Workers

## zkp-verification.wasm (Noir Circuit)

Source: `circuits/main.nr`
Build: `bash scripts/build-circuit.sh`
Upload: Cloudflare Dashboard → Workers → zkp-verification → Settings → WASM → `zero_claw.wasm`

## monero_wasm.wasm (Monero Operations)

Source: github.com/monero-ecosystem/monero-javascript
Build: `bash scripts/build-monero-wasm.sh`
Upload: Cloudflare Dashboard → Workers → wasm-edge-compute → Settings → WASM → `monero_wasm.wasm`
